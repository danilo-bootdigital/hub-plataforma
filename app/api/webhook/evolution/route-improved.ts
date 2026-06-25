import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { distribuirLead } from '@/lib/distribuicao'
import { criarDealParaLead } from '@/lib/pipeline-lead'
import { baixarMidia } from '@/lib/evolution'
import { createHmac } from 'crypto'

// Cache de contatos em memória
const contatoCache = new Map<string, { id: string; nome: string; timestamp: number }>()
const CACHE_DURATION = 300000 // 5 minutos

function normalizarTelefone(jid: string): string {
  return jid.replace(/@.*$/, '').replace(/:\d+$/, '')
}

// Busca contato por telefone com cache
async function buscarContatoPorTelefone(
  supabase: ReturnType<typeof createAdminClient>,
  organizationId: string,
  telefone: string
): Promise<{ id: string; nome: string } | null> {
  const cacheKey = `${organizationId}:${telefone}`
  const cached = contatoCache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { id: cached.id, nome: cached.nome }
  }

  const digits = telefone.replace(/\D/g, '')
  const semPais = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits

  // Buscar com variações: com e sem nono dígito
  const variacoes = [semPais]
  if (semPais.length === 11) {
    variacoes.push(semPais.slice(0, 2) + semPais.slice(3))
  } else if (semPais.length === 10) {
    variacoes.push(semPais.slice(0, 2) + '9' + semPais.slice(2))
  }

  const { data } = await supabase
    .from('contacts')
    .select('id, nome')
    .eq('organization_id', organizationId)
    .or(variacoes.map(v => `telefone.ilike.%${v}%`).join(','))
    .limit(1)
    .single()

  if (data?.nome) {
    contatoCache.set(cacheKey, { id: data.id, nome: data.nome, timestamp: Date.now() })
    return { id: data.id, nome: data.nome }
  }
  return null
}

// Verificar HMAC signature
function verifyHmacSignature(req: NextRequest, secret: string, body: string): boolean {
  const signature = req.headers.get('x-webhook-signature')
  if (!signature) return false

  const hmac = createHmac('sha256', secret)
  hmac.update(body)
  const expectedSignature = hmac.digest('hex')

  return signature === `sha256=${expectedSignature}`
}

// Obter configuração da organização
async function obterConfiguracao(supabase: ReturnType<typeof createAdminClient>, organizationId: string) {
  const { data: config } = await supabase
    .from('whatsapp_config')
    .select('*')
    .eq('organization_id', organizationId)
    .single()

  return config || {
    max_tamanho_mensagem: 4096,
    tempo_retencao_midia: 30,
    max_tentativas_envio: 3,
    palavras_urgentes: ['urgente', 'emergência', 'problema', 'falha', 'erro'],
    habilitar_cache_contatos: true,
    tempo_cache_contatos: 300,
    rate_limit_por_minuto: 60,
    webhook_timeout: 15,
    habilitar_monitoramento: true,
  }
}

// Classificar urgência da mensagem
function classificarUrgencia(conteudo: string, palavrasUrgentes: string[]): 'alta' | 'normal' {
  const palavras = conteudo.toLowerCase()
  return palavrasUrgentes.some(palavra => palavras.includes(palavra)) ? 'alta' : 'normal'
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  // Verificar HMAC signature
  const body = await req.text()
  if (!verifyHmacSignature(req, webhookSecret, body)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let parsedBody: Record<string, unknown>
  try {
    parsedBody = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { event, instance: instanceName, data } = parsedBody as {
    event: string
    instance: string
    data: Record<string, unknown>
  }

  const supabase = createAdminClient()

  const { data: instancia } = await supabase
    .from('whatsapp_instances')
    .select('id, organization_id, vendedor_id')
    .eq('evolution_instance_name', instanceName)
    .single()

  if (!instancia) return NextResponse.json({ ok: true })

  // Obter configuração
  const config = await obterConfiguracao(supabase, instancia.organization_id)

  // ── connection.update ──────────────────────────────────────────
  if (event === 'connection.update') {
    const state = (data?.state as string) ?? 'close'
    const statusMap: Record<string, string> = {
      open: 'conectado',
      connecting: 'aguardando_qr',
      close: 'desconectado',
    }
    await supabase
      .from('whatsapp_instances')
      .update({ status_conexao: statusMap[state] ?? 'desconectado', atualizado_em: new Date().toISOString() })
      .eq('id', instancia.id)
      .eq('organization_id', instancia.organization_id)
    return NextResponse.json({ ok: true })
  }

  // ── messages.upsert ───────────────────────────────────────────
  if (event === 'messages.upsert') {
    const key = (data?.key ?? {}) as Record<string, unknown>
    const remoteJid = (key.remoteJid as string) ?? ''
    const fromMe = (key.fromMe as boolean) ?? false
    const messageIdExterno = (key.id as string) ?? ''
    const pushName = (data?.pushName as string) ?? ''
    const messageTimestamp = (data?.messageTimestamp as number) ?? Math.floor(Date.now() / 1000)
    const messageType = (data?.messageType as string) ?? 'conversation'
    const message = (data?.message ?? {}) as Record<string, unknown>

    // Ignorar mensagens de protocolo/sistema
    const tiposIgnorados = ['protocolMessage', 'reactionMessage', 'ephemeralMessage', 'senderKeyDistributionMessage']
    if (tiposIgnorados.includes(messageType)) return NextResponse.json({ ok: true })

    const conteudo =
      (message?.conversation as string) ??
      ((message?.extendedTextMessage as Record<string, unknown>)?.text as string) ??
      (messageType === 'imageMessage' ? '[Imagem]' : null) ??
      (messageType === 'audioMessage' ? '[Áudio]' : null) ??
      (messageType === 'videoMessage' ? '[Vídeo]' : null) ??
      (messageType === 'documentMessage' ? '[Documento]' : null) ??
      (messageType === 'stickerMessage' ? '[Sticker]' : null) ??
      (messageType === 'locationMessage' ? '[Localização]' : null) ??
      (messageType === 'contactMessage' ? '[Contato]' : null) ??
      (messageType === 'contactsArrayMessage' ? '[Contatos]' : null) ??
      null

    // Ignorar grupos
    if (remoteJid.endsWith('@g.us')) return NextResponse.json({ ok: true })

    // Validar tamanho da mensagem
    if (conteudo && conteudo.length > config.max_tamanho_mensagem) {
      console.warn(`Mensagem excede tamanho máximo: ${conteudo.length} > ${config.max_tamanho_mensagem}`)
      return NextResponse.json({ ok: true })
    }

    // Ignorar mensagens sem conteúdo
    if (!conteudo && !['imageMessage', 'audioMessage', 'videoMessage', 'documentMessage', 'stickerMessage'].includes(messageType)) {
      return NextResponse.json({ ok: true })
    }

    const telefone = normalizarTelefone(remoteJid)
    const enviadoEm = new Date(messageTimestamp * 1000).toISOString()

    // Checar deduplicação
    if (messageIdExterno) {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('message_id_externo', messageIdExterno)
        .eq('organization_id', instancia.organization_id)
      if ((count ?? 0) > 0) return NextResponse.json({ ok: true })
    }

    // Buscar ou criar conversa
    const conversaQuery = supabase
      .from('conversations')
      .select('id, lead_id, status, responsavel_id, whatsapp_instance_id')
      .eq('organization_id', instancia.organization_id)
      .eq('telefone_externo', telefone)
      .order('ultima_mensagem_em', { ascending: false })
      .limit(1)
      .single()

    const { data: conversa, error: errConversa } = await conversaQuery

    if (errConversa && errConversa.code !== 'PGRST116') {
      console.error('[webhook] Erro ao buscar conversa:', errConversa.message)
      return NextResponse.json({ error: 'Internal' }, { status: 500 })
    }

    let conversaAtual = conversa

    // Se a conversa existe mas está vinculada a outra instância, atualizar
    if (conversaAtual && conversaAtual.whatsapp_instance_id !== instancia.id) {
      await supabase
        .from('conversations')
        .update({ whatsapp_instance_id: instancia.id, atualizado_em: new Date().toISOString() })
        .eq('id', conversaAtual.id)
    }

    let leadId: string | null = (conversaAtual?.lead_id as string) ?? null

    if (!conversaAtual) {
      if (fromMe) {
        // Mensagem enviada pelo vendedor
        const { data: novaConversa, error: errNovaConversa } = await supabase
          .from('conversations')
          .insert({
            organization_id: instancia.organization_id,
            whatsapp_instance_id: instancia.id,
            telefone_externo: telefone,
            ultima_mensagem_em: enviadoEm,
            status: 'aguardando_resposta',
            responsavel_id: instancia.vendedor_id ?? null,
          })
          .select('id, lead_id, status, responsavel_id, whatsapp_instance_id')
          .single()

        if (errNovaConversa) {
          const { data: conversaExistente } = await supabase
            .from('conversations')
            .select('id, lead_id, status, responsavel_id, whatsapp_instance_id')
            .eq('organization_id', instancia.organization_id)
            .eq('telefone_externo', telefone)
            .order('ultima_mensagem_em', { ascending: false })
            .limit(1)
            .single()
          if (!conversaExistente) {
            console.error('[webhook] Erro ao criar conversa de prospecção:', errNovaConversa.message)
            return NextResponse.json({ error: 'Internal' }, { status: 500 })
          }
          conversaAtual = conversaExistente
        } else {
          conversaAtual = novaConversa
        }
      } else {
        // Mensagem recebida do cliente
        const { data: leadExistente } = await supabase
          .from('leads')
          .select('id')
          .eq('organization_id', instancia.organization_id)
          .eq('telefone', telefone)
          .limit(1)
          .single()

        leadId = (leadExistente?.id as string) ?? null
        const contatoExistente = await buscarContatoPorTelefone(supabase, instancia.organization_id, telefone)

        if (!leadId) {
          const nomeLead = contatoExistente?.nome?.trim() || pushName?.trim() || 'Contato WhatsApp'
          const { data: novoLead, error: errLead } = await supabase
            .from('leads')
            .insert({
              organization_id: instancia.organization_id,
              nome: nomeLead,
              telefone,
              origem: 'whatsapp',
              status: 'novo',
              whatsapp_instance_id: instancia.id,
            })
            .select('id')
            .single()

          if (errLead && (errLead.message.includes('duplicate') || errLead.code?.includes('23505'))) {
            const { data: leadExistente2 } = await supabase
              .from('leads')
              .select('id')
              .eq('organization_id', instancia.organization_id)
              .eq('telefone', telefone)
              .limit(1)
              .single()
            leadId = (leadExistente2?.id as string) ?? null
          } else {
            leadId = (novoLead?.id as string) ?? null
          }

          if (leadId) {
            const { data: adminPerfil } = await supabase
              .from('profiles')
              .select('id')
              .eq('organization_id', instancia.organization_id)
              .eq('cargo', 'admin')
              .eq('ativo', true)
              .limit(1)
              .single()

            if (adminPerfil) {
              await supabase.from('activities').insert({
                organization_id: instancia.organization_id,
                tipo: 'lead_criado',
                descricao: `Lead criado por resposta via WhatsApp: ${telefone}${pushName ? ` (${pushName})` : ''}.`,
                lead_id: leadId,
                autor_id: adminPerfil.id,
              })
              await distribuirLead(supabase, leadId, instancia.organization_id, adminPerfil.id)

              const { data: leadAtualizado } = await supabase
                .from('leads')
                .select('responsavel_id')
                .eq('id', leadId)
                .single()

              await criarDealParaLead(supabase, {
                organization_id: instancia.organization_id,
                lead_id: leadId,
                lead_nome: nomeLead,
                lead_telefone: telefone,
                responsavel_id: leadAtualizado?.responsavel_id ?? instancia.vendedor_id ?? null,
                origem: 'whatsapp',
                autor_id: adminPerfil.id,
              })
            }
          }
        }

        // Criar conversa para mensagem recebida
        const { data: novaConversa, error: errNovaConversa } = await supabase
          .from('conversations')
          .insert({
            organization_id: instancia.organization_id,
            whatsapp_instance_id: instancia.id,
            lead_id: leadId,
            telefone_externo: telefone,
            ultima_mensagem_em: enviadoEm,
            status: 'nao_atendida',
            responsavel_id: instancia.vendedor_id ?? null,
          })
          .select('id, lead_id, status, responsavel_id, whatsapp_instance_id')
          .single()

        if (errNovaConversa) {
          const { data: conversaExistente } = await supabase
            .from('conversations')
            .select('id, lead_id, status, responsavel_id, whatsapp_instance_id')
            .eq('organization_id', instancia.organization_id)
            .eq('telefone_externo', telefone)
            .order('ultima_mensagem_em', { ascending: false })
            .limit(1)
            .single()

          if (!conversaExistente) {
            console.error('[webhook] Erro ao criar conversa:', errNovaConversa.message)
            return NextResponse.json({ error: 'Internal' }, { status: 500 })
          }
          conversaAtual = conversaExistente
        } else {
          conversaAtual = novaConversa
        }
      }
    } else {
      // Atualizar conversa existente
      const updateData: Record<string, unknown> = {
        ultima_mensagem_em: enviadoEm,
        atualizado_em: new Date().toISOString(),
      }

      // Armazenar pushName mais recente
      if (pushName && pushName.trim()) {
        updateData.whatsapp_push_name = pushName.trim()
      }

      // Se conversa existe mas não tem lead vinculado, tentar vincular
      if (!leadId) {
        const { data: leadExistente } = await supabase
          .from('leads')
          .select('id')
          .eq('organization_id', instancia.organization_id)
          .eq('telefone', telefone)
          .limit(1)
          .single()

        if (leadExistente) {
          leadId = leadExistente.id
          updateData.lead_id = leadId
        } else {
          // Criar lead para conversa órfã
          const contatoCadastrado = await buscarContatoPorTelefone(supabase, instancia.organization_id, telefone)

          const nomeLead = contatoCadastrado?.nome?.trim() || pushName?.trim() || 'Contato WhatsApp'
          const { data: novoLead } = await supabase
            .from('leads')
            .insert({
              organization_id: instancia.organization_id,
              nome: nomeLead,
              telefone,
              origem: 'whatsapp',
              status: 'novo',
              whatsapp_instance_id: instancia.id,
            })
            .select('id')
            .single()
          if (novoLead) {
            leadId = novoLead.id
            updateData.lead_id = leadId
          }
        }
      }

      // Atualizar nome do lead se tem nome genérico E NÃO foi editado manualmente
      if (!fromMe && leadId) {
        const { data: leadAtual } = await supabase
          .from('leads')
          .select('nome')
          .eq('id', leadId)
          .single()

        if (leadAtual) {
          const nomeAtual = leadAtual.nome?.trim() ?? ''
          const ehGenerico = !nomeAtual
            || nomeAtual === 'Contato WhatsApp'
            || /^\d{8,15}$/.test(nomeAtual.replace(/\D/g, ''))

          // Verificar se o nome da conversa não foi editado manualmente
          const { data: conversaInfo } = await supabase
            .from('conversations')
            .select('is_name_manually_edited')
            .eq('id', conversaAtual?.id)
            .single()

          if (ehGenerico && (!conversaInfo?.is_name_manually_edited)) {
            // Prioridade: contato cadastrado > pushName
            const contatoNome = await buscarContatoPorTelefone(supabase, instancia.organization_id, telefone)

            const novoNome = contatoNome?.nome?.trim() || pushName?.trim()
            if (novoNome) {
              // Atualizar lead
              await supabase
                .from('leads')
                .update({ nome: novoNome, atualizado_em: new Date().toISOString() })
                .eq('id', leadId)

              // Atualizar cache da conversa (se não foi editado manualmente)
              if (!conversaInfo?.is_name_manually_edited) {
                updateData.nome_contato = novoNome
                updateData.name_source = contatoNome ? 'contact' : 'pushname'
              }
            }
          }
        }
      }

      // Se a conversa não tem nome editado manualmente, atualizar cache
      if (!(conversaAtual as any)?.is_name_manually_edited) {
        // Verificar se precisa atualizar o nome cacheado
        const { data: conversaCache } = await supabase
          .from('conversations')
          .select('nome_contato, name_source')
          .eq('id', conversaAtual?.id)
          .single()

        const nomeCacheado = conversaCache?.nome_contato || ''
        const fonteCacheada = conversaCache?.name_source || ''

        // Se não tem nome cacheado ou a fonte é inferior, atualizar
        if (!nomeCacheado || (fonteCacheada && ['phone', 'unknown'].includes(fonteCacheada))) {
          const contatoNome = await buscarContatoPorTelefone(supabase, instancia.organization_id, telefone)
          let nomeExibicao = nomeCacheado
          let novaFonte = fonteCacheada

          if (contatoNome?.nome?.trim()) {
            nomeExibicao = contatoNome.nome.trim()
            novaFonte = 'contact'
          } else if (pushName?.trim() && (!nomeCacheado || fonteCacheada === 'phone' || fonteCacheada === 'unknown')) {
            nomeExibicao = pushName.trim()
            novaFonte = 'pushname'
          }

          if (nomeExibicao !== nomeCacheado) {
            updateData.nome_contato = nomeExibicao
            updateData.name_source = novaFonte
          }
        }
      }

      if (!fromMe) {
        // Mensagem recebida: se estava finalizada, reabrir
        if (conversaAtual.status === 'finalizada') {
          updateData.status = 'nao_atendida'
        }

        // Sincronizar deal
        if (leadId) {
          const { data: dealAtivo } = await supabase
            .from('deals')
            .select('id, ganho, estagio_id')
            .eq('lead_id', leadId)
            .is('ganho', null)
            .single()

          if (dealAtivo) {
            await supabase
              .from('deals')
              .update({ atualizado_em: new Date().toISOString() })
              .eq('id', dealAtivo.id)
          } else if (conversaAtual.status === 'finalizada') {
            // Lead finalizado recebeu nova mensagem — reabrir deal
            const { data: adminPerfil } = await supabase
              .from('profiles')
              .select('id')
              .eq('organization_id', instancia.organization_id)
              .eq('cargo', 'admin')
              .eq('ativo', true)
              .limit(1)
              .single()

            if (adminPerfil) {
              // Buscar nome real do lead
              const { data: leadParaDeal } = await supabase
                .from('leads')
                .select('nome, telefone')
                .eq('id', leadId)
                .single()

              await criarDealParaLead(supabase, {
                organization_id: instancia.organization_id,
                lead_id: leadId,
                lead_nome: leadParaDeal?.nome || null,
                lead_telefone: leadParaDeal?.telefone || telefone,
                responsavel_id: instancia.vendedor_id ?? null,
                origem: 'whatsapp',
                autor_id: adminPerfil.id,
              })
            }
          }
        }
      } else {
        // Mensagem enviada pelo vendedor
        if (conversaAtual.status === 'nao_atendida') {
          updateData.status = 'em_atendimento'
        }
        // Atribuir responsável se não tem
        if (!conversaAtual.responsavel_id) {
          updateData.responsavel_id = instancia.vendedor_id ?? null
        }
      }

      await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', conversaAtual.id)
    }

    if (!conversaAtual) return NextResponse.json({ ok: true })

    const tipoMidiaMap: Record<string, string> = {
      conversation: 'texto',
      extendedTextMessage: 'texto',
      imageMessage: 'imagem',
      audioMessage: 'audio',
      documentMessage: 'documento',
      videoMessage: 'video',
      stickerMessage: 'sticker',
      locationMessage: 'localizacao',
    }

    const tipoMidia = tipoMidiaMap[messageType] ?? 'texto'
    let urlMidia: string | null = null

    if (['imagem', 'audio', 'documento', 'video'].includes(tipoMidia)) {
      try {
        const mediaPayload = {
          key: {
            id: messageIdExterno,
            remoteJid,
            fromMe,
          },
          message,
        }
        const resultado = await baixarMidia(instanceName, mediaPayload)
        if (resultado) {
          const ext = tipoMidia === 'imagem' ? 'jpg' : tipoMidia === 'audio' ? 'ogg' : tipoMidia === 'video' ? 'mp4' : 'pdf'
          const path = `${instancia.organization_id}/${conversaAtual.id}/${messageIdExterno || Date.now()}.${ext}`
          const buffer = Buffer.from(resultado.base64, 'base64')

          const { error: uploadErr } = await supabase.storage
            .from('whatsapp-media')
            .upload(path, buffer, { contentType: resultado.mimeType, upsert: false })

          if (!uploadErr) {
            const { data: urlData } = supabase.storage
              .from('whatsapp-media')
              .getPublicUrl(path)
            urlMidia = urlData.publicUrl
          } else {
            console.error('[webhook] Upload mídia falhou:', uploadErr.message)
          }
        }
      } catch (err) {
        console.error('[webhook] Erro ao processar mídia:', err)
      }
    }

    // Classificar urgência
    const urgencia = !fromMe && conteudo ? classificarUrgencia(conteudo, config.palavras_urgentes) : 'normal'

    const { error: errMsg } = await supabase.from('messages').insert({
      organization_id: instancia.organization_id,
      conversation_id: conversaAtual.id,
      message_id_externo: messageIdExterno || null,
      direcao: fromMe ? 'enviada' : 'recebida',
      tipo_midia: tipoMidia,
      conteudo,
      url_midia: urlMidia,
      telefone_remetente: fromMe ? null : telefone,
      telefone_destinatario: fromMe ? telefone : null,
      responsavel_id: instancia.vendedor_id ?? null,
      status: fromMe ? 'enviada' : 'entregue',
      enviado_em: enviadoEm,
      urgencia,
    })
    if (errMsg) {
      // Ignorar erro de duplicata
      if (!errMsg.message.includes('duplicate') && !errMsg.code?.includes('23505')) {
        console.error('[webhook] Falha ao inserir mensagem:', errMsg.message)
      }
    }
  }

  // ── messages.update (status de entrega) ───────────────────────
  if (event === 'messages.update') {
    const updates = Array.isArray(data) ? data : [data]
    for (const update of updates) {
      const key = (update as Record<string, unknown>)?.key as Record<string, unknown> | undefined
      const status = (update as Record<string, unknown>)?.status as number | undefined
      if (!key?.id || !status) continue

      const messageIdExterno = key.id as string

      // Status codes: 2=enviada, 3=entregue, 4=lida
      const statusMap: Record<number, { status: string; campo: string }> = {
        3: { status: 'entregue', campo: 'entregue_em' },
        4: { status: 'lida', campo: 'lida_em' },
      }

      const mapeado = statusMap[status]
      if (!mapeado) continue

      await supabase
        .from('messages')
        .update({
          status: mapeado.status,
          [mapeado.campo]: new Date().toISOString(),
        })
        .eq('message_id_externo', messageIdExterno)
        .eq('organization_id', instancia.organization_id)
    }
  }

  return NextResponse.json({ ok: true })
}