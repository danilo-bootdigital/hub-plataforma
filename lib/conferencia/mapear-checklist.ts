// DEC-019 / MVP-3 — Mapeamento PURO das linhas do banco (Sprint 1) para o objeto
// de domínio `Checklist` consumido pelo motor. Os checklists vivem no BANCO (seed
// 058), não no código. A busca real no Supabase é feita na integração (MVP-5), que
// apenas chama esta função — nenhuma regra de negócio aqui.

import type { Checklist, ChecklistItem, Escopo, TipoRegra, Severidade, ReceitaMotivo } from './tipos'

// Formatos "crus" (shape das linhas de receita_checklists / receita_checklist_itens)
export interface ChecklistRow {
  id: string
  escopo: string
  portfolio_id: string | null
  produto_id: string | null
  versao: number | null
  ativo?: boolean | null
}

export interface ChecklistItemRow {
  checklist_id: string
  chave: string
  rotulo: string
  obrigatorio: boolean
  tipo_regra: string
  config_json: Record<string, unknown> | null
  motivo: string | null
  severidade: string
  peso: number
  ordem: number
}

export function mapChecklistRows(
  checklists: ChecklistRow[],
  itens: ChecklistItemRow[]
): Checklist[] {
  return checklists.map((c) => ({
    id: c.id,
    escopo: c.escopo as Escopo,
    portfolioId: c.portfolio_id,
    produtoId: c.produto_id,
    versao: c.versao ?? 1,
    itens: itens
      .filter((it) => it.checklist_id === c.id)
      .sort((a, b) => a.ordem - b.ordem)
      .map(
        (it): ChecklistItem => ({
          chave: it.chave,
          rotulo: it.rotulo,
          obrigatorio: it.obrigatorio,
          tipoRegra: it.tipo_regra as TipoRegra,
          config: (it.config_json ?? {}) as ChecklistItem['config'],
          motivo: (it.motivo as ReceitaMotivo | null) ?? null,
          severidade: it.severidade as Severidade,
          peso: it.peso,
        })
      ),
  }))
}
