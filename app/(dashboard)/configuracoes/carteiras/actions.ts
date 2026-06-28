'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Apenas a Indústria (admin/gestor) gerencia Carteiras — a Carteira pertence à Indústria (DEC-008).
async function getAdminOuGestor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()
  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'admin' && perfil.cargo !== 'gestor') {
    throw new Error('Sem permissão.')
  }
  return { supabase, perfil }
}

// Auditoria seguindo o padrão existente (tabela audit_logs).
async function registrarAuditoria(
  supabase: Awaited<ReturnType<typeof createClient>>,
  perfil: { id: string; organization_id: string },
  acao: string,
  registroId: string,
  anteriores: Record<string, unknown> | null,
  novos: Record<string, unknown> | null
) {
  await supabase.from('audit_logs').insert({
    organization_id: perfil.organization_id,
    usuario_id: perfil.id,
    acao,
    tabela_afetada: 'carteiras',
    registro_id: registroId,
    dados_anteriores: anteriores,
    dados_novos: novos,
  })
}

export async function criarCarteira(formData: FormData) {
  const { supabase, perfil } = await getAdminOuGestor()

  const nome = (formData.get('nome') as string)?.trim()
  if (!nome) throw new Error('Nome é obrigatório.')

  const descricao = (formData.get('descricao') as string)?.trim() || null
  const observacoes = (formData.get('observacoes') as string)?.trim() || null
  const ordemRaw = (formData.get('ordem') as string)?.trim()
  const ordem = ordemRaw && !Number.isNaN(Number(ordemRaw)) ? Math.trunc(Number(ordemRaw)) : 0

  // modo/hub_id NÃO são definidos aqui (operação/vínculo do Hub — fora desta fatia).
  // O banco aplica o default de `modo` (ABERTA). hub_id permanece nulo.
  const { data, error } = await supabase
    .from('carteiras')
    .insert({ organization_id: perfil.organization_id, nome, descricao, observacoes, ordem })
    .select('id')
    .single()

  if (error) throw new Error(`Erro ao criar Carteira: ${error.message}`)
  await registrarAuditoria(supabase, perfil, 'CRIACAO_CARTEIRA', data.id, null, { nome, descricao, observacoes, ordem })
  revalidatePath('/configuracoes/carteiras')
}

export async function editarCarteira(
  id: string,
  nome: string,
  descricao: string | null,
  observacoes: string | null
) {
  const { supabase, perfil } = await getAdminOuGestor()

  if (!nome?.trim()) throw new Error('Nome é obrigatório.')

  const { data: anterior } = await supabase
    .from('carteiras')
    .select('nome, descricao, observacoes')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('carteiras')
    .update({
      nome: nome.trim(),
      descricao: descricao?.trim() || null,
      observacoes: observacoes?.trim() || null,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(`Erro ao editar Carteira: ${error.message}`)
  await registrarAuditoria(supabase, perfil, 'EDICAO_CARTEIRA', id, anterior ?? null, {
    nome: nome.trim(),
    descricao: descricao?.trim() || null,
    observacoes: observacoes?.trim() || null,
  })
  revalidatePath('/configuracoes/carteiras')
}

// "Status" da Carteira = ativa/inativa (campo `ativo` existente na estrutura).
export async function alterarStatusCarteira(id: string, ativo: boolean) {
  const { supabase, perfil } = await getAdminOuGestor()

  const { data: anterior } = await supabase
    .from('carteiras')
    .select('ativo')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('carteiras')
    .update({ ativo, atualizado_em: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(`Erro ao alterar status: ${error.message}`)
  await registrarAuditoria(supabase, perfil, 'ALTERACAO_STATUS_CARTEIRA', id, anterior ?? null, { ativo })
  revalidatePath('/configuracoes/carteiras')
}

// Autoriza (ou altera/remove) o Hub que opera a Carteira — vínculo carteiras.hub_id.
// hubId = null remove a autorização. NÃO implementa distribuição/operação do Hub.
export async function autorizarCarteiraHub(carteiraId: string, hubId: string | null) {
  const { supabase, perfil } = await getAdminOuGestor()

  // Valida que o Hub (se informado) pertence à Indústria.
  if (hubId) {
    const { data: hub } = await supabase
      .from('hubs')
      .select('id')
      .eq('id', hubId)
      .eq('organization_id', perfil.organization_id)
      .single()
    if (!hub) throw new Error('Hub não encontrado ou não pertence à sua organização.')
  }

  const { data: anterior } = await supabase
    .from('carteiras')
    .select('hub_id')
    .eq('id', carteiraId)
    .single()
  const anteriorHub: string | null = anterior?.hub_id ?? null

  const { error } = await supabase
    .from('carteiras')
    .update({ hub_id: hubId, atualizado_em: new Date().toISOString() })
    .eq('id', carteiraId)

  if (error) throw new Error(`Erro ao autorizar Carteira: ${error.message}`)

  const acao = hubId
    ? anteriorHub
      ? 'ALTERACAO_CARTEIRA_HUB'
      : 'AUTORIZACAO_CARTEIRA_HUB'
    : 'REMOCAO_AUTORIZACAO_CARTEIRA_HUB'
  await registrarAuditoria(supabase, perfil, acao, carteiraId, { hub_id: anteriorHub }, { hub_id: hubId })
  revalidatePath('/configuracoes/carteiras')
}
