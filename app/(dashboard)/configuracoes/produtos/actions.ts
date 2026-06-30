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
  // Características do Produto (todos opcionais; vazio => null)
  const apresentacao = (formData.get('apresentacao') as string)?.trim() || null
  const via_administracao = (formData.get('via_administracao') as string)?.trim() || null
  const via_apresentacao = (formData.get('via_apresentacao') as string)?.trim() || null
  const volume = (formData.get('volume') as string)?.trim() || null
  const aplicadores = (formData.get('aplicadores') as string)?.trim() || null
  const observacoes_receita = (formData.get('observacoes_receita') as string)?.trim() || null
  const exige_receita = formData.get('exige_receita') === 'on'
  const qtdRaw = (formData.get('quantidade_por_caixa') as string)?.trim()
  const qtdNum = qtdRaw ? parseInt(qtdRaw, 10) : NaN
  const quantidade_por_caixa = Number.isInteger(qtdNum) && qtdNum > 0 ? qtdNum : null
  const valorCaixaRaw = (formData.get('valor_caixa') as string)?.trim()
  const valorCaixaNum = valorCaixaRaw ? parseFloat(valorCaixaRaw) : NaN
  const valor_caixa = Number.isFinite(valorCaixaNum) && valorCaixaNum >= 0 ? valorCaixaNum : null
  // Catálogo oficial (DEC-012) — aditivo; legado supplier_id/category_id preservado.
  const portfolio_id = (formData.get('portfolio_id') as string)?.trim() || null
  const categoria_id = (formData.get('categoria_id') as string)?.trim() || null
  const subcategoria_id = (formData.get('subcategoria_id') as string)?.trim() || null

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
    portfolio_id: portfolio_id === '__none__' ? null : portfolio_id,
    categoria_id: categoria_id === '__none__' ? null : categoria_id,
    subcategoria_id: subcategoria_id === '__none__' ? null : subcategoria_id,
    apresentacao,
    via_administracao,
    via_apresentacao,
    volume,
    quantidade_por_caixa,
    valor_caixa,
    aplicadores,
    exige_receita,
    observacoes_receita,
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
  // Características do Produto (todos opcionais; vazio => null)
  const apresentacao = (formData.get('apresentacao') as string)?.trim() || null
  const via_administracao = (formData.get('via_administracao') as string)?.trim() || null
  const via_apresentacao = (formData.get('via_apresentacao') as string)?.trim() || null
  const volume = (formData.get('volume') as string)?.trim() || null
  const aplicadores = (formData.get('aplicadores') as string)?.trim() || null
  const observacoes_receita = (formData.get('observacoes_receita') as string)?.trim() || null
  const exige_receita = formData.get('exige_receita') === 'on'
  const qtdRaw = (formData.get('quantidade_por_caixa') as string)?.trim()
  const qtdNum = qtdRaw ? parseInt(qtdRaw, 10) : NaN
  const quantidade_por_caixa = Number.isInteger(qtdNum) && qtdNum > 0 ? qtdNum : null
  const valorCaixaRaw = (formData.get('valor_caixa') as string)?.trim()
  const valorCaixaNum = valorCaixaRaw ? parseFloat(valorCaixaRaw) : NaN
  const valor_caixa = Number.isFinite(valorCaixaNum) && valorCaixaNum >= 0 ? valorCaixaNum : null
  // Catálogo oficial (DEC-012) — aditivo; legado supplier_id/category_id preservado.
  const portfolio_id = (formData.get('portfolio_id') as string)?.trim() || null
  const categoria_id = (formData.get('categoria_id') as string)?.trim() || null
  const subcategoria_id = (formData.get('subcategoria_id') as string)?.trim() || null

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
      portfolio_id: portfolio_id === '__none__' ? null : portfolio_id,
      categoria_id: categoria_id === '__none__' ? null : categoria_id,
      subcategoria_id: subcategoria_id === '__none__' ? null : subcategoria_id,
      apresentacao,
      via_administracao,
      via_apresentacao,
      volume,
      quantidade_por_caixa,
      valor_caixa,
      aplicadores,
      exige_receita,
      observacoes_receita,
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
