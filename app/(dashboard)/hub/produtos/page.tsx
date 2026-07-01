import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProdutosConsulta } from '@/components/hub/produtos-consulta'
import { listarProdutosHub, filtrosProdutosHub } from './actions'

const PERFIS_PERMITIDOS = ['proprietario_hub', 'assistente', 'admin', 'gestor', 'financeiro']
const PAGINA = 25

export default async function ProdutosHubPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles').select('cargo').eq('id', user.id).single()
  if (!perfil) redirect('/login')
  if (!PERFIS_PERMITIDOS.includes(perfil.cargo)) redirect('/painel')

  // Carga inicial server-side (primeira página + opções de filtro).
  const [inicial, filtros] = await Promise.all([
    listarProdutosHub({ limit: PAGINA, offset: 0, orderBy: 'nome', orderDir: 'asc' }),
    filtrosProdutosHub(),
  ])

  return (
    <div className="mx-auto w-[90%] max-w-[1600px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Produtos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Consulte os produtos disponíveis nos Portfólios autorizados.
        </p>
      </div>

      <ProdutosConsulta
        pagina={PAGINA}
        inicial={inicial}
        portfolios={filtros.portfolios}
        categorias={filtros.categorias}
      />
    </div>
  )
}
