import { createClient } from '@/lib/supabase/server'
import { ListaUsuarios } from '@/components/usuarios/lista-usuarios'
import { ModalNovoUsuario } from '@/components/usuarios/modal-novo-usuario'
import { redirect } from 'next/navigation'
import type { Profile } from '@/types/database'

export default async function UsuariosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('cargo, organization_id')
    .eq('id', user.id)
    .single()

  if (perfil?.cargo !== 'admin') {
    redirect('/painel')
  }

  const { data: usuarios } = await supabase
    .from('profiles')
    .select('id, nome, email, telefone, cargo, disponivel, ativo, criado_em')
    .eq('organization_id', perfil.organization_id)
    .order('nome') as { data: Profile[] | null }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuários e Permissões</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gerencie os usuários e perfis de acesso do sistema.
          </p>
        </div>
        <ModalNovoUsuario />
      </div>

      <ListaUsuarios usuarios={usuarios ?? []} />
    </div>
  )
}
