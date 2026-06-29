import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { TabelaPortfolios } from '@/components/portfolios/tabela-portfolios'
import { ModalNovoPortfolio } from '@/components/portfolios/modal-novo-portfolio'
import type { Portfolio } from '@/types/database'

export default async function PortfoliosPage() {
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

  const { data: portfolios } = await supabase
    .from('portfolios')
    .select('*')
    .eq('organization_id', perfil.organization_id)
    .order('nome') as unknown as { data: Portfolio[] | null }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/configuracoes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Portfólios</h1>
            <p className="mt-1 text-sm text-slate-500">
              Agrupamentos comerciais de produtos da Indústria.
            </p>
          </div>
        </div>
        <ModalNovoPortfolio />
      </div>
      <TabelaPortfolios portfolios={portfolios ?? []} />
    </div>
  )
}
