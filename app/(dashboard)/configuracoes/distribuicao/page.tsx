import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FormConfigDistribuicao } from '@/components/distribuicao/form-config-distribuicao'
import type { DistribuicaoModo } from '@/types/database'

export default async function DistribuicaoPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('cargo, organization_id')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'admin' && perfil.cargo !== 'gestor') redirect('/painel')

  const { data: config } = await supabase
    .from('lead_distribution_config')
    .select('modo, apenas_disponiveis, limite_por_vendedor')
    .eq('organization_id', perfil.organization_id)
    .single()

  const configAtual = config ?? {
    modo: 'manual' as DistribuicaoModo,
    apenas_disponiveis: false,
    limite_por_vendedor: null,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Distribuição de Leads</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure como os novos leads são atribuídos aos vendedores automaticamente.
        </p>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <FormConfigDistribuicao config={configAtual} />
      </div>
    </div>
  )
}
