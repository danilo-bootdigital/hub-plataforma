import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FormProduto } from '@/components/produtos/form-produto'

export default async function NovoProdutoPage() {
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
      portfolios={(portfolios ?? []) as { id: string; nome: string }[]}
      categoriasCatalogo={(categoriasCatalogo ?? []) as { id: string; nome: string; portfolio_id: string }[]}
      subcategorias={(subcategorias ?? []) as { id: string; nome: string; categoria_id: string }[]}
    />
  )
}
