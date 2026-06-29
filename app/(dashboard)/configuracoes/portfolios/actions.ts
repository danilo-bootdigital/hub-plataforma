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
    throw new Error('Apenas administradores e gestores podem gerenciar portfólios.')
  }
  return { supabase, perfil }
}

export async function criarPortfolio(formData: FormData) {
  const { supabase, perfil } = await getAdminOuGestor()

  const nome = (formData.get('nome') as string)?.trim()
  const descricao = (formData.get('descricao') as string)?.trim() || null

  if (!nome) throw new Error('Nome é obrigatório.')

  const { error } = await supabase.from('portfolios').insert({
    organization_id: perfil.organization_id,
    nome,
    descricao,
  })

  if (error) {
    if (error.code === '23505') throw new Error('Já existe um portfólio com este nome.')
    throw new Error(`Erro ao criar portfólio: ${error.message}`)
  }
  revalidatePath('/configuracoes/portfolios')
}

export async function editarPortfolio(portfolioId: string, formData: FormData) {
  const { supabase, perfil } = await getAdminOuGestor()

  const nome = (formData.get('nome') as string)?.trim()
  const descricao = (formData.get('descricao') as string)?.trim() || null

  if (!nome) throw new Error('Nome é obrigatório.')

  const { error } = await supabase
    .from('portfolios')
    .update({ nome, descricao, atualizado_em: new Date().toISOString() })
    .eq('id', portfolioId)
    .eq('organization_id', perfil.organization_id)

  if (error) {
    if (error.code === '23505') throw new Error('Já existe um portfólio com este nome.')
    throw new Error(`Erro ao editar portfólio: ${error.message}`)
  }
  revalidatePath('/configuracoes/portfolios')
}

export async function alternarAtivoPortfolio(portfolioId: string, ativo: boolean) {
  const { supabase, perfil } = await getAdminOuGestor()

  const { error } = await supabase
    .from('portfolios')
    .update({ ativo, atualizado_em: new Date().toISOString() })
    .eq('id', portfolioId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao alterar status: ${error.message}`)
  revalidatePath('/configuracoes/portfolios')
}

export async function excluirPortfolio(portfolioId: string) {
  const { supabase, perfil } = await getAdminOuGestor()

  // Bloquear exclusão se houver Produtos vinculados (preferir inativar).
  const { count: produtosVinculados } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('portfolio_id', portfolioId)
    .eq('organization_id', perfil.organization_id)

  if (produtosVinculados && produtosVinculados > 0) {
    throw new Error(`Não é possível excluir: ${produtosVinculados} produto(s) vinculado(s). Inative o portfólio.`)
  }

  // Bloquear se houver Categorias vinculadas.
  const { count: categoriasVinculadas } = await supabase
    .from('categorias')
    .select('id', { count: 'exact', head: true })
    .eq('portfolio_id', portfolioId)
    .eq('organization_id', perfil.organization_id)

  if (categoriasVinculadas && categoriasVinculadas > 0) {
    throw new Error(`Não é possível excluir: ${categoriasVinculadas} categoria(s) vinculada(s).`)
  }

  // Remover autorizações Hub↔Portfólio antes de excluir o portfólio.
  await supabase
    .from('hub_portfolios')
    .delete()
    .eq('portfolio_id', portfolioId)
    .eq('organization_id', perfil.organization_id)

  const { error } = await supabase
    .from('portfolios')
    .delete()
    .eq('id', portfolioId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao excluir portfólio: ${error.message}`)
  revalidatePath('/configuracoes/portfolios')
}

// ── Categorias (dentro de um Portfólio) ──────────────────────────────────

export async function criarCategoria(portfolioId: string, nome: string) {
  const { supabase, perfil } = await getAdminOuGestor()
  if (!nome?.trim()) throw new Error('Nome da categoria é obrigatório.')

  // Garantir que o Portfólio pertence à Indústria do usuário.
  const { data: pf } = await supabase
    .from('portfolios')
    .select('id')
    .eq('id', portfolioId)
    .eq('organization_id', perfil.organization_id)
    .single()
  if (!pf) throw new Error('Portfólio não encontrado.')

  const { error } = await supabase.from('categorias').insert({
    organization_id: perfil.organization_id,
    portfolio_id: portfolioId,
    nome: nome.trim(),
  })
  if (error) throw new Error(`Erro ao criar categoria: ${error.message}`)
  revalidatePath(`/configuracoes/portfolios/${portfolioId}`)
}

export async function editarCategoria(categoriaId: string, portfolioId: string, nome: string) {
  const { supabase, perfil } = await getAdminOuGestor()
  if (!nome?.trim()) throw new Error('Nome da categoria é obrigatório.')

  const { error } = await supabase
    .from('categorias')
    .update({ nome: nome.trim() })
    .eq('id', categoriaId)
    .eq('organization_id', perfil.organization_id)
  if (error) throw new Error(`Erro ao editar categoria: ${error.message}`)
  revalidatePath(`/configuracoes/portfolios/${portfolioId}`)
}

export async function alternarAtivoCategoria(categoriaId: string, portfolioId: string, ativo: boolean) {
  const { supabase, perfil } = await getAdminOuGestor()
  const { error } = await supabase
    .from('categorias')
    .update({ ativo })
    .eq('id', categoriaId)
    .eq('organization_id', perfil.organization_id)
  if (error) throw new Error(`Erro ao alterar status: ${error.message}`)
  revalidatePath(`/configuracoes/portfolios/${portfolioId}`)
}

export async function excluirCategoria(categoriaId: string, portfolioId: string) {
  const { supabase, perfil } = await getAdminOuGestor()

  const { count: subs } = await supabase
    .from('subcategorias')
    .select('id', { count: 'exact', head: true })
    .eq('categoria_id', categoriaId)
    .eq('organization_id', perfil.organization_id)
  if (subs && subs > 0) {
    throw new Error(`Não é possível excluir: ${subs} subcategoria(s) vinculada(s).`)
  }

  const { count: produtos } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('categoria_id', categoriaId)
    .eq('organization_id', perfil.organization_id)
  if (produtos && produtos > 0) {
    throw new Error(`Não é possível excluir: ${produtos} produto(s) vinculado(s).`)
  }

  const { error } = await supabase
    .from('categorias')
    .delete()
    .eq('id', categoriaId)
    .eq('organization_id', perfil.organization_id)
  if (error) throw new Error(`Erro ao excluir categoria: ${error.message}`)
  revalidatePath(`/configuracoes/portfolios/${portfolioId}`)
}

// ── Subcategorias (dentro de uma Categoria) ──────────────────────────────

export async function criarSubcategoria(categoriaId: string, portfolioId: string, nome: string) {
  const { supabase, perfil } = await getAdminOuGestor()
  if (!nome?.trim()) throw new Error('Nome da subcategoria é obrigatório.')

  const { data: cat } = await supabase
    .from('categorias')
    .select('id')
    .eq('id', categoriaId)
    .eq('organization_id', perfil.organization_id)
    .single()
  if (!cat) throw new Error('Categoria não encontrada.')

  const { error } = await supabase.from('subcategorias').insert({
    organization_id: perfil.organization_id,
    categoria_id: categoriaId,
    nome: nome.trim(),
  })
  if (error) throw new Error(`Erro ao criar subcategoria: ${error.message}`)
  revalidatePath(`/configuracoes/portfolios/${portfolioId}`)
}

export async function editarSubcategoria(subcategoriaId: string, portfolioId: string, nome: string) {
  const { supabase, perfil } = await getAdminOuGestor()
  if (!nome?.trim()) throw new Error('Nome da subcategoria é obrigatório.')

  const { error } = await supabase
    .from('subcategorias')
    .update({ nome: nome.trim() })
    .eq('id', subcategoriaId)
    .eq('organization_id', perfil.organization_id)
  if (error) throw new Error(`Erro ao editar subcategoria: ${error.message}`)
  revalidatePath(`/configuracoes/portfolios/${portfolioId}`)
}

export async function alternarAtivoSubcategoria(subcategoriaId: string, portfolioId: string, ativo: boolean) {
  const { supabase, perfil } = await getAdminOuGestor()
  const { error } = await supabase
    .from('subcategorias')
    .update({ ativo })
    .eq('id', subcategoriaId)
    .eq('organization_id', perfil.organization_id)
  if (error) throw new Error(`Erro ao alterar status: ${error.message}`)
  revalidatePath(`/configuracoes/portfolios/${portfolioId}`)
}

export async function excluirSubcategoria(subcategoriaId: string, portfolioId: string) {
  const { supabase, perfil } = await getAdminOuGestor()

  const { count: produtos } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('subcategoria_id', subcategoriaId)
    .eq('organization_id', perfil.organization_id)
  if (produtos && produtos > 0) {
    throw new Error(`Não é possível excluir: ${produtos} produto(s) vinculado(s).`)
  }

  const { error } = await supabase
    .from('subcategorias')
    .delete()
    .eq('id', subcategoriaId)
    .eq('organization_id', perfil.organization_id)
  if (error) throw new Error(`Erro ao excluir subcategoria: ${error.message}`)
  revalidatePath(`/configuracoes/portfolios/${portfolioId}`)
}
