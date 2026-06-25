import { createClient } from '@/lib/supabase/server'
import { TabelaHubs } from '@/components/hubs-de-saude/tabela-hubs'
import { ModalNovoHub } from '@/components/hubs-de-saude/modal-novo-hub'
import { ModalEditarHub } from '@/components/hubs-de-saude/modal-editar-hub'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Hub = {
  id: string
  nome: string
  status: string
  logo_url: string | null
  criado_em: string
}

async function listarHubs() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: perfil } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!perfil) return []

  const { data: hubs } = await supabase
    .from('health_hubs')
    .select('id, nome, status, logo_url, criado_em')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  return (hubs ?? []) as Hub[]
}

async function listarFornecedores() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: perfil } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!perfil) return []

  const { data: fornecedores } = await supabase
    .from('suppliers')
    .select('id, nome, hub_id')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  return fornecedores ?? []
}

export default async function HubsDeSaudePage() {
  const [hubs, fornecedores] = await Promise.all([
    listarHubs(),
    listarFornecedores(),
  ])

  // Contar fornecedores por hub
  const fornecedoresPorHub = fornecedores.reduce((acc, f) => {
    if (f.hub_id) {
      acc[f.hub_id] = (acc[f.hub_id] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hubs de Saúde</h1>
          <p className="text-sm text-slate-500">
            Gerencie os hubs de saúde parceiros vinculados aos seus fornecedores.
          </p>
        </div>
        <ModalNovoHub />
      </div>

      <TabelaHubs
        hubs={hubs}
        fornecedoresPorHub={fornecedoresPorHub}
      />
    </div>
  )
}
