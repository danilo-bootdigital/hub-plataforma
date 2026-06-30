import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TabelaProdutos } from '@/components/produtos/tabela-produtos'
import { ModalNovoProduto } from '@/components/produtos/modal-novo-produto'
import type { Product } from '@/types/database'

export default async function ProdutosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'admin' && perfil.cargo !== 'gestor') redirect('/painel')

  const { data: produtos } = await supabase
    .from('products')
    .select('*')
    .eq('organization_id', perfil.organization_id)
    .order('nome') as unknown as { data: Product[] | null }

  // Catálogo oficial (DEC-012): Portfólio → Categoria → Subcategoria
  const { data: portfolios } = await supabase
    .from('portfolios')
    .select('id, nome')
    .eq('organization_id', perfil.organization_id)
    .eq('ativo', true)
    .order('nome')

  const { data: categoriasCatalogo } = await supabase
    .from('categorias')
    .select('id, nome, portfolio_id')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  const { data: subcategorias } = await supabase
    .from('subcategorias')
    .select('id, nome, categoria_id')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Produtos e Serviços</h1>
          <p className="mt-1 text-sm text-slate-500">
            Catálogo de produtos para uso nos orçamentos.
          </p>
        </div>
        <ModalNovoProduto
          portfolios={(portfolios ?? []) as { id: string; nome: string }[]}
          categoriasCatalogo={(categoriasCatalogo ?? []) as { id: string; nome: string; portfolio_id: string }[]}
          subcategorias={(subcategorias ?? []) as { id: string; nome: string; categoria_id: string }[]}
        />
      </div>
      <TabelaProdutos
        produtos={produtos ?? []}
        portfolios={(portfolios ?? []) as { id: string; nome: string }[]}
        categoriasCatalogo={(categoriasCatalogo ?? []) as { id: string; nome: string; portfolio_id: string }[]}
        subcategorias={(subcategorias ?? []) as { id: string; nome: string; categoria_id: string }[]}
      />
    </div>
  )
}
