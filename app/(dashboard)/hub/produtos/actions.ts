'use server'

import { createClient } from '@/lib/supabase/server'

// Consulta operacional de Produtos do HUB (DEC-013/014). Sem CRUD.
// Toda a autorização por Hub e o server-side (busca/filtros/ordenação/paginação)
// vivem nas RPCs SECURITY DEFINER; aqui apenas repassamos.

export type FiltrosProdutosHub = {
  busca?: string
  categoriaId?: string | null
  portfolioId?: string | null
  status?: 'ativo' | 'inativo' | null
  orderBy?: string
  orderDir?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export type LinhaProdutoHub = {
  vinculo_id: string
  product_id: string
  portfolio_id: string
  nome: string
  descricao: string | null
  composicao: string | null
  categoria: string | null
  subcategoria: string | null
  portfolio: string
  apresentacao: string | null
  via_administracao: string | null
  via_apresentacao: string | null
  volume: string | null
  unidade: string | null
  quantidade_por_caixa: number | null
  aplicadores: string | null
  preco: number | null
  valor_caixa: number | null
  exige_receita: boolean | null
  observacoes_receita: string | null
  ativo: boolean
}

export async function listarProdutosHub(f: FiltrosProdutosHub = {}) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('hub_produtos_listar', {
    p_busca: f.busca?.trim() || null,
    p_categoria_id: f.categoriaId || null,
    p_portfolio_id: f.portfolioId || null,
    p_status: f.status || null,
    p_order_by: f.orderBy || 'nome',
    p_order_dir: f.orderDir || 'asc',
    p_limit: f.limit ?? 25,
    p_offset: f.offset ?? 0,
  })
  if (error) throw new Error(error.message)
  return data as { total: number; rows: LinhaProdutoHub[] }
}

export async function detalheProdutoHub(vinculoId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('hub_produto_detalhe', { p_vinculo_id: vinculoId })
  if (error) throw new Error(error.message)
  return data as Record<string, unknown>
}

export async function filtrosProdutosHub() {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('hub_produtos_filtros')
  if (error) throw new Error(error.message)
  return data as { portfolios: { id: string; nome: string }[]; categorias: { id: string; nome: string }[] }
}
