import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TabelaLeads } from '@/components/leads/tabela-leads'
import { ModalNovoLead } from '@/components/leads/modal-novo-lead'
import { Paginacao } from '@/components/ui/paginacao'
import type { Lead, Profile } from '@/types/database'

type SearchParams = Promise<{
  busca?: string
  status?: string
  origem?: string
  responsavel?: string
  pagina?: string
}>

const POR_PAGINA = 50

export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const params = await searchParams

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const pagina = Math.max(1, parseInt(params.pagina ?? '1', 10) || 1)
  const from = (pagina - 1) * POR_PAGINA
  const to = from + POR_PAGINA - 1

  let query = supabase
    .from('leads')
    .select('*, responsavel:profiles!responsavel_id(id, nome)', { count: 'exact' })
    .eq('organization_id', perfil.organization_id)
    .order('criado_em', { ascending: false })
    .range(from, to)

  if (perfil.cargo === 'vendedor') query = query.eq('responsavel_id', perfil.id)
  if (params.status) query = query.eq('status', params.status)
  if (params.origem) query = query.eq('origem', params.origem)
  if (params.responsavel) query = query.eq('responsavel_id', params.responsavel)
  if (params.busca) {
    const termo = params.busca.replace(/[%_\\]/g, '\\$&')
    query = query.or(
      `nome.ilike.%${termo}%,telefone.ilike.%${termo}%,email.ilike.%${termo}%`
    )
  }

  const { data: leads, count } = await query as { data: (Lead & { responsavel: Pick<Profile, 'id' | 'nome'> | null })[] | null; count: number | null }

  const { data: responsaveis } = await supabase
    .from('profiles')
    .select('id, nome')
    .eq('organization_id', perfil.organization_id)
    .eq('ativo', true)
    .order('nome') as { data: Pick<Profile, 'id' | 'nome'>[] | null }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gerencie os leads e acompanhe o progresso de cada um.
          </p>
        </div>
        <ModalNovoLead responsaveis={responsaveis ?? []} />
      </div>

      <TabelaLeads leads={leads ?? []} responsaveis={responsaveis ?? []} />

      <Paginacao
        paginaAtual={pagina}
        totalRegistros={count ?? 0}
        porPagina={POR_PAGINA}
        baseUrl="/leads"
        searchParams={params as Record<string, string | undefined>}
      />
    </div>
  )
}
