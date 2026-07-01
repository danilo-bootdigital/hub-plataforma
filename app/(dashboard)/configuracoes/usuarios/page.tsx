import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ListaUsuarios, type UsuarioLinha, type FuncaoOpcao } from '@/components/usuarios/lista-usuarios'
import { ModalNovoUsuario } from '@/components/usuarios/modal-novo-usuario'
import { redirect } from 'next/navigation'
import type { UserRole } from '@/types/database'

export default async function UsuariosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles').select('cargo, organization_id').eq('id', user.id).single()
  if (perfil?.cargo !== 'admin') redirect('/painel')

  const org = perfil.organization_id

  const { data: usuarios } = await supabase
    .from('profiles')
    .select('id, nome, email, telefone, cargo, ativo, criado_em, hub_id, funcao_id')
    .eq('organization_id', org)
    .order('nome')

  const { data: hubs } = await supabase
    .from('hubs').select('id, nome').eq('organization_id', org)
  const hubNome = new Map((hubs ?? []).map((h) => [h.id, h.nome]))

  // funcoes (RLS bloqueia p/ app) e último acesso via admin client — página só admin.
  const admin = createAdminClient()
  const { data: funcoes } = await admin
    .from('funcoes').select('id, nome, hub_id').eq('organization_id', org).eq('ativo', true).order('nome')
  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const ultimoAcesso = new Map<string, string | null>()
  for (const u of authList?.users ?? []) ultimoAcesso.set(u.id, u.last_sign_in_at ?? null)

  const linhas: UsuarioLinha[] = (usuarios ?? []).map((u) => ({
    id: u.id,
    nome: u.nome,
    email: u.email,
    telefone: u.telefone,
    cargo: u.cargo as UserRole,
    ativo: u.ativo,
    criado_em: u.criado_em,
    hub_id: u.hub_id ?? null,
    hub_nome: u.hub_id ? (hubNome.get(u.hub_id) ?? null) : null,
    funcao_id: u.funcao_id ?? null,
    ultimo_acesso: ultimoAcesso.get(u.id) ?? null,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuários e Permissões</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gerencie os usuários, perfis e — para Assistentes — a Função (permissões).
          </p>
        </div>
        <ModalNovoUsuario />
      </div>

      <ListaUsuarios usuarios={linhas} funcoes={(funcoes ?? []) as FuncaoOpcao[]} />
    </div>
  )
}
