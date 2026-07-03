// DEC-019 / MVP-5′ — Mapeamento PURO do resultado do motor → linhas do banco
// no fluxo STANDALONE (independente do orçamento; migration 060).
// Sem IO/DB/SDK: a server action usa estas funções e faz apenas os inserts/updates.
// Não importa @/types (mantém o tsconfig.conferencia isolado de aliases).

import type { ResultadoConferencia, ExtracaoReceita } from './tipos'

// Documental-only: o standalone nunca compara com orçamento.
export type ResultadoAnaliseDocumental =
  | 'sem_pendencias_aparentes'
  | 'pendencias_encontradas'
  | 'ilegivel'
  | 'precisa_de_revisao_humana'

export type DecisaoHumana = 'aprovada' | 'reprovada' | 'devolvida_para_correcao'

// StatusAnalise do motor → resultado documental. 'divergente_do_orcamento' não
// deve ocorrer (checklist standalone não tem regras de comparação); se ocorrer,
// cai defensivamente em revisão humana.
const MAPA_RESULTADO: Record<string, ResultadoAnaliseDocumental> = {
  sem_pendencias_aparentes: 'sem_pendencias_aparentes',
  pendencias_encontradas: 'pendencias_encontradas',
  ilegivel: 'ilegivel',
  precisa_de_revisao_humana: 'precisa_de_revisao_humana',
  divergente_do_orcamento: 'precisa_de_revisao_humana',
}

export function mapResultadoDocumental(status: ResultadoConferencia['status']): ResultadoAnaliseDocumental {
  return MAPA_RESULTADO[status] ?? 'precisa_de_revisao_humana'
}

export interface MetaPreAnalise {
  checklist_id: string | null
  checklist_versao: number | null
  provedor_ia: string | null
  modelo_ia: string | null
  prompt_versao: string | null
}

// Payload de UPDATE em conferencias_receita após a pré-análise.
export interface AtualizacaoPreAnalise {
  status_processamento: 'concluido'
  status_atual: 'aguardando_decisao'
  resultado_analise: ResultadoAnaliseDocumental
  score: number
  confianca_extracao: number
  extracao_json: { campos: ExtracaoReceita['campos']; itens: ExtracaoReceita['itens'] }
  checklist_id: string | null
  checklist_versao: number | null
  provedor_ia: string | null
  modelo_ia: string | null
  prompt_versao: string | null
}

export function montarAtualizacaoPreAnalise(
  extracao: ExtracaoReceita,
  resultado: ResultadoConferencia,
  meta: MetaPreAnalise
): AtualizacaoPreAnalise {
  return {
    status_processamento: 'concluido',
    status_atual: 'aguardando_decisao',
    resultado_analise: mapResultadoDocumental(resultado.status),
    score: resultado.score,
    confianca_extracao: extracao.confianca,
    extracao_json: { campos: extracao.campos, itens: extracao.itens },
    checklist_id: meta.checklist_id,
    checklist_versao: meta.checklist_versao,
    provedor_ia: meta.provedor_ia,
    modelo_ia: meta.modelo_ia,
    prompt_versao: meta.prompt_versao,
  }
}

// Decisão humana: snapshot na tabela principal + linha imutável no histórico.
// `decididoEm` é injetado pela action (ISO) — mantém a função pura/determinística.
export interface DecisaoPersistencia {
  // UPDATE em conferencias_receita (snapshot da última decisão)
  atualizacao: {
    status_atual: DecisaoHumana
    decidido_por: string
    decidido_em: string
    observacao_decisao: string | null
  }
  // INSERT em historico_decisoes_conferencia_receita (append-only; conferencia_id injetado pela action)
  historico: {
    decisao: DecisaoHumana
    observacao: string | null
    decidido_por: string
    decidido_em: string
  }
}

export function montarDecisao(
  decisao: DecisaoHumana,
  decididoPor: string,
  decididoEm: string,
  observacao?: string | null
): DecisaoPersistencia {
  const obs = observacao ?? null
  return {
    atualizacao: {
      status_atual: decisao,
      decidido_por: decididoPor,
      decidido_em: decididoEm,
      observacao_decisao: obs,
    },
    historico: {
      decisao,
      observacao: obs,
      decidido_por: decididoPor,
      decidido_em: decididoEm,
    },
  }
}
