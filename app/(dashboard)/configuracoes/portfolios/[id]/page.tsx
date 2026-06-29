import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { GerenciarCategorias, type CategoriaComSubs } from '@/components/portfolios/gerenciar-categorias'
import { AutorizacaoPortfolios } from '@/components/portfolios/autorizacao-portfolios'
import type { Portfolio } from '@/types/database'

export default async function PortfolioDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'admin' && perfil.cargo !== 'gestor') redirect('/painel')

  const { data: portfolio } = await supabase
    .from('portfolios')
    .select('*')
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)
    .single() as unknown as { data: Portfolio | null }

  if (!portfolio) notFound()

  const { data: categorias } = await supabase
    .from('categorias')
    .select('id, nome, ativo')
    .eq('portfolio_id', id)
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  const catIds = (categorias ?? []).map((c) => c.id)
  const { data: subcategorias } = catIds.length
    ? await supabase
        .from('subcategorias')
        .select('id, nome, ativo, categoria_id')
        .in('categoria_id', catIds)
        .eq('organization_id', perfil.organization_id)
        .order('nome')
    : { data: [] as { id: string; nome: string; ativo: boolean; categoria_id: string }[] }

  const categoriasComSubs: CategoriaComSubs[] = (categorias ?? []).map((c) => ({
    ...c,
    subcategorias: (subcategorias ?? []).filter((s) => s.categoria_id === c.id),
  }))

  // Hubs da Indústria + autorizações ativas deste Portfólio (Fatia C).
  const { data: hubs } = await supabase
    .from('hubs')
    .select('id, nome')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  const { data: autorizacoes } = await supabase
    .from('hub_portfolios')
    .select('hub_id')
    .eq('portfolio_id', id)
    .eq('organization_id', perfil.organization_id)
    .eq('status', 'ativo')

  const hubsAutorizados = (autorizacoes ?? []).map((a) => a.hub_id)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/configuracoes/portfolios">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{portfolio.nome}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {portfolio.descricao || 'Categorias e subcategorias deste portfólio.'}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Classificação</h2>
          <p className="text-sm text-slate-500">Categorias e subcategorias dos produtos deste portfólio.</p>
        </div>
        <GerenciarCategorias portfolioId={portfolio.id} categorias={categoriasComSubs} />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Hubs autorizados</h2>
          <p className="text-sm text-slate-500">
            Hubs autorizados a operar este portfólio. A autorização é concedida pela Indústria; o Assistente herda do Hub.
          </p>
        </div>
        <AutorizacaoPortfolios
          eixo="porPortfolio"
          fixedId={portfolio.id}
          itens={(hubs ?? []) as { id: string; nome: string }[]}
          autorizados={hubsAutorizados}
        />
      </section>
    </div>
  )
}
