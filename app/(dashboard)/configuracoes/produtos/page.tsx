import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TabelaProdutos } from '@/components/produtos/tabela-produtos'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Produtos e Serviços</h1>
          <p className="mt-1 text-sm text-slate-500">
            Catálogo de produtos para uso nos orçamentos.
          </p>
        </div>
        <Link href="/configuracoes/produtos/novo" className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5')}>
          <Plus className="h-4 w-4" />
          Novo Produto
        </Link>
      </div>
      <TabelaProdutos
        produtos={produtos ?? []}
        portfolios={(portfolios ?? []) as { id: string; nome: string }[]}
      />
    </div>
  )
}
