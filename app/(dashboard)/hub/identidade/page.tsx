import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FormIdentidadeHub } from '@/components/hub/form-identidade-hub'

// Identidade/Marca do Hub (DEC-017). Só o Proprietário do Hub edita o SEU Hub.
export default async function IdentidadeHubPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles').select('id, cargo, hub_id').eq('id', user.id).single()
  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'proprietario_hub') redirect('/painel')
  if (!perfil.hub_id) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-slate-900">Identidade do Hub</h1>
        <p className="max-w-prose text-slate-500">Você ainda não está vinculado a um Hub.</p>
      </div>
    )
  }

  const { data: hub } = await supabase
    .from('hubs')
    .select('nome, logo_url, telefone, email, site, instagram, cnpj, endereco')
    .eq('id', perfil.hub_id)
    .single()

  return (
    <FormIdentidadeHub
      hubNome={hub?.nome ?? '—'}
      inicial={{
        logo_url: hub?.logo_url ?? null,
        telefone: hub?.telefone ?? null,
        email: hub?.email ?? null,
        site: hub?.site ?? null,
        instagram: hub?.instagram ?? null,
        cnpj: hub?.cnpj ?? null,
        endereco: hub?.endereco ?? null,
      }}
    />
  )
}
