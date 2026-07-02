// DEC-019 / MVP-5 — Mapeamento PURO das linhas do orçamento → contexto do motor.
// Tira essa transformação de dentro da server action (que fica só orquestrando).
// Sem IO/DB. Testável isoladamente.

import type { OrcamentoContexto, ItemOrcamento } from './tipos'

export interface QuoteRow {
  portfolio_id: string | null
  contato?: { nome?: string | null } | null
}

export interface QuoteItemRow {
  descricao: string
  quantidade: number | string
  product_id: string | null
}

export interface ContextoOrcamento {
  orcamento: OrcamentoContexto
  produtoId: string | null // único produto do orçamento (para resolver checklist por produto)
  portfolioId: string | null
}

export function mapOrcamentoContexto(quote: QuoteRow, itens: QuoteItemRow[]): ContextoOrcamento {
  const orcamento: OrcamentoContexto = {
    itens: itens.map(
      (i): ItemOrcamento => ({
        descricao: i.descricao,
        quantidade: Number(i.quantidade),
        concentracao: null, // quote_items não têm concentração no MVP (refino futuro)
      })
    ),
    nomeCliente: quote.contato?.nome ?? null,
  }
  const productIds = [...new Set(itens.map((i) => i.product_id).filter((v): v is string => !!v))]
  return {
    orcamento,
    produtoId: productIds.length === 1 ? productIds[0] : null,
    portfolioId: quote.portfolio_id ?? null,
  }
}
