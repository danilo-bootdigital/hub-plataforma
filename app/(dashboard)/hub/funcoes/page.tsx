import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FuncoesGerenciar } from '@/components/hub/funcoes-gerenciar'
import { listarFuncoes } from './actions'

export default async function FuncoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles').select('cargo').eq('id', user.id).single()
  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'proprietario_hub') redirect('/painel')

  const funcoes = await listarFuncoes()

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Funções</h1>
        <p className="mt-1 text-sm text-slate-500">
          Defina funções (ex.: Comercial, Financeiro) e as permissões de cada uma. Assistentes recebem uma função e herdam suas permissões.
        </p>
      </div>
      <FuncoesGerenciar inicial={funcoes} />
    </div>
  )
}
