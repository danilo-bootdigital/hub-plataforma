import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TabelaCadastros } from '@/components/cadastro-clientes/tabela-cadastros'
import { listarCadastros } from './actions'

const PERFIS_HUB = ['proprietario_hub', 'assistente']

export default async function CadastroClientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('profiles').select('cargo').eq('id', user.id).single()
  if (!perfil) redirect('/login')
  if (!PERFIS_HUB.includes(perfil.cargo)) redirect('/painel')

  const inicial = await listarCadastros({ limit: 25, offset: 0 })

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cadastro de Clientes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Pré-cadastre clientes e envie a documentação para análise da Indústria.
          </p>
        </div>
        <Link href="/hub/cadastro-clientes/novo">
          <Button><Plus className="mr-1.5 h-4 w-4" /> Novo Cadastro</Button>
        </Link>
      </div>

      <TabelaCadastros modo="hub" inicial={inicial} baseHref="/hub/cadastro-clientes" />
    </div>
  )
}
