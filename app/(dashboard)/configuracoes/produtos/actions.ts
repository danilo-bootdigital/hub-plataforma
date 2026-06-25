'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function getAdminOuGestor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()
  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'admin' && perfil.cargo !== 'gestor') {
    throw new Error('Apenas administradores e gestores podem gerenciar produtos.')
  }
  return { supabase, perfil }
}

export async function criarProduto(formData: FormData) {
  const { supabase, perfil } = await getAdminOuGestor()

  const nome = (formData.get('nome') as string)?.trim()
  const descricao = (formData.get('descricao') as string)?.trim() || null
  const preco_unitario = parseFloat(formData.get('preco_unitario') as string) || 0
  const unidade = (formData.get('unidade') as string)?.trim() || 'un'
  const supplier_id = (formData.get('supplier_id') as string)?.trim() || null
  const category_id = (formData.get('category_id') as string)?.trim() || null
  const mg = (formData.get('mg') as string)?.trim() || null
  const ml = (formData.get('ml') as string)?.trim() || null

  if (!nome) throw new Error('Nome é obrigatório.')
  if (preco_unitario < 0) throw new Error('Preço não pode ser negativo.')

  const { error } = await supabase.from('products').insert({
    organization_id: perfil.organization_id,
    nome,
    descricao,
    preco_unitario,
    unidade,
    supplier_id: supplier_id || null,
    category_id: category_id === '__none__' ? null : category_id,
    composicao: mg,
    apresentacao: ml,
  })

  if (error) throw new Error(`Erro ao criar produto: ${error.message}`)
  revalidatePath('/configuracoes/produtos')
}

export async function editarProduto(produtoId: string, formData: FormData) {
  const { supabase, perfil } = await getAdminOuGestor()

  const nome = (formData.get('nome') as string)?.trim()
  const descricao = (formData.get('descricao') as string)?.trim() || null
  const preco_unitario = parseFloat(formData.get('preco_unitario') as string) || 0
  const unidade = (formData.get('unidade') as string)?.trim() || 'un'
  const supplier_id = (formData.get('supplier_id') as string)?.trim() || null
  const category_id = (formData.get('category_id') as string)?.trim() || null
  const mg = (formData.get('mg') as string)?.trim() || null
  const ml = (formData.get('ml') as string)?.trim() || null

  if (!nome) throw new Error('Nome é obrigatório.')
  if (preco_unitario < 0) throw new Error('Preço não pode ser negativo.')

  const { error } = await supabase
    .from('products')
    .update({
      nome,
      descricao,
      preco_unitario,
      unidade,
      supplier_id: supplier_id || null,
      category_id: category_id === '__none__' ? null : category_id,
      composicao: mg,
      apresentacao: ml,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', produtoId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao editar produto: ${error.message}`)
  revalidatePath('/configuracoes/produtos')
}

export async function alternarAtivoProduto(produtoId: string, ativo: boolean) {
  const { supabase, perfil } = await getAdminOuGestor()

  const { error } = await supabase
    .from('products')
    .update({ ativo, atualizado_em: new Date().toISOString() })
    .eq('id', produtoId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao alterar status: ${error.message}`)
  revalidatePath('/configuracoes/produtos')
}

export async function excluirProduto(produtoId: string) {
  const { supabase, perfil } = await getAdminOuGestor()

  const { data: produto } = await supabase
    .from('products')
    .select('id')
    .eq('id', produtoId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!produto) throw new Error('Produto não encontrado.')

  await supabase
    .from('quote_items')
    .update({ product_id: null })
    .eq('product_id', produtoId)

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', produtoId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao excluir produto: ${error.message}`)
  revalidatePath('/configuracoes/produtos')
}

export async function excluirProdutosEmLote(produtoIds: string[]) {
  const { supabase, perfil } = await getAdminOuGestor()

  if (produtoIds.length === 0) throw new Error('Nenhum produto selecionado.')

  // Verificar que todos pertencem à organização
  const { data: produtosValidos } = await supabase
    .from('products')
    .select('id')
    .in('id', produtoIds)
    .eq('organization_id', perfil.organization_id)

  const idsValidos = (produtosValidos ?? []).map((p) => p.id)
  if (idsValidos.length === 0) throw new Error('Nenhum produto encontrado.')

  await supabase
    .from('quote_items')
    .update({ product_id: null })
    .in('product_id', idsValidos)

  const { error } = await supabase
    .from('products')
    .delete()
    .in('id', idsValidos)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao excluir produtos: ${error.message}`)
  revalidatePath('/configuracoes/produtos')
}
