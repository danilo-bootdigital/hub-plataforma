import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TabelaOrcamentos } from '@/components/orcamentos/tabela-orcamentos'
import { Paginacao } from '@/components/ui/paginacao'
import { Plus } from 'lucide-react'
import type { QuoteStatus } from '@/types/database'

type SearchParams = Promise<{
  pagina?: string
}>

const POR_PAGINA = 50

export default async function OrcamentosPage({ searchParams }: { searchParams: SearchParams }) {
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
    .from('quotes')
    .select(`
      id, numero, status, valor_total, criado_em, contato_id,
      responsavel:profiles!responsavel_id(nome),
      lead:leads!lead_id(nome),
      deal:deals!deal_id(titulo)
    `, { count: 'exact' })
    .eq('organization_id', perfil.organization_id)
    .order('criado_em', { ascending: false })
    .range(from, to)

  if (perfil.cargo === 'vendedor') {
    query = query.eq('responsavel_id', perfil.id)
  }

  const { data: orcamentosRaw, count } = await query

  // Buscar nomes dos contatos vinculados
  const contatoIds = (orcamentosRaw ?? [])
    .map((o) => o.contato_id as string | null)
    .filter((id): id is string => !!id)
  const uniqueContatoIds = [...new Set(contatoIds)]

  let contatosMap: Record<string, string> = {}
  if (uniqueContatoIds.length > 0) {
    const { data: contatosData } = await supabase
      .from('contacts')
      .select('id, nome')
      .in('id', uniqueContatoIds)
    if (contatosData) {
      contatosMap = Object.fromEntries(contatosData.map((c) => [c.id, c.nome]))
    }
  }

  const orcamentos = (orcamentosRaw ?? []).map((o) => ({
    id: o.id as string,
    numero: o.numero as number,
    status: o.status as QuoteStatus,
    valor_total: o.valor_total as number,
    criado_em: o.criado_em as string,
    responsavel: (Array.isArray(o.responsavel) ? o.responsavel[0] : o.responsavel) as { nome: string } | null,
    lead: (Array.isArray(o.lead) ? o.lead[0] : o.lead) as { nome: string | null } | null,
    contato: (o.contato_id && contatosMap[o.contato_id as string]) ? { nome: contatosMap[o.contato_id as string] } : null,
    deal: (Array.isArray(o.deal) ? o.deal[0] : o.deal) as { titulo: string } | null,
  }))

  const podeCriar = perfil.cargo !== 'atendimento'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orçamentos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Propostas comerciais vinculadas a leads e negociações.
          </p>
        </div>
        {podeCriar && (
          <Link href="/orcamentos/novo">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Novo orçamento
            </Button>
          </Link>
        )}
      </div>
      <TabelaOrcamentos orcamentos={orcamentos} />

      <Paginacao
        paginaAtual={pagina}
        totalRegistros={count ?? 0}
        porPagina={POR_PAGINA}
        baseUrl="/orcamentos"
        searchParams={params as Record<string, string | undefined>}
      />
    </div>
  )
}
