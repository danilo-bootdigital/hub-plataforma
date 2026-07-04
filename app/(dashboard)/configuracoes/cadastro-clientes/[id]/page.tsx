import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BadgeStatus } from '@/components/cadastro-clientes/badge-status'
import { LinhaDoTempo } from '@/components/cadastro-clientes/linha-do-tempo'
import { DetalheCadastroView } from '@/components/cadastro-clientes/detalhe-cadastro-view'
import { PainelAnaliseIndustria } from '@/components/cadastro-clientes/painel-analise-industria'
import { detalheCadastro } from '@/app/(dashboard)/hub/cadastro-clientes/actions'

const PERFIS_INDUSTRIA = ['admin', 'gestor']

export default async function CadastroIndustriaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('profiles').select('cargo').eq('id', user.id).single()
  if (!perfil) redirect('/login')
  if (!PERFIS_INDUSTRIA.includes(perfil.cargo)) redirect('/painel')

  let detalhe
  try {
    detalhe = await detalheCadastro(id)
  } catch {
    notFound()
  }
  const c = detalhe.cadastro

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      <div>
        <Link href="/configuracoes/cadastro-clientes" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Cadastro de Clientes
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">
            {c.nome_completo || c.razao_social || 'Pré-cadastro'}
          </h1>
          <BadgeStatus status={c.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <DetalheCadastroView detalhe={detalhe} />
        </div>
        <div className="space-y-6">
          <PainelAnaliseIndustria detalhe={detalhe} />
          <Card className="lg:sticky lg:top-4">
            <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
            <CardContent><LinhaDoTempo eventos={detalhe.eventos} /></CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
