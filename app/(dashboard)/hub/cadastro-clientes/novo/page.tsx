import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { FormularioCadastro } from '@/components/cadastro-clientes/formulario-cadastro'

const PERFIS_HUB = ['proprietario_hub', 'assistente']

export default async function NovoCadastroPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('profiles').select('cargo').eq('id', user.id).single()
  if (!perfil) redirect('/login')
  if (!PERFIS_HUB.includes(perfil.cargo)) redirect('/painel')

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6 lg:w-[70%]">
      <div>
        <Link href="/hub/cadastro-clientes" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Cadastro de Clientes
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Novo Pré-cadastro</h1>
        <p className="mt-1 text-sm text-slate-500">
          Escolha o tipo de pessoa, preencha os dados e salve o rascunho para anexar os documentos.
        </p>
      </div>

      <FormularioCadastro />
    </div>
  )
}
