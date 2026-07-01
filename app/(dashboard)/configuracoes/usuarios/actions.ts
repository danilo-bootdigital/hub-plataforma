'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function criarUsuario(formData: FormData) {
  const supabase = await createClient()
  const { data: { user: usuarioAtual } } = await supabase.auth.getUser()
  const { data: perfilAtual } = await supabase
    .from('profiles')
    .select('cargo, organization_id')
    .eq('id', usuarioAtual?.id ?? '')
    .single()

  if (perfilAtual?.cargo !== 'admin') {
    throw new Error('Apenas administradores podem criar usuários.')
  }

  const nome = formData.get('nome') as string
  const email = formData.get('email') as string
  const senha = formData.get('senha') as string
  const cargo = formData.get('cargo') as string
  const telefone = formData.get('telefone') as string

  if (!nome?.trim()) throw new Error('Nome é obrigatório.')
  if (!email?.trim()) throw new Error('E-mail é obrigatório.')
  if (!senha || senha.length < 6) throw new Error('Senha deve ter no mínimo 6 caracteres.')
  if (!cargo?.trim()) throw new Error('Cargo é obrigatório.')
  // DEC-016: a Indústria cria apenas usuários da Indústria. Proprietário → fluxo de Hub;
  // Assistente → criado/convidado pelo Proprietário na área do Hub.
  if (!['admin', 'gestor'].includes(cargo)) {
    throw new Error('Perfil inválido. A Indústria cria apenas Administrador da Indústria ou Gestor da Indústria.')
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, cargo },
  })

  if (error) {
    throw new Error(`Erro ao criar usuário: ${error.message}`)
  }

  if (data.user) {
    await adminClient
      .from('profiles')
      .update({
        nome,
        organization_id: perfilAtual.organization_id,
        cargo,
        telefone: telefone || null,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', data.user.id)
  }

  revalidatePath('/configuracoes/usuarios')
}

export async function alterarSenhaUsuario(usuarioId: string, novaSenha: string) {
  const supabase = await createClient()

  const { data: { user: usuarioAtual } } = await supabase.auth.getUser()
  const { data: perfilAtual } = await supabase
    .from('profiles')
    .select('cargo, organization_id')
    .eq('id', usuarioAtual?.id ?? '')
    .single()

  if (perfilAtual?.cargo !== 'admin') {
    throw new Error('Apenas administradores podem alterar senhas.')
  }

  const { data: perfilAlvo } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', usuarioId)
    .single()

  if (perfilAlvo?.organization_id !== perfilAtual.organization_id) {
    throw new Error('Usuário não pertence à sua organização.')
  }

  if (!novaSenha || novaSenha.length < 6) {
    throw new Error('A senha deve ter no mínimo 6 caracteres.')
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.updateUserById(usuarioId, {
    password: novaSenha,
  })

  if (error) {
    throw new Error(`Erro ao alterar senha: ${error.message}`)
  }
}

// Atribui/remove a Função (Role) de um Assistente (DEC-015). Admin da Indústria.
// A Função precisa pertencer ao Hub do próprio usuário. Usa admin client porque
// funcoes tem RLS sem policies.
export async function atribuirFuncao(usuarioId: string, funcaoId: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfilAtual } = await supabase
    .from('profiles').select('cargo, organization_id').eq('id', user?.id ?? '').single()
  if (perfilAtual?.cargo !== 'admin') throw new Error('Apenas administradores podem atribuir funções.')

  const admin = createAdminClient()
  const { data: alvo } = await admin
    .from('profiles').select('id, organization_id, cargo, hub_id').eq('id', usuarioId).single()
  if (!alvo || alvo.organization_id !== perfilAtual.organization_id) {
    throw new Error('Usuário não pertence à sua organização.')
  }
  if (alvo.cargo !== 'assistente') throw new Error('Apenas Assistentes recebem Função.')

  if (funcaoId) {
    const { data: f } = await admin.from('funcoes').select('id, hub_id').eq('id', funcaoId).single()
    if (!f) throw new Error('Função não encontrada.')
    if (f.hub_id !== alvo.hub_id) throw new Error('A Função pertence a outro Hub.')
  }

  const { error } = await admin
    .from('profiles')
    .update({ funcao_id: funcaoId, atualizado_em: new Date().toISOString() })
    .eq('id', usuarioId)
  if (error) throw new Error(`Erro ao atribuir função: ${error.message}`)
  revalidatePath('/configuracoes/usuarios')
}

// EXCLUSÃO DEFINITIVA — exceção para DEV/limpeza. Em produção o padrão é Desativar.
// Só Administrador da Indústria; confirmação forte; bloqueia se houver vínculo
// operacional ou se o usuário for Proprietário de Hub. Remove o usuário do Auth
// (cascade do profile → hub_id/funcao_id) e registra auditoria.
export async function excluirUsuarioDefinitivo(usuarioId: string, confirmacao: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfilAtual } = await supabase
    .from('profiles').select('id, cargo, organization_id').eq('id', user?.id ?? '').single()
  if (perfilAtual?.cargo !== 'admin') throw new Error('Apenas administradores podem excluir usuários.')
  if (usuarioId === perfilAtual.id) throw new Error('Você não pode excluir a si mesmo.')
  if (confirmacao !== 'EXCLUIR USUÁRIO') {
    throw new Error('Confirmação inválida. Digite exatamente: EXCLUIR USUÁRIO')
  }

  // Vínculos operacionais (verificação dinâmica de FKs → profiles).
  const { data: vinc, error: eVinc } = await supabase.rpc('contar_vinculos_usuario', { p_user_id: usuarioId })
  if (eVinc) throw new Error(eVinc.message)
  const v = vinc as { total: number; itens: { tabela: string; qtd: number }[]; proprietario_de_hub: boolean }
  if (v.proprietario_de_hub) {
    throw new Error('Este usuário é Proprietário de um Hub. Reatribua o Hub a outro Proprietário antes de excluir — ou use Desativar.')
  }
  if (v.total > 0) {
    const resumo = (v.itens ?? []).map((i) => `${i.tabela} (${i.qtd})`).join(', ')
    throw new Error(`Não é possível excluir: há vínculos operacionais — ${resumo}. Use Desativar.`)
  }

  const admin = createAdminClient()
  const { data: alvo } = await admin.from('profiles').select('nome, email, cargo').eq('id', usuarioId).single()
  const { error: eDel } = await admin.auth.admin.deleteUser(usuarioId) // remove o profile (cascade)
  if (eDel) throw new Error(`Não foi possível excluir: ${eDel.message}`)

  await admin.from('audit_logs').insert({
    organization_id: perfilAtual.organization_id,
    usuario_id: perfilAtual.id,
    acao: 'EXCLUSAO_DEFINITIVA_USUARIO',
    tabela_afetada: 'profiles',
    registro_id: usuarioId,
    dados_anteriores: alvo ?? null,
    dados_novos: null,
  })
  revalidatePath('/configuracoes/usuarios')
}

export async function alternarStatusUsuario(usuarioId: string, ativo: boolean) {
  const supabase = await createClient()

  const { data: { user: usuarioAtual } } = await supabase.auth.getUser()
  const { data: perfilAtual } = await supabase
    .from('profiles')
    .select('cargo, organization_id')
    .eq('id', usuarioAtual?.id ?? '')
    .single()

  if (perfilAtual?.cargo !== 'admin') {
    throw new Error('Apenas administradores podem alterar status de usuários.')
  }

  const { error } = await supabase
    .from('profiles')
    .update({ ativo, atualizado_em: new Date().toISOString() })
    .eq('id', usuarioId)
    .eq('organization_id', perfilAtual.organization_id)

  if (error) {
    throw new Error(`Erro ao atualizar status: ${error.message}`)
  }

  revalidatePath('/configuracoes/usuarios')
}
