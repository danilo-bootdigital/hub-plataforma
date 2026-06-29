import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { AutorizacaoPortfolios } from '@/components/portfolios/autorizacao-portfolios'

export default async function HubPortfoliosPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: hub } = await supabase
    .from('hubs')
    .select('id, nome')
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!hub) notFound()

  // Portfólios da Indústria + autorizações ativas deste Hub.
  const { data: portfolios } = await supabase
    .from('portfolios')
    .select('id, nome')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  const { data: autorizacoes } = await supabase
    .from('hub_portfolios')
    .select('portfolio_id')
    .eq('hub_id', id)
    .eq('organization_id', perfil.organization_id)
    .eq('status', 'ativo')

  const portfoliosAutorizados = (autorizacoes ?? []).map((a) => a.portfolio_id)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/configuracoes/hubs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{hub.nome}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Portfólios que este Hub está autorizado a operar. O Assistente herda as autorizações do Hub.
          </p>
        </div>
      </div>

      <AutorizacaoPortfolios
        eixo="porHub"
        fixedId={hub.id}
        itens={(portfolios ?? []) as { id: string; nome: string }[]}
        autorizados={portfoliosAutorizados}
      />
    </div>
  )
}
