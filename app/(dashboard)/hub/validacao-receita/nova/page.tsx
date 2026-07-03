import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { TelaValidacao } from './tela-validacao'

const PERFIS_PERMITIDOS = ['proprietario_hub', 'assistente']

export default async function NovaValidacaoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('profiles').select('cargo').eq('id', user.id).single()
  if (!perfil) redirect('/login')
  if (!PERFIS_PERMITIDOS.includes(perfil.cargo)) redirect('/painel')

  return (
    <div className="mx-auto w-[92%] max-w-[1400px] space-y-5">
      <div>
        <Link href="/hub/validacao-receita" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="size-4" /> Validações
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Validação de Receita</h1>
        <p className="mt-1 text-sm text-slate-500">Anexe a receita, selecione o produto e execute a análise.</p>
      </div>
      <TelaValidacao />
    </div>
  )
}
