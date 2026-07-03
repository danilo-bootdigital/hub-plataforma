import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getValidacaoDetalhe } from '../actions'
import { PreviewReceita } from '../preview-receita'
import { PainelResultado } from '../painel-resultado'

const PERFIS_PERMITIDOS = ['proprietario_hub', 'assistente']

export default async function ValidacaoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('profiles').select('cargo').eq('id', user.id).single()
  if (!perfil) redirect('/login')
  if (!PERFIS_PERMITIDOS.includes(perfil.cargo)) redirect('/painel')

  const v = await getValidacaoDetalhe(id)
  if (!v) notFound()

  return (
    <div className="mx-auto w-[92%] max-w-[1400px] space-y-5">
      <div>
        <Link href="/hub/validacao-receita" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="size-4" /> Validações
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Resultado da Validação</h1>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <PreviewReceita url={v.arquivoUrl} tipo={v.arquivo_tipo} nome={v.arquivo_nome} />
        <PainelResultado detalhe={v} />
      </div>
    </div>
  )
}
