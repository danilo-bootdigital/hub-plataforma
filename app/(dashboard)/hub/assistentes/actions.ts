'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Apenas o Proprietário do Hub gerencia Assistentes do SEU Hub.
async function getProprietario() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo, hub_id')
    .eq('id', user.id)
    .single()
  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'proprietario_hub') {
    throw new Error('Apenas o Proprietário do Hub pode gerenciar Assistentes.')
  }
  if (!perfil.hub_id) {
    throw new Error('Você ainda não está vinculado a um Hub.')
  }
  return { supabase, perfil }
}

async function registrarAuditoria(
  perfil: { id: string; organization_id: string },
  acao: string,
  registroId: string,
  anteriores: Record<string, unknown> | null,
  novos: Record<string, unknown> | null
) {
  const supabase = await createClient()
  await supabase.from('audit_logs').insert({
    organization_id: perfil.organization_id,
    usuario_id: perfil.id,
    acao,
    tabela_afetada: 'profiles',
    registro_id: registroId,
    dados_anteriores: anteriores,
    dados_novos: novos,
  })
}

// Garante que o profile alvo é um Assistente do MESMO Hub do Proprietário.
async function assistenteDoHub(
  supabase: Awaited<ReturnType<typeof createClient>>,
  perfil: { hub_id: string },
  id: string
) {
  const { data: alvo } = await supabase
    .from('profiles')
    .select('id, cargo, hub_id, nome, ativo')
    .eq('id', id)
    .single()
  if (!alvo || alvo.cargo !== 'assistente' || alvo.hub_id !== perfil.hub_id) {
    throw new Error('Assistente não pertence ao seu Hub.')
  }
  return alvo
}

export async function criarAssistente(formData: FormData) {
  const { perfil } = await getProprietario()

  const nome = (formData.get('nome') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const senha = formData.get('senha') as string
  const telefone = (formData.get('telefone') as string)?.trim() || null

  if (!nome) throw new Error('Nome é obrigatório.')
  if (!email) throw new Error('E-mail é obrigatório.')
  if (!senha || senha.length < 6) throw new Error('Senha deve ter no mínimo 6 caracteres.')

  const adminClient = createAdminClient()
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, cargo: 'assistente' },
  })
  if (error) throw new Error(`Erro ao criar Assistente: ${error.message}`)

  if (data.user) {
    // Vincula ao Hub do Proprietário (o trigger cria o profile com cargo=assistente).
    await adminClient
      .from('profiles')
      .update({
        nome,
        organization_id: perfil.organization_id,
        cargo: 'assistente',
        hub_id: perfil.hub_id,
        telefone,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', data.user.id)
    await registrarAuditoria(perfil, 'CRIACAO_ASSISTENTE', data.user.id, null, { nome, email, hub_id: perfil.hub_id })
  }

  revalidatePath('/hub/assistentes')
}

export async function editarAssistente(id: string, nome: string, telefone: string | null) {
  const { supabase, perfil } = await getProprietario()
  if (!nome?.trim()) throw new Error('Nome é obrigatório.')

  const anterior = await assistenteDoHub(supabase, perfil, id)

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('profiles')
    .update({ nome: nome.trim(), telefone: telefone?.trim() || null, atualizado_em: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`Erro ao editar Assistente: ${error.message}`)

  await registrarAuditoria(perfil, 'EDICAO_ASSISTENTE', id, { nome: anterior.nome }, { nome: nome.trim(), telefone: telefone?.trim() || null })
  revalidatePath('/hub/assistentes')
}

export async function alterarStatusAssistente(id: string, ativo: boolean) {
  const { supabase, perfil } = await getProprietario()

  const anterior = await assistenteDoHub(supabase, perfil, id)

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('profiles')
    .update({ ativo, atualizado_em: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`Erro ao alterar status: ${error.message}`)

  await registrarAuditoria(perfil, 'ALTERACAO_STATUS_ASSISTENTE', id, { ativo: anterior.ativo }, { ativo })
  revalidatePath('/hub/assistentes')
}
