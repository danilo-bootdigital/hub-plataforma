'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { registrarEventoOrcamento } from '@/lib/orcamentos/eventos'

const BUCKET = 'orcamento-receitas'
const TAMANHO_MAX = 10 * 1024 * 1024 // 10MB
const TIPOS_PERMITIDOS = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp']

// Client com service role apenas para operações de Storage (bucket privado)
function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getUsuarioEOrg() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()
  if (!perfil) redirect('/login')
  return { supabase, perfil, user }
}

// Garante que o orçamento pertence à organização do usuário (evita acesso cruzado)
async function assertOrcamentoDaOrg(
  supabase: Awaited<ReturnType<typeof createClient>>,
  quoteId: string,
  organizationId: string
) {
  const { data } = await supabase
    .from('quotes')
    .select('id')
    .eq('id', quoteId)
    .eq('organization_id', organizationId)
    .single()
  if (!data) throw new Error('Orçamento não encontrado.')
}

export type ReceitaStatusFluxo =
  | 'rascunho'
  | 'modelo_gerado'
  | 'enviada'
  | 'recebida'
  | 'validada'
  | 'rejeitada'

export type ReceitaDoOrcamento = {
  id: string
  quote_id: string
  texto_modelo: string | null
  status_fluxo: ReceitaStatusFluxo
  arquivo_nome: string | null
  arquivo_tipo: string | null
  arquivo_tamanho: number | null
  enviado_em: string | null
  validada_em: string | null
  validacao_comentario: string | null
  criado_em: string
  atualizado_em: string
  arquivo_url: string | null // signed URL temporária (não persistida)
}

/**
 * Carregado SOMENTE quando a aba Receita é aberta.
 * Seleção de colunas específica (sem select('*')). Gera signed URL para o arquivo.
 */
export async function getReceitasDoOrcamento(quoteId: string): Promise<ReceitaDoOrcamento[]> {
  const { supabase, perfil } = await getUsuarioEOrg()

  const { data, error } = await supabase
    .from('quote_receitas')
    .select(
      'id, quote_id, texto_modelo, status_fluxo, arquivo_path, arquivo_nome, arquivo_tipo, arquivo_tamanho, enviado_em, validada_em, validacao_comentario, criado_em, atualizado_em'
    )
    .eq('quote_id', quoteId)
    .eq('organization_id', perfil.organization_id)
    .order('criado_em', { ascending: false })

  if (error) throw new Error(`Erro ao carregar receitas: ${error.message}`)

  const adminClient = createAdminClient()

  const receitas = await Promise.all(
    (data ?? []).map(async (r) => {
      let arquivo_url: string | null = null
      if (r.arquivo_path) {
        const { data: signed } = await adminClient.storage
          .from(BUCKET)
          .createSignedUrl(r.arquivo_path, 60 * 60) // 1h
        arquivo_url = signed?.signedUrl ?? null
      }
      const { arquivo_path, ...rest } = r
      return { ...rest, arquivo_url } as ReceitaDoOrcamento
    })
  )

  return receitas
}

/**
 * Gera o texto do modelo a partir dos itens do orçamento.
 * NÃO persiste — o usuário edita e depois salva o rascunho.
 */
export async function gerarModeloReceita(quoteId: string): Promise<{ texto: string }> {
  const { supabase, perfil } = await getUsuarioEOrg()

  const { data: quote } = await supabase
    .from('quotes')
    .select('numero, contato:contacts!contato_id(nome)')
    .eq('id', quoteId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!quote) throw new Error('Orçamento não encontrado.')

  const { data: itens } = await supabase
    .from('quote_items')
    .select('descricao, quantidade')
    .eq('quote_id', quoteId)

  const nomePaciente = (quote as any).contato?.nome ?? '_______________________________'
  const linhasItens = (itens ?? [])
    .map((i, idx) => `${idx + 1}) ${i.descricao} — Qtd: ${i.quantidade}`)
    .join('\n')

  const texto = [
    'RECEITUÁRIO',
    '',
    `Referente ao Orçamento #${quote.numero}`,
    `Paciente: ${nomePaciente}`,
    '',
    'Uso conforme orientação profissional:',
    linhasItens || '(sem itens no orçamento)',
    '',
    'Observações: _______________________________________________',
    '',
    'Data: ____/____/______',
    '',
    'Assinatura e carimbo do profissional: ______________________',
  ].join('\n')

  return { texto }
}

/**
 * Salva o rascunho da receita (cria ou atualiza).
 * geradoDoModelo=true marca status 'modelo_gerado'; caso contrário 'rascunho'.
 */
export async function salvarRascunhoReceita(params: {
  quoteId: string
  receitaId?: string
  texto: string
  geradoDoModelo?: boolean
}): Promise<{ id: string }> {
  const { supabase, perfil, user } = await getUsuarioEOrg()
  const { quoteId, receitaId, texto, geradoDoModelo } = params

  await assertOrcamentoDaOrg(supabase, quoteId, perfil.organization_id)

  const status: ReceitaStatusFluxo = geradoDoModelo ? 'modelo_gerado' : 'rascunho'

  if (receitaId) {
    const { data, error } = await supabase
      .from('quote_receitas')
      .update({ texto_modelo: texto, status_fluxo: status, atualizado_em: new Date().toISOString() })
      .eq('id', receitaId)
      .eq('organization_id', perfil.organization_id)
      .select('id')
      .single()
    if (error || !data) throw new Error(`Erro ao salvar rascunho: ${error?.message ?? 'não encontrado'}`)
    revalidatePath(`/orcamentos/${quoteId}`)
    return { id: data.id }
  }

  const { data, error } = await supabase
    .from('quote_receitas')
    .insert({
      organization_id: perfil.organization_id,
      quote_id: quoteId,
      texto_modelo: texto,
      status_fluxo: status,
      criado_por: user.id,
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(`Erro ao criar rascunho: ${error?.message ?? 'desconhecido'}`)
  revalidatePath(`/orcamentos/${quoteId}`)
  return { id: data.id }
}

/**
 * Anexa a receita assinada: upload para o bucket PRIVADO + grava metadados.
 * Não envia WhatsApp nem gera PDF.
 */
export async function anexarReceitaAssinada(formData: FormData): Promise<{ id: string }> {
  const { supabase, perfil, user } = await getUsuarioEOrg()

  const quoteId = formData.get('quoteId') as string
  const receitaId = (formData.get('receitaId') as string) || null
  const file = formData.get('file') as File

  if (!quoteId) throw new Error('Orçamento não informado.')
  if (!file || file.size === 0) throw new Error('Nenhum arquivo selecionado.')
  if (!TIPOS_PERMITIDOS.includes(file.type)) throw new Error('Arquivo deve ser PDF ou imagem (PNG/JPG/WEBP).')
  if (file.size > TAMANHO_MAX) throw new Error('Arquivo deve ter no máximo 10MB.')

  await assertOrcamentoDaOrg(supabase, quoteId, perfil.organization_id)

  const adminClient = createAdminClient()
  const ext = file.name.split('.').pop() || 'bin'
  const path = `${perfil.organization_id}/${quoteId}/${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await adminClient.storage
    .from(BUCKET)
    .upload(path, buffer, { upsert: false, contentType: file.type })
  if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`)

  const metadados = {
    arquivo_path: path,
    arquivo_nome: file.name,
    arquivo_tipo: file.type,
    arquivo_tamanho: file.size,
    enviado_em: new Date().toISOString(),
    status_fluxo: 'recebida' as ReceitaStatusFluxo,
    atualizado_em: new Date().toISOString(),
  }

  let id: string
  if (receitaId) {
    const { data, error } = await supabase
      .from('quote_receitas')
      .update(metadados)
      .eq('id', receitaId)
      .eq('organization_id', perfil.organization_id)
      .select('id')
      .single()
    if (error || !data) {
      // rollback do arquivo se falhar o registro
      await adminClient.storage.from(BUCKET).remove([path])
      throw new Error(`Erro ao registrar receita: ${error?.message ?? 'não encontrado'}`)
    }
    id = data.id
  } else {
    const { data, error } = await supabase
      .from('quote_receitas')
      .insert({
        organization_id: perfil.organization_id,
        quote_id: quoteId,
        criado_por: user.id,
        ...metadados,
      })
      .select('id')
      .single()
    if (error || !data) {
      await adminClient.storage.from(BUCKET).remove([path])
      throw new Error(`Erro ao registrar receita: ${error?.message ?? 'desconhecido'}`)
    }
    id = data.id
  }

  await registrarEventoOrcamento(quoteId, { tipo: 'receita_anexada', descricao: `Receita anexada (${file.name}).`, origem: 'hub_form', metadata: { receita_id: id } })

  revalidatePath(`/orcamentos/${quoteId}`)
  return { id }
}

/**
 * Valida ou rejeita uma receita.
 */
export async function validarReceita(params: {
  receitaId: string
  quoteId: string
  decisao: 'validada' | 'rejeitada'
  comentario?: string
}): Promise<void> {
  const { supabase, perfil, user } = await getUsuarioEOrg()
  const { receitaId, quoteId, decisao, comentario } = params

  const { error } = await supabase
    .from('quote_receitas')
    .update({
      status_fluxo: decisao,
      validada_por: user.id,
      validada_em: new Date().toISOString(),
      validacao_comentario: comentario ?? null,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', receitaId)
    .eq('organization_id', perfil.organization_id)
  if (error) throw new Error(`Erro ao validar receita: ${error.message}`)

  await registrarEventoOrcamento(quoteId, { tipo: 'receita_validada', descricao: decisao === 'validada' ? 'Receita validada.' : 'Receita rejeitada.', valorNovo: decisao, origem: 'hub_form', metadata: { receita_id: receitaId } })

  revalidatePath(`/orcamentos/${quoteId}`)
}

/**
 * Marca a receita como enviada (transição manual; não dispara canal externo).
 */
export async function marcarReceitaEnviada(receitaId: string, quoteId: string): Promise<void> {
  const { supabase, perfil } = await getUsuarioEOrg()
  const { error } = await supabase
    .from('quote_receitas')
    .update({ status_fluxo: 'enviada', atualizado_em: new Date().toISOString() })
    .eq('id', receitaId)
    .eq('organization_id', perfil.organization_id)
  if (error) throw new Error(`Erro ao marcar como enviada: ${error.message}`)
  revalidatePath(`/orcamentos/${quoteId}`)
}
