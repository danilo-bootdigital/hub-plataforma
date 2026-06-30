import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { FormImportacaoPortfolio } from '@/components/portfolios/form-importacao-portfolio'
import type { CategoriaComSubs } from '@/components/portfolios/gerenciar-categorias'
import type { Portfolio } from '@/types/database'

export default async function ImportarPortfolioPage({ params }: { params: Promise<{ id: string }> }) {
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

  // Categorias/subcategorias existentes — alimentam a resolução de pendências.
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/configuracoes/portfolios/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Importar produtos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Portfólio <span className="font-medium text-slate-700">{portfolio.nome}</span> — envie uma planilha XLSX ou CSV.
          </p>
        </div>
      </div>

      <FormImportacaoPortfolio
        portfolioId={portfolio.id}
        portfolioNome={portfolio.nome}
        categorias={categoriasComSubs}
      />
    </div>
  )
}
