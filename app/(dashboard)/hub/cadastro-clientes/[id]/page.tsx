import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BadgeStatus } from '@/components/cadastro-clientes/badge-status'
import { LinhaDoTempo } from '@/components/cadastro-clientes/linha-do-tempo'
import { FormularioCadastro } from '@/components/cadastro-clientes/formulario-cadastro'
import { DetalheCadastroView } from '@/components/cadastro-clientes/detalhe-cadastro-view'
import { detalheCadastro } from '../actions'

const PERFIS_HUB = ['proprietario_hub', 'assistente']
const EDITAVEL = ['rascunho', 'correcao_solicitada']

export default async function CadastroHubDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('profiles').select('cargo').eq('id', user.id).single()
  if (!perfil) redirect('/login')
  if (!PERFIS_HUB.includes(perfil.cargo)) redirect('/painel')

  let detalhe
  try {
    detalhe = await detalheCadastro(id)
  } catch {
    notFound()
  }
  const c = detalhe.cadastro
  const editavel = EDITAVEL.includes(c.status)

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      <div>
        <Link href="/hub/cadastro-clientes" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Cadastro de Clientes
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">
            {c.nome_completo || c.razao_social || 'Pré-cadastro'}
          </h1>
          <BadgeStatus status={c.status} />
        </div>
      </div>

      {c.status === 'correcao_solicitada' && c.observacao_correcao && (
        <div className="flex gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div><p className="font-medium">Correção solicitada pela Indústria</p><p className="mt-0.5">{c.observacao_correcao}</p></div>
        </div>
      )}
      {c.status === 'reprovado' && c.motivo_reprovacao && (
        <div className="flex gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div><p className="font-medium">Cadastro reprovado</p><p className="mt-0.5">{c.motivo_reprovacao}</p></div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {editavel ? <FormularioCadastro detalhe={detalhe} /> : <DetalheCadastroView detalhe={detalhe} />}
        </div>
        <div>
          <Card className="lg:sticky lg:top-4">
            <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
            <CardContent><LinhaDoTempo eventos={detalhe.eventos} /></CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
