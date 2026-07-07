// Pipeline operacional do Orçamento (MVP — Kanban do Hub).
// Fonte única das 7 etapas oficiais. Funis customizados são fase posterior:
// esta constante é o ponto de extensão (não há tabela de pipelines no MVP).
// O `pipeline_status` do orçamento (migration 078) é a fonte de verdade.

export type PipelineStatus =
  | 'novo_orcamento'
  | 'orcamento_enviado'
  | 'aguardando_receita'
  | 'receita_em_analise'
  | 'aguardando_comprovante_pagamento'
  | 'pagamento_confirmado'
  | 'pedido_enviado_industria'

export type EtapaPipeline = {
  key: PipelineStatus
  label: string
  order: number
}

export const PIPELINE_STAGES: EtapaPipeline[] = [
  { key: 'novo_orcamento', label: 'Novo orçamento', order: 1 },
  { key: 'orcamento_enviado', label: 'Orçamento enviado', order: 2 },
  { key: 'aguardando_receita', label: 'Aguardando receita', order: 3 },
  { key: 'receita_em_analise', label: 'Receita em análise', order: 4 },
  { key: 'aguardando_comprovante_pagamento', label: 'Aguardando comprovante de pagamento', order: 5 },
  { key: 'pagamento_confirmado', label: 'Pagamento confirmado', order: 6 },
  { key: 'pedido_enviado_industria', label: 'Pedido enviado à indústria', order: 7 },
]

const CHAVES = new Set<string>(PIPELINE_STAGES.map((e) => e.key))

// Toda etapa desconhecida/ausente cai em "Novo orçamento" (regra do MVP).
export function normalizarEtapa(valor: string | null | undefined): PipelineStatus {
  return valor && CHAVES.has(valor) ? (valor as PipelineStatus) : 'novo_orcamento'
}

export function ehEtapaValida(valor: string): valor is PipelineStatus {
  return CHAVES.has(valor)
}

export function rotuloEtapa(key: PipelineStatus): string {
  return PIPELINE_STAGES.find((e) => e.key === key)?.label ?? key
}
