// DEC-019 / MVP-5 — Mapeamento PURO do resultado do motor → linhas do banco.
// Sem IO/DB/SDK: a server action usa estas funções e faz apenas os inserts/updates.
// Mantém a decisão fora da IA e fora da UI: só transforma dados já computados.

import type { ResultadoConferencia, ExtracaoReceita } from './tipos'
import type { DiagnosticoReceita } from './diagnostico'

export interface MetaConferencia {
  organization_id: string
  quote_receita_id: string
  quote_id: string
  checklist_id: string | null
  checklist_versao: number | null
  provedor_ocr?: string | null
  provedor_ia: string | null
  modelo_ia: string | null
  prompt_versao: string | null
  tokens_entrada?: number | null
  tokens_saida?: number | null
  custo_estimado?: number | null
  criado_por: string | null
}

// Payload de INSERT em receita_conferencias (append-only).
export interface LinhaConferencia {
  organization_id: string
  quote_receita_id: string
  quote_id: string
  checklist_id: string | null
  checklist_versao: number | null
  provedor_ocr: string | null
  provedor_ia: string | null
  modelo_ia: string | null
  prompt_versao: string | null
  extracao_json: { campos: ExtracaoReceita['campos']; itens: ExtracaoReceita['itens'] }
  status_analise: ResultadoConferencia['status']
  score: number
  confianca_extracao: number
  tokens_entrada: number | null
  tokens_saida: number | null
  custo_estimado: number | null
  criado_por: string | null
}

// Payload de INSERT em receita_conferencia_pendencias (sem conferencia_id — a action injeta).
export interface LinhaPendencia {
  origem: 'regra' | 'extracao'
  chave: string | null
  motivo: string | null
  tipo: string
  severidade: string
  mensagem: string | null
  esperado: string | null
  encontrado: string | null
}

export function montarLinhaConferencia(
  extracao: ExtracaoReceita,
  resultado: ResultadoConferencia,
  meta: MetaConferencia
): LinhaConferencia {
  return {
    organization_id: meta.organization_id,
    quote_receita_id: meta.quote_receita_id,
    quote_id: meta.quote_id,
    checklist_id: meta.checklist_id,
    checklist_versao: meta.checklist_versao,
    provedor_ocr: meta.provedor_ocr ?? null,
    provedor_ia: meta.provedor_ia,
    modelo_ia: meta.modelo_ia,
    prompt_versao: meta.prompt_versao,
    extracao_json: { campos: extracao.campos, itens: extracao.itens },
    status_analise: resultado.status,
    score: resultado.score,
    confianca_extracao: extracao.confianca,
    tokens_entrada: meta.tokens_entrada ?? null,
    tokens_saida: meta.tokens_saida ?? null,
    custo_estimado: meta.custo_estimado ?? null,
    criado_por: meta.criado_por,
  }
}

export function montarPendencias(resultado: ResultadoConferencia): LinhaPendencia[] {
  return resultado.pendencias.map((p) => ({
    origem: p.origem,
    chave: p.chave,
    motivo: p.motivo,
    tipo: p.tipo,
    severidade: p.severidade,
    mensagem: p.mensagem,
    esperado: p.esperado ?? null,
    encontrado: p.encontrado ?? null,
  }))
}

// Resumo gravado em quote_receitas (status/score da última pré-análise + entra em conferência).
export function resumoQuoteReceita(diag: DiagnosticoReceita): {
  status_analise_ia: string
  score_ultima_conferencia: number
  status_fluxo: 'em_conferencia'
} {
  return {
    status_analise_ia: diag.statusAnalise,
    score_ultima_conferencia: diag.score,
    status_fluxo: 'em_conferencia',
  }
}
