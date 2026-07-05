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

  // Full width: a tela ocupa toda a largura útil (o padding vem do <main> do layout).
  // -m-5/-m-6 anula o padding do main para a tabela encostar nas bordas úteis, e o
  // componente reaplica um padding horizontal de 24px controlado.
  return (
    <div className="-m-5 h-[calc(100%+2.5rem)] md:-m-6 md:h-[calc(100%+3rem)]">
      <ProdutosConsulta
        pagina={PAGINA}
        inicial={inicial}
        portfolios={filtros.portfolios}
        categorias={filtros.categorias}
      />
    </div>
  )
}
