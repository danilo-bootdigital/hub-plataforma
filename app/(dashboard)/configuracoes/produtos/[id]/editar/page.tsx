import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { FormProduto } from '@/components/produtos/form-produto'
import type { Product } from '@/types/database'

export default async function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  const { data: produto } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)
    .single() as unknown as { data: Product | null }

  if (!produto) notFound()

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
    <FormProduto
      produto={produto}
      portfolios={(portfolios ?? []) as { id: string; nome: string }[]}
      categoriasCatalogo={(categoriasCatalogo ?? []) as { id: string; nome: string; portfolio_id: string }[]}
      subcategorias={(subcategorias ?? []) as { id: string; nome: string; categoria_id: string }[]}
    />
  )
}
