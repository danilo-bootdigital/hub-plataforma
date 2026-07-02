// DEC-019 / Sprint 2 — Resolução hierárquica de checklist.
// "Mais específico vence": Produto > Portfólio > Organização.
// Função pura: recebe os candidatos (já filtrados por organização/ativo na camada
// de dados) e o contexto do orçamento; devolve o checklist aplicável ou null.

import type { Checklist } from './tipos'

export interface ContextoResolucao {
  produtoId?: string | null
  portfolioId?: string | null
}

export function resolverChecklist(
  candidatos: Checklist[],
  ctx: ContextoResolucao
): Checklist | null {
  if (ctx.produtoId) {
    const porProduto = candidatos.find(
      (c) => c.escopo === 'produto' && c.produtoId === ctx.produtoId
    )
    if (porProduto) return porProduto
  }
  if (ctx.portfolioId) {
    const porPortfolio = candidatos.find(
      (c) => c.escopo === 'portfolio' && c.portfolioId === ctx.portfolioId
    )
    if (porPortfolio) return porPortfolio
  }
  return candidatos.find((c) => c.escopo === 'organizacao') ?? null
}
