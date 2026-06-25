'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { enviarTexto, enviarImagem, enviarAudio, enviarDocumento } from '@/lib/evolution'
import { validarTelefone } from '@/lib/utils'
import { criarDealParaLead } from '@/lib/pipeline-lead'
import { telefonesIguais } from '@/lib/telefone'

// ── Helper: validar/fallback de instância WhatsApp ──────────────

async function getValidInstance(
  supabase: Awaited<ReturnType<typeof createClient>>,
  instanceId: string | null,
  organizationId: string
): Promise<{ id: string; name: string }> {
  // Tentar a instância atual da conversa primeiro
  if (instanceId) {
    const { data: inst } = await supabase
      .from('whatsapp_instances')
      .select('id, evolution_instance_name, status_conexao')
      .eq('id', instanceId)
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (inst?.status_conexao === 'conectado' && inst.evolution_instance_name) {
      return { id: inst.id as string, name: inst.evolution_instance_name }
    }
  }

  // Fallback: qualquer instância conectada da organização
  const { data: fallback } = await supabase
    .from('whatsapp_instances')
    .select('id, evolution_instance_name')
    .eq('organization_id', organizationId)
    .eq('status_conexao', 'conectado')
    .limit(1)
    .maybeSingle()

  if (fallback?.evolution_instance_name) {
    return { id: fallback.id as string, name: fallback.evolution_instance_name }
  }

  throw new Error('Nenhuma instância de WhatsApp conectada disponível para envio.')
}

// ── Enviar mensagem de texto ─────────────────────────────────────

export async function enviarMensagem(conversaId: string, texto: string) {
  if (!texto.trim()) throw new Error('Mensagem não pode estar vazia.')
  if (texto.length > 4096) throw new Error('Mensagem muito longa (máximo 4096 caracteres).')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const { data: conversa } = await supabase
    .from('conversations')
    .select('id, telefone_externo, whatsapp_instance_id')
    .eq('id', conversaId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!conversa) throw new Error('Conversa não encontrada.')

  // Validar instância com fallback automático
  const instancia = await getValidInstance(supabase, conversa.whatsapp_instance_id, perfil.organization_id)

  // Atualizar conversa se a instância mudou (fallback)
  if (conversa.whatsapp_instance_id !== instancia.id) {
    await supabase
      .from('conversations')
      .update({ whatsapp_instance_id: instancia.id, atualizado_em: new Date().toISOString() })
      .eq('id', conversaId)
      .eq('organization_id', perfil.organization_id)
  }

  const messageIdExterno = await enviarTexto(instancia.name, conversa.telefone_externo, texto.trim())

  const agora = new Date().toISOString()

  await supabase.from('messages').insert({
    organization_id: perfil.organization_id,
    conversation_id: conversaId,
    message_id_externo: messageIdExterno,
    direcao: 'enviada',
    tipo_midia: 'texto',
    conteudo: texto.trim(),
    responsavel_id: perfil.id,
    status: 'enviada',
    enviado_em: agora,
  })

  // Buscar status atual para transição automática
  const { data: conversaAtual } = await supabase
    .from('conversations')
    .select('status')
    .eq('id', conversaId)
    .eq('organization_id', perfil.organization_id)
    .single()

  const updateData: Record<string, unknown> = { ultima_mensagem_em: agora, atualizado_em: agora }
  if (conversaAtual?.status === 'nao_atendida') {
    updateData.status = 'em_atendimento'
    updateData.responsavel_id = perfil.id
  }

  await supabase
    .from('conversations')
    .update(updateData)
    .eq('id', conversaId)
    .eq('organization_id', perfil.organization_id)

  await supabase.from('audit_logs').insert({
    organization_id: perfil.organization_id,
    usuario_id: perfil.id,
    acao: 'mensagem_enviada',
    tabela_afetada: 'messages',
    registro_id: conversaId,
    dados_novos: { telefone: conversa.telefone_externo, tipo: 'texto' },
  })

  revalidatePath('/whatsapp')
}

// ── Iniciar nova conversa ──────────────────────────────────────

type IniciarConversaParams = {
  telefone: string
  instanciaId: string
  texto: string
  leadId?: string | null
  contatoId?: string | null
}

export async function iniciarConversa(params: IniciarConversaParams): Promise<string> {
  const { telefone, instanciaId, texto, leadId, contatoId } = params

  if (!texto.trim()) throw new Error('Mensagem não pode estar vazia.')
  if (texto.length > 4096) throw new Error('Mensagem muito longa (máximo 4096 caracteres).')

  // Validar telefone
  const { valido, formatado } = validarTelefone(telefone)
  if (!valido) throw new Error('Telefone inválido. Informe DDD + número (ex: 11999999999).')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  // Verificar acesso à instância
  const { data: instancia } = await supabase
    .from('whatsapp_instances')
    .select('id, evolution_instance_name, status_conexao, vendedor_id, compartilhado')
    .eq('id', instanciaId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!instancia) throw new Error('Instância de WhatsApp não encontrada.')

  // Apenas alerta se estiver desconectado, mas não bloqueia
  if (instancia.status_conexao !== 'conectado') {
    console.warn(`Instância ${instancia.evolution_instance_name} está desconectada. A conversa será criada mas a mensagem não será enviada até a reconexão.`)
  }

  // Vendedor só pode usar instâncias atribuídas ou compartilhadas
  if (perfil.cargo === 'vendedor' || perfil.cargo === 'atendimento') {
    if (!instancia.compartilhado && instancia.vendedor_id !== perfil.id) {
      throw new Error('Você não tem permissão para usar esta instância.')
    }
  }

  // Buscar conversa existente pelo telefone na org (independente da instância)
  const { data: conversaExistente } = await supabase
    .from('conversations')
    .select('id, whatsapp_instance_id')
    .eq('organization_id', perfil.organization_id)
    .eq('telefone_externo', formatado)
    .order('ultima_mensagem_em', { ascending: false })
    .limit(1)
    .maybeSingle()

  let conversaId: string

  // Garantir que existe um lead vinculado
  let leadIdFinal = leadId || null

  if (!leadIdFinal) {
    // Buscar lead existente pelo telefone
    const { data: leadExistente } = await supabase
      .from('leads')
      .select('id')
      .eq('organization_id', perfil.organization_id)
      .eq('telefone', formatado)
      .limit(1)
      .maybeSingle()

    if (leadExistente) {
      leadIdFinal = leadExistente.id
    } else {
      // Criar lead — buscar nome do contato cadastrado
      let nomeLead = 'Contato WhatsApp'
      if (contatoId) {
        const { data: contato } = await supabase
          .from('contacts')
          .select('nome')
          .eq('id', contatoId)
          .eq('organization_id', perfil.organization_id)
          .single()
        if (contato?.nome) nomeLead = contato.nome
      } else {
        // Buscar por telefone na tabela contacts (comparação normalizada)
        const { data: todosContatos } = await supabase
          .from('contacts')
          .select('nome, telefone')
          .eq('organization_id', perfil.organization_id)
          .not('telefone', 'is', null)

        const contatoPorTel = (todosContatos ?? []).find((c) => c.telefone && telefonesIguais(formatado, c.telefone))
        if (contatoPorTel?.nome) nomeLead = contatoPorTel.nome
      }

      const { data: novoLead } = await supabase
        .from('leads')
        .insert({
          organization_id: perfil.organization_id,
          nome: nomeLead,
          telefone: formatado,
          origem: 'whatsapp',
          status: 'novo',
        })
        .select('id')
        .single()

      leadIdFinal = novoLead?.id ?? null
    }
  }

  if (conversaExistente) {
    conversaId = conversaExistente.id
    // Atualizar instância se mudou
    if (conversaExistente.whatsapp_instance_id !== instanciaId) {
      await supabase
        .from('conversations')
        .update({ whatsapp_instance_id: instanciaId, atualizado_em: new Date().toISOString() })
        .eq('id', conversaId)
        .eq('organization_id', perfil.organization_id)
    }
    // Vincular lead se conversa não tem
    if (leadIdFinal) {
      await supabase
        .from('conversations')
        .update({ lead_id: leadIdFinal, atualizado_em: new Date().toISOString() })
        .eq('id', conversaId)
        .eq('organization_id', perfil.organization_id)
        .is('lead_id', null)
    }
  } else {
    // Criar nova conversa
    const { data: novaConversa, error: errConversa } = await supabase
      .from('conversations')
      .insert({
        organization_id: perfil.organization_id,
        whatsapp_instance_id: instanciaId,
        telefone_externo: formatado,
        lead_id: leadIdFinal,
        contato_id: contatoId || null,
        status: 'em_atendimento',
        responsavel_id: perfil.id,
        ultima_mensagem_em: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (errConversa || !novaConversa) throw new Error('Erro ao criar conversa.')
    conversaId = novaConversa.id
  }

  // Enviar mensagem via Evolution API (se estiver conectado)
  let messageIdExterno: string | null = null
  if (instancia.status_conexao === 'conectado' && instancia.evolution_instance_name) {
    try {
      messageIdExterno = await enviarTexto(instancia.evolution_instance_name, formatado, texto.trim())
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido'
      console.error('Erro ao enviar mensagem via Evolution:', errorMsg)

      // Notificar usuário sobre erro específico
      if (errorMsg.includes('401') || errorMsg.includes('unauthorized')) {
        throw new Error('Sessão do WhatsApp expirada. Por favor, gere um novo QR code na tela de instâncias.')
      } else if (errorMsg.includes('does not exist')) {
        throw new Error('Número não possui WhatsApp ou está incorreto.')
      }
      // Para outros erros, não falhar toda a operação
    }
  } else if (instancia.status_conexao !== 'conectado') {
    console.warn(`Instância ${instancia.evolution_instance_name} está desconectada. Mensagem não será enviada via WhatsApp.`)
  }

  const agora = new Date().toISOString()

  // Salvar mensagem no histórico
  await supabase.from('messages').insert({
    organization_id: perfil.organization_id,
    conversation_id: conversaId,
    message_id_externo: messageIdExterno,
    direcao: 'enviada',
    tipo_midia: 'texto',
    conteudo: texto.trim(),
    responsavel_id: perfil.id,
    status: messageIdExterno ? 'enviada' : 'pendente',
    enviado_em: agora,
  })

  // Atualizar conversa
  const updateData: Record<string, unknown> = {
    ultima_mensagem_em: agora,
    status: 'em_atendimento',
    responsavel_id: perfil.id,
    atualizado_em: agora,
  }

  // Se a mensagem não foi enviada, marcar como aguardando envio e adicionar nota
  if (!messageIdExterno) {
    updateData.status = 'aguardando_resposta'

    // Adicionar nota sobre a mensagem pendente
    await supabase.from('conversation_notes').insert({
      organization_id: perfil.organization_id,
      conversation_id: conversaId,
      autor_id: perfil.id,
      conteudo: `Mensagem salva mas não enviada (WhatsApp offline em ${new Date().toLocaleString()})`,
    })
  }

  await supabase
    .from('conversations')
    .update(updateData)
    .eq('id', conversaId)
    .eq('organization_id', perfil.organization_id)

  // Atualizar última interação do lead - apenas para prospecção
  // Prospecção não deve gerar novas interações
  if (leadIdFinal) {
    // Não atualizar última interação do lead para prospecção

    // Criar deal no pipeline se não existir
    const { data: dealExistente } = await supabase
      .from('deals')
      .select('id')
      .eq('lead_id', leadIdFinal)
      .is('ganho', null)
      .limit(1)
      .maybeSingle()

    if (!dealExistente) {
      const { data: leadData } = await supabase
        .from('leads')
        .select('nome, telefone, origem')
        .eq('id', leadIdFinal)
        .single()

      if (leadData) {
        await criarDealParaLead(supabase, {
          organization_id: perfil.organization_id,
          lead_id: leadIdFinal,
          lead_nome: leadData.nome,
          lead_telefone: leadData.telefone,
          responsavel_id: perfil.id,
          origem: leadData.origem ?? 'whatsapp',
          autor_id: perfil.id,
        })
      }
    }
  }

  // Registrar audit log
  await supabase.from('audit_logs').insert({
    organization_id: perfil.organization_id,
    usuario_id: perfil.id,
    acao: 'conversa_iniciada',
    tabela_afetada: 'conversations',
    registro_id: conversaId,
    dados_novos: { telefone: formatado, instancia_id: instanciaId, lead_id: leadId, contato_id: contatoId },
  })

  revalidatePath('/whatsapp')
  revalidatePath('/leads')
  revalidatePath('/pipeline')

  return conversaId
}

// ── Buscar instâncias autorizadas ──────────────────────────────

export async function buscarInstanciasAutorizadas() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  let query = supabase
    .from('whatsapp_instances')
    .select('id, nome, numero, status_conexao')
    .eq('organization_id', perfil.organization_id)
    .eq('status_conexao', 'conectado')

  if (perfil.cargo === 'vendedor' || perfil.cargo === 'atendimento') {
    query = query.or(`vendedor_id.eq.${perfil.id},compartilhado.eq.true`)
  }

  const { data } = await query
  return (data ?? []) as { id: string; nome: string; numero: string | null; status_conexao: string }[]
}

// ── Buscar leads/contatos para nova conversa ───────────────────

export async function buscarContatosParaConversa(busca: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const termo = `%${busca.trim()}%`

  // Buscar leads
  const { data: leads } = await supabase
    .from('leads')
    .select('id, nome, telefone, empresa')
    .eq('organization_id', perfil.organization_id)
    .or(`nome.ilike.${termo},telefone.ilike.${termo},empresa.ilike.${termo}`)
    .limit(10)

  // Buscar contatos
  const { data: contatos } = await supabase
    .from('contacts')
    .select('id, nome, telefone, email')
    .eq('organization_id', perfil.organization_id)
    .or(`nome.ilike.${termo},telefone.ilike.${termo},email.ilike.${termo}`)
    .limit(10)

  return {
    leads: (leads ?? []).map((l) => ({ id: l.id, nome: l.nome, telefone: l.telefone, tipo: 'lead' as const })),
    contatos: (contatos ?? []).map((c) => ({ id: c.id, nome: c.nome, telefone: c.telefone, tipo: 'contato' as const })),
  }
}

// ── Enviar mídia (imagem, áudio, documento/PDF) ──────────────────

export async function enviarMidia(conversaId: string, formData: FormData) {
  const file = formData.get('file') as File
  if (!file || file.size === 0) throw new Error('Nenhum arquivo selecionado.')
  if (file.size > 16 * 1024 * 1024) throw new Error('Arquivo muito grande (máximo 16MB).')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const { data: conversa } = await supabase
    .from('conversations')
    .select('id, telefone_externo, whatsapp_instance_id')
    .eq('id', conversaId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!conversa) throw new Error('Conversa não encontrada.')

  // Validar instância com fallback automático
  const instancia = await getValidInstance(supabase, conversa.whatsapp_instance_id, perfil.organization_id)

  // Atualizar conversa se a instância mudou (fallback)
  if (conversa.whatsapp_instance_id !== instancia.id) {
    await supabase
      .from('conversations')
      .update({ whatsapp_instance_id: instancia.id, atualizado_em: new Date().toISOString() })
      .eq('id', conversaId)
      .eq('organization_id', perfil.organization_id)
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString('base64')
  const mimeType = file.type || 'application/octet-stream'

  let tipoMidia: 'imagem' | 'audio' | 'documento'
  let messageIdExterno: string

  if (mimeType.startsWith('image/')) {
    tipoMidia = 'imagem'
    const caption = (formData.get('caption') as string)?.trim() || ''
    messageIdExterno = await enviarImagem(instancia.name, conversa.telefone_externo, base64, mimeType, caption)
  } else if (mimeType.startsWith('audio/')) {
    tipoMidia = 'audio'
    messageIdExterno = await enviarAudio(instancia.name, conversa.telefone_externo, base64, mimeType)
  } else {
    tipoMidia = 'documento'
    messageIdExterno = await enviarDocumento(instancia.name, conversa.telefone_externo, base64, mimeType, file.name)
  }

  // Upload para Storage
  const ext = file.name.split('.').pop() || 'bin'
  const path = `${perfil.organization_id}/${conversaId}/${messageIdExterno}.${ext}`
  const adminClient = createAdminClient()

  const { error: uploadErr } = await adminClient.storage
    .from('whatsapp-media')
    .upload(path, buffer, { contentType: mimeType, upsert: false })

  let urlMidia: string | null = null
  if (!uploadErr) {
    const { data: urlData } = adminClient.storage
      .from('whatsapp-media')
      .getPublicUrl(path)
    urlMidia = urlData.publicUrl
  }

  const agora = new Date().toISOString()

  await supabase.from('messages').insert({
    organization_id: perfil.organization_id,
    conversation_id: conversaId,
    message_id_externo: messageIdExterno,
    direcao: 'enviada',
    tipo_midia: tipoMidia,
    conteudo: tipoMidia === 'imagem'
      ? ((formData.get('caption') as string)?.trim() || '[Imagem]')
      : tipoMidia === 'audio'
        ? '[Áudio]'
        : `[${file.name}]`,
    url_midia: urlMidia,
    responsavel_id: perfil.id,
    status: 'enviada',
    enviado_em: agora,
  })

  const { data: conversaAtual } = await supabase
    .from('conversations')
    .select('status')
    .eq('id', conversaId)
    .eq('organization_id', perfil.organization_id)
    .single()

  const updateData: Record<string, unknown> = { ultima_mensagem_em: agora, atualizado_em: agora }
  if (conversaAtual?.status === 'nao_atendida') {
    updateData.status = 'em_atendimento'
    updateData.responsavel_id = perfil.id
  }

  await supabase
    .from('conversations')
    .update(updateData)
    .eq('id', conversaId)
    .eq('organization_id', perfil.organization_id)

  revalidatePath('/whatsapp')
}