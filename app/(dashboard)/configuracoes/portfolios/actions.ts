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
