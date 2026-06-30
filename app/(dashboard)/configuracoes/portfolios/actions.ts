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

// ── Autorização Hub ↔ Portfólio (regra operacional separada — DEC-012) ───
// Concedida/revogada apenas pela Indústria (admin/gestor). Por Portfólio (não por Produto).

export async function autorizarHubPortfolio(hubId: string, portfolioId: string) {
  const { supabase, perfil } = await getAdminOuGestor()

  const { data: hub } = await supabase
    .from('hubs').select('id').eq('id', hubId).eq('organization_id', perfil.organization_id).single()
  if (!hub) throw new Error('Hub não encontrado.')

  const { data: pf } = await supabase
    .from('portfolios').select('id').eq('id', portfolioId).eq('organization_id', perfil.organization_id).single()
  if (!pf) throw new Error('Portfólio não encontrado.')

  const { error } = await supabase
    .from('hub_portfolios')
    .upsert(
      {
        organization_id: perfil.organization_id,
        hub_id: hubId,
        portfolio_id: portfolioId,
        status: 'ativo',
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: 'hub_id,portfolio_id' }
    )
  if (error) throw new Error(`Erro ao autorizar: ${error.message}`)
  revalidatePath(`/configuracoes/portfolios/${portfolioId}`)
  revalidatePath(`/configuracoes/hubs/${hubId}`)
}

export async function revogarHubPortfolio(hubId: string, portfolioId: string) {
  const { supabase, perfil } = await getAdminOuGestor()

  // Revogar preserva o registro (status), não apaga (DEC-012).
  const { error } = await supabase
    .from('hub_portfolios')
    .update({ status: 'revogado', atualizado_em: new Date().toISOString() })
    .eq('hub_id', hubId)
    .eq('portfolio_id', portfolioId)
    .eq('organization_id', perfil.organization_id)
  if (error) throw new Error(`Erro ao revogar: ${error.message}`)
  revalidatePath(`/configuracoes/portfolios/${portfolioId}`)
  revalidatePath(`/configuracoes/hubs/${hubId}`)
}

// ── Importação de Produtos para um Portfólio (DEC-013 / DEC-014) ──────────
// Acesso ao vínculo N:N só via RPC `importar_produtos_portfolio` (SECURITY
// DEFINER). A RPC é atômica (100% ou 0%), cria Produtos por dedup de nome, mas
// NÃO cria Categorias/Subcategorias (citação inexistente vira pendência) e
// NÃO usa products.portfolio_id.

// Uma linha da planilha já mapeada (parser do browser normaliza os dados).
export type LinhaImportacaoPortfolio = {
  nome: string
  preco: string | number
  descricao?: string
  categoria?: string
  subcategoria?: string
  valor_caixa?: string | number
  unidade?: string
  volume?: string
  quantidade_por_caixa?: string | number
  apresentacao?: string
  via_administracao?: string
  via_apresentacao?: string
  aplicadores?: string
  exige_receita?: string | boolean
  observacoes_receita?: string
}

export type ModoImportacao = 'atualizar' | 'preservar'
type MapaResolucao = Record<string, string>

async function chamarRpcImportacao(
  portfolioId: string,
  linhas: LinhaImportacaoPortfolio[],
  modo: ModoImportacao,
  dryRun: boolean,
  mapaCategorias: MapaResolucao,
  mapaSubcategorias: MapaResolucao
) {
  const { supabase } = await getAdminOuGestor()

  if (!linhas || linhas.length === 0) throw new Error('Nenhuma linha para importar.')
  if (linhas.length > 5000) throw new Error('Máximo de 5000 linhas por importação.')

  const { data, error } = await supabase.rpc('importar_produtos_portfolio', {
    p_portfolio_id: portfolioId,
    p_linhas: linhas,
    p_modo: modo,
    p_dry_run: dryRun,
    p_mapa_categorias: mapaCategorias,
    p_mapa_subcategorias: mapaSubcategorias,
  })

  if (error) throw new Error(`Erro na importação: ${error.message}`)
  return data
}

// Preview (dry-run): valida tudo, classifica e reporta erros/pendências; não persiste.
export async function previewImportacaoPortfolio(
  portfolioId: string,
  linhas: LinhaImportacaoPortfolio[],
  modo: ModoImportacao = 'atualizar',
  mapaCategorias: MapaResolucao = {},
  mapaSubcategorias: MapaResolucao = {}
) {
  return chamarRpcImportacao(portfolioId, linhas, modo, true, mapaCategorias, mapaSubcategorias)
}

// Aplicar: importação atômica (só executa se não houver erro nem pendência).
export async function importarProdutosParaPortfolio(
  portfolioId: string,
  linhas: LinhaImportacaoPortfolio[],
  modo: ModoImportacao = 'atualizar',
  mapaCategorias: MapaResolucao = {},
  mapaSubcategorias: MapaResolucao = {}
) {
  const resultado = await chamarRpcImportacao(portfolioId, linhas, modo, false, mapaCategorias, mapaSubcategorias)
  revalidatePath(`/configuracoes/portfolios/${portfolioId}`)
  revalidatePath('/configuracoes/produtos')
  return resultado
}
