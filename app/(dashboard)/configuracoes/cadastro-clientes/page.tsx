import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TabelaCadastros } from '@/components/cadastro-clientes/tabela-cadastros'
import { listarCadastros } from '@/app/(dashboard)/hub/cadastro-clientes/actions'
import { filtrosIndustria } from './actions'

const PERFIS_INDUSTRIA = ['admin', 'gestor']

export default async function CadastroClientesIndustriaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('profiles').select('cargo').eq('id', user.id).single()
  if (!perfil) redirect('/login')
  if (!PERFIS_INDUSTRIA.includes(perfil.cargo)) redirect('/painel')

  const [inicial, filtros] = await Promise.all([
    listarCadastros({ limit: 25, offset: 0 }),
    filtrosIndustria(),
  ])

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cadastro de Clientes</h1>
        <p className="mt-1 text-sm text-slate-500">
          Analise os pré-cadastros enviados pelos Hubs: aprove, reprove ou solicite correções.
        </p>
      </div>

      <TabelaCadastros
        modo="industria"
        inicial={inicial}
        baseHref="/configuracoes/cadastro-clientes"
        hubs={filtros.hubs}
      />
    </div>
  )
}
