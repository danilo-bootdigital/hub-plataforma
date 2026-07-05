// Utilitários de portfólio por item do orçamento (DEC-013/017).
// Itens de um orçamento podem vir de portfólios diferentes; estas funções são
// compartilhadas por tela de detalhe, PDF e enriquecimento server-side para evitar
// lógica duplicada e divergente.

// Cliente admin mínimo (evita importar o módulo server-only em componentes client).
// `.in()` do supabase-js é um thenable (PromiseLike), não um Promise — por isso o tipo.
type AdminLike = {
  from: (tabela: string) => {
    select: (cols: string) => {
      in: (col: string, vals: string[]) => PromiseLike<{ data: { id: string; nome: string }[] | null }>
    }
  }
}

// Resume o portfólio de origem dos itens: nome único, "Múltiplos Portfólios" quando
// há mais de um (contando também itens sem portfólio como uma categoria distinta), ou
// null quando nenhum item tem portfólio.
export function resumirPortfolios(nomes: (string | null | undefined)[]): string | null {
  if (nomes.length === 0) return null
  const distintos = new Set(nomes.map((n) => n?.trim() || '—'))
  if (distintos.size === 1) {
    const unico = [...distintos][0]
    return unico === '—' ? null : unico
  }
  return 'Múltiplos Portfólios'
}

// Item genérico do orçamento (base Record para preservar os demais campos no spread e
// evitar instanciação de tipo excessivamente profunda com os tipos do supabase-js).
type ItemComPortfolio = Record<string, unknown> & { portfolio_id?: string | null }

// Enriquece itens (com portfolio_id) com o nome do portfólio de origem. Portfólios têm
// RLS; o nome é resolvido via admin — o acesso ao orçamento deve ter sido validado antes.
export async function enriquecerItensComPortfolio(
  adminClient: unknown,
  itens: ItemComPortfolio[],
): Promise<(ItemComPortfolio & { portfolio_nome: string | null })[]> {
  const admin = adminClient as AdminLike
  const portIds = [...new Set(itens.map((i) => i.portfolio_id).filter(Boolean))] as string[]
  if (portIds.length === 0) {
    return itens.map((i) => ({ ...i, portfolio_nome: null }))
  }
  const { data: ports } = await admin.from('portfolios').select('id, nome').in('id', portIds)
  const pmap = new Map((ports ?? []).map((p) => [p.id, p.nome]))
  return itens.map((i) => ({
    ...i,
    portfolio_nome: i.portfolio_id ? pmap.get(i.portfolio_id) ?? null : null,
  }))
}
