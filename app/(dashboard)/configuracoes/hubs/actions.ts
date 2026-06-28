'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const STATUS_VALIDOS = ['ATIVO', 'INATIVO', 'SUSPENSO', 'BLOQUEADO'] as const

// Apenas a Indústria (admin/gestor) gerencia Hubs — princípio aprovado (DEC-007/DEC-011).
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
    tabela_afetada: 'hubs',
    registro_id: registroId,
    dados_anteriores: anteriores,
    dados_novos: novos,
  })
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Cadastro de Hub. Hub e Representante são entidades distintas:
//   - hubs.nome           = "Nome do Hub" (unidade operacional, perene)
//   - hubs.nome_representante = responsável atual (substituível sem trocar o Hub)
// Hub nasce automaticamente como ATIVO. email/telefone/cnpj já existem na tabela;
// nome_representante/nome_fantasia/razao_social/observacoes vêm da migration aditiva.
export async function criarHub(formData: FormData) {
  const { supabase, perfil } = await getAdminOuGestor()

  const nome = (formData.get('nome') as string)?.trim()
  const nomeRepresentante = (formData.get('nome_representante') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const telefone = (formData.get('telefone') as string)?.trim()
  const cnpj = (formData.get('cnpj') as string)?.trim()
  const nomeFantasia = (formData.get('nome_fantasia') as string)?.trim() || null
  const razaoSocial = (formData.get('razao_social') as string)?.trim() || null
  const observacoes = (formData.get('observacoes') as string)?.trim() || null

  // Validações (obrigatórios + e-mail válido + limite de observações).
  if (!nome) throw new Error('Nome do Hub é obrigatório.')
  if (!nomeRepresentante) throw new Error('Nome do representante é obrigatório.')
  if (!email) throw new Error('E-mail é obrigatório.')
  if (!EMAIL_RE.test(email)) throw new Error('E-mail inválido.')
  if (!telefone) throw new Error('Telefone é obrigatório.')
  if (!cnpj) throw new Error('CNPJ da empresa é obrigatório.')
  if (observacoes && observacoes.length > 3000) throw new Error('Observações: máximo de 3.000 caracteres.')

  const { data, error } = await supabase
    .from('hubs')
    .insert({
      organization_id: perfil.organization_id,
      nome,
      nome_representante: nomeRepresentante,
      email,
      telefone,
      cnpj,
      nome_fantasia: nomeFantasia,
      razao_social: razaoSocial,
      observacoes,
      status: 'ATIVO',
    })
    .select('id')
    .single()

  if (error) throw new Error(`Erro ao criar Hub: ${error.message}`)
  await registrarAuditoria(supabase, perfil, 'CRIACAO_HUB', data.id, null, {
    nome, nome_representante: nomeRepresentante, email, telefone, cnpj,
    nome_fantasia: nomeFantasia, razao_social: razaoSocial, status: 'ATIVO',
  })
  revalidatePath('/configuracoes/hubs')
}

export async function editarHub(id: string, nome: string, descricao: string | null) {
  const { supabase, perfil } = await getAdminOuGestor()

  if (!nome?.trim()) throw new Error('Nome é obrigatório.')

  const { data: anterior } = await supabase
    .from('hubs')
    .select('nome, descricao')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('hubs')
    .update({
      nome: nome.trim(),
      descricao: descricao?.trim() || null,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(`Erro ao editar Hub: ${error.message}`)
  await registrarAuditoria(supabase, perfil, 'EDICAO_HUB', id, anterior ?? null, {
    nome: nome.trim(),
    descricao: descricao?.trim() || null,
  })
  revalidatePath('/configuracoes/hubs')
}

export async function alterarStatusHub(id: string, status: string) {
  const { supabase, perfil } = await getAdminOuGestor()

  if (!(STATUS_VALIDOS as readonly string[]).includes(status)) {
    throw new Error('Status inválido.')
  }

  const { data: anterior } = await supabase
    .from('hubs')
    .select('status')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('hubs')
    .update({ status, atualizado_em: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(`Erro ao alterar status: ${error.message}`)
  await registrarAuditoria(supabase, perfil, 'ALTERACAO_STATUS_HUB', id, anterior ?? null, { status })
  revalidatePath('/configuracoes/hubs')
}

// Vínculo Proprietário ↔ Hub — feito pela Indústria. Reutiliza profiles.hub_id (sem schema novo).
// proprietarioId = null remove o vínculo. Regras: 1 Proprietário por Hub e 1 Hub por Proprietário.
export async function definirProprietarioHub(hubId: string, proprietarioId: string | null) {
  const { supabase, perfil } = await getAdminOuGestor()

  const { data: hub } = await supabase
    .from('hubs')
    .select('id')
    .eq('id', hubId)
    .eq('organization_id', perfil.organization_id)
    .single()
  if (!hub) throw new Error('Hub não encontrado ou não pertence à sua organização.')

  // Proprietário atual deste Hub (se houver).
  const { data: atual } = await supabase
    .from('profiles')
    .select('id')
    .eq('organization_id', perfil.organization_id)
    .eq('cargo', 'proprietario_hub')
    .eq('hub_id', hubId)
    .maybeSingle()
  const atualId: string | null = atual?.id ?? null

  const adminClient = createAdminClient()

  // Remoção do vínculo.
  if (!proprietarioId) {
    if (!atualId) return
    await adminClient.from('profiles').update({ hub_id: null, atualizado_em: new Date().toISOString() }).eq('id', atualId)
    await registrarAuditoria(supabase, perfil, 'REMOCAO_PROPRIETARIO_HUB', hubId, { proprietario_id: atualId }, { proprietario_id: null })
    revalidatePath('/configuracoes/hubs')
    return
  }

  // Valida o novo Proprietário (proprietario_hub ativo da mesma Indústria).
  const { data: novo } = await supabase
    .from('profiles')
    .select('id, hub_id, ativo, cargo')
    .eq('id', proprietarioId)
    .eq('organization_id', perfil.organization_id)
    .single()
  if (!novo || novo.cargo !== 'proprietario_hub' || !novo.ativo) {
    throw new Error('Proprietário inválido (precisa ser proprietario_hub ativo da Indústria).')
  }
  if (novo.hub_id && novo.hub_id !== hubId) {
    throw new Error('Este Proprietário já está vinculado a outro Hub.')
  }
  if (atualId === proprietarioId) return // sem mudança

  // Desvincula o atual (se diferente) e vincula o novo.
  if (atualId && atualId !== proprietarioId) {
    await adminClient.from('profiles').update({ hub_id: null, atualizado_em: new Date().toISOString() }).eq('id', atualId)
  }
  await adminClient.from('profiles').update({ hub_id: hubId, atualizado_em: new Date().toISOString() }).eq('id', proprietarioId)

  const acao = atualId ? 'ALTERACAO_PROPRIETARIO_HUB' : 'VINCULO_PROPRIETARIO_HUB'
  await registrarAuditoria(supabase, perfil, acao, hubId, { proprietario_id: atualId }, { proprietario_id: proprietarioId })
  revalidatePath('/configuracoes/hubs')
}
