'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { atualizarCredenciaisAuth } from '@/lib/supabase/credenciais'
import { EMAIL_RE } from '@/lib/email'
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

// Cadastro de Hub + criação do usuário proprietário numa ÚNICA operação lógica.
// Não existe Hub sem proprietário, nem proprietário sem Hub.
//   - hubs.nome               = "Nome do Hub" (unidade operacional, perene)
//   - hubs.nome_representante  = responsável atual (substituível sem trocar o Hub)
//   - usuário proprietário     = Supabase Auth + Profile (cargo proprietario_hub),
//                                vinculado via profiles.hub_id.
// A SENHA é usada exclusivamente para criar o usuário no Auth: nunca é gravada em
// tabela, auditoria ou log. Em qualquer falha, faz rollback dos registros criados.
export async function criarHub(formData: FormData) {
  const { supabase, perfil } = await getAdminOuGestor()

  const nome = (formData.get('nome') as string)?.trim()
  const telefone = (formData.get('telefone') as string)?.trim()
  const cnpj = (formData.get('cnpj') as string)?.trim()
  const nomeFantasia = (formData.get('nome_fantasia') as string)?.trim() || null
  const razaoSocial = (formData.get('razao_social') as string)?.trim() || null
  const observacoes = (formData.get('observacoes') as string)?.trim() || null
  // Modo do Proprietário: existente (vincular) ou novo (criar). DEC-015/016.
  const propExistenteId = (formData.get('proprietario_existente_id') as string)?.trim() || null

  // Validações comuns do Hub.
  if (!nome) throw new Error('Nome do Hub é obrigatório.')
  if (!telefone) throw new Error('Telefone é obrigatório.')
  if (!cnpj) throw new Error('CNPJ da empresa é obrigatório.')
  if (observacoes && observacoes.length > 3000) throw new Error('Observações: máximo de 3.000 caracteres.')

  const admin = createAdminClient()

  // ── Caminho A: usar Proprietário EXISTENTE (não cria usuário) ────────────
  if (propExistenteId) {
    const { data: owner } = await supabase
      .from('profiles').select('id, nome, email, cargo, ativo, hub_id')
      .eq('id', propExistenteId).eq('organization_id', perfil.organization_id).single()
    if (!owner || owner.cargo !== 'proprietario_hub' || !owner.ativo) {
      throw new Error('Proprietário inválido (precisa ser Proprietário de Hub ativo da Indústria).')
    }
    if (owner.hub_id) throw new Error('Este Proprietário já está vinculado a um Hub.')

    const { data: hub, error: hubErr } = await supabase
      .from('hubs')
      .insert({
        organization_id: perfil.organization_id, nome,
        nome_representante: owner.nome, email: owner.email, telefone, cnpj,
        nome_fantasia: nomeFantasia, razao_social: razaoSocial, observacoes, status: 'ATIVO',
      })
      .select('id').single()
    if (hubErr || !hub) throw new Error(`Erro ao criar Hub: ${hubErr?.message ?? 'desconhecido'}`)

    const { error: linkErr } = await admin
      .from('profiles').update({ hub_id: hub.id, atualizado_em: new Date().toISOString() }).eq('id', owner.id)
    if (linkErr) {
      await supabase.from('hubs').delete().eq('id', hub.id) // rollback
      throw new Error('Erro ao vincular o proprietário ao Hub.')
    }
    await registrarAuditoria(supabase, perfil, 'CRIACAO_HUB', hub.id, null, {
      nome, nome_representante: owner.nome, email: owner.email, telefone, cnpj, status: 'ATIVO',
    })
    await registrarAuditoria(supabase, perfil, 'VINCULO_PROPRIETARIO_HUB', hub.id, null, { proprietario_id: owner.id, existente: true })
    revalidatePath('/configuracoes/hubs')
    return
  }

  // ── Caminho B: criar NOVO Proprietário (usuário + senha) ─────────────────
  const nomeRepresentante = (formData.get('nome_representante') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const senha = (formData.get('senha') as string) || ''
  const senhaConfirmacao = (formData.get('senha_confirmacao') as string) || ''

  if (!nomeRepresentante) throw new Error('Nome do representante é obrigatório.')
  if (!email) throw new Error('E-mail é obrigatório.')
  if (!EMAIL_RE.test(email)) throw new Error('E-mail inválido.')
  if (senha.length < 8) throw new Error('A senha deve ter no mínimo 8 caracteres.')
  if (senha !== senhaConfirmacao) throw new Error('As senhas não coincidem.')

  let ownerId: string | null = null
  let hubId: string | null = null

  try {
    // 1) Usuário proprietário no Auth (e-mail confirmado). O trigger cria o
    //    Profile (cargo proprietario_hub, organization_id correto, hub_id null).
    const { data: criado, error: authErr } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome: nomeRepresentante, cargo: 'proprietario_hub' },
    })
    if (authErr || !criado?.user) {
      const msg = authErr?.message ?? ''
      if (/already|registered|exist/i.test(msg)) throw new Error('E-mail já cadastrado.')
      throw new Error('Não foi possível criar o usuário do proprietário.')
    }
    ownerId = criado.user.id

    // 2) Hub.
    const { data: hub, error: hubErr } = await supabase
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
    if (hubErr || !hub) throw new Error(`Erro ao criar Hub: ${hubErr?.message ?? 'desconhecido'}`)
    hubId = hub.id

    // 3) Vincula o proprietário ao Hub (hub_id + telefone no Profile) e desfaz
    //    qualquer auto-vínculo indevido (trigger) de outro profile a este Hub.
    const { error: linkErr } = await admin
      .from('profiles')
      .update({ hub_id: hubId, telefone, atualizado_em: new Date().toISOString() })
      .eq('id', ownerId)
    if (linkErr) throw new Error('Erro ao vincular o proprietário ao Hub.')

    await admin
      .from('profiles')
      .update({ hub_id: null, atualizado_em: new Date().toISOString() })
      .eq('hub_id', hubId)
      .neq('id', ownerId)

    // 4) Auditoria — SEM senha.
    await registrarAuditoria(supabase, perfil, 'CRIACAO_HUB', hub.id, null, {
      nome, nome_representante: nomeRepresentante, email, telefone, cnpj,
      nome_fantasia: nomeFantasia, razao_social: razaoSocial, status: 'ATIVO',
    })
    await registrarAuditoria(supabase, perfil, 'VINCULO_PROPRIETARIO_HUB', hub.id, null, { proprietario_id: ownerId })

    revalidatePath('/configuracoes/hubs')
  } catch (e) {
    // Rollback (compensação): limpa vínculos, remove o Hub e o usuário criados.
    if (hubId) {
      await admin.from('profiles').update({ hub_id: null }).eq('hub_id', hubId)
      await supabase.from('hubs').delete().eq('id', hubId)
    }
    if (ownerId) {
      await admin.auth.admin.deleteUser(ownerId) // remove também o Profile (cascade)
    }
    throw e instanceof Error ? e : new Error('Falha ao criar Hub e proprietário.')
  }
}

// Alteração de senha do proprietário do Hub (ação administrativa).
// Atualiza apenas no Supabase Auth; senha nunca vai para banco/auditoria/log.
export async function alterarSenhaProprietario(hubId: string, novaSenha: string) {
  const { supabase, perfil } = await getAdminOuGestor()

  if (!novaSenha || novaSenha.length < 8) throw new Error('A senha deve ter no mínimo 8 caracteres.')

  const { data: owner } = await supabase
    .from('profiles')
    .select('id')
    .eq('organization_id', perfil.organization_id)
    .eq('cargo', 'proprietario_hub')
    .eq('hub_id', hubId)
    .maybeSingle()
  if (!owner) throw new Error('Este Hub não possui proprietário vinculado.')

  const admin = createAdminClient()
  await atualizarCredenciaisAuth(admin, owner.id, { senha: novaSenha })

  // Auditoria sem expor a senha.
  await registrarAuditoria(supabase, perfil, 'ALTERACAO_SENHA_PROPRIETARIO', hubId, null, { proprietario_id: owner.id })
  revalidatePath('/configuracoes/hubs')
}

// Alteração de e-mail (login) do proprietário do Hub (ação administrativa da Indústria).
// Atualiza o Supabase Auth (e-mail já confirmado) e sincroniza profiles.email e hubs.email
// (definidos iguais na criação do Hub).
export async function alterarEmailProprietario(hubId: string, novoEmail: string) {
  const { supabase, perfil } = await getAdminOuGestor()

  const email = (novoEmail || '').trim().toLowerCase()
  if (!email) throw new Error('E-mail é obrigatório.')
  if (!EMAIL_RE.test(email)) throw new Error('E-mail inválido.')

  const { data: owner } = await supabase
    .from('profiles')
    .select('id')
    .eq('organization_id', perfil.organization_id)
    .eq('cargo', 'proprietario_hub')
    .eq('hub_id', hubId)
    .maybeSingle()
  if (!owner) throw new Error('Este Hub não possui proprietário vinculado.')

  const admin = createAdminClient()
  await atualizarCredenciaisAuth(admin, owner.id, { email })
  // Sincroniza Profile e Hub — erros verificados para não divergir do Auth silenciosamente.
  const { error: profErr } = await admin
    .from('profiles')
    .update({ email, atualizado_em: new Date().toISOString() })
    .eq('id', owner.id)
  if (profErr) throw new Error('E-mail alterado no login, mas falhou ao sincronizar o perfil. Tente novamente.')
  const { error: hubErr } = await supabase
    .from('hubs')
    .update({ email, atualizado_em: new Date().toISOString() })
    .eq('id', hubId)
  if (hubErr) throw new Error('E-mail alterado, mas falhou ao sincronizar o cadastro do Hub. Tente novamente.')

  await registrarAuditoria(supabase, perfil, 'ALTERACAO_EMAIL_PROPRIETARIO', hubId, null, { proprietario_id: owner.id, email })
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

  // DEC-015: um Hub nunca fica sem Proprietário — só é permitido SUBSTITUIR, não remover.
  if (!proprietarioId) {
    throw new Error('O Hub deve ter um Proprietário. Selecione um substituto — não é possível remover.')
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
