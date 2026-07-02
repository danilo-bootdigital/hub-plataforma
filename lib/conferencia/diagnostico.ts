// DEC-019 / MVP-3 — "Diagnóstico da Receita" (objeto estruturado apresentado ao
// assistente). PURO: deriva do resultado do motor (S2), sem tocar em regras nem
// depender de UI. A UI apenas apresenta este objeto. Separa claramente:
// resultado · score · conferência documental · conferência comercial · orientação.

import type { ResultadoConferencia, Pendencia, StatusAnalise } from './tipos'

export type ResultadoMvp =
  | 'apta_para_conferencia_humana'
  | 'necessita_correcao'
  | 'necessita_revisao_humana'
  | 'ilegivel'

export type Camada = 'documental' | 'comercial'

export interface ConferenciaCamada {
  camada: Camada
  ok: boolean
  pendencias: Pendencia[]
}

export interface OrientacaoOperacional {
  titulo: string
  itens: string[] // frases de ação para o assistente
  mensagem: string
}

export interface DiagnosticoReceita {
  resultado: ResultadoMvp
  statusAnalise: StatusAnalise // rótulo do motor (rastreabilidade)
  aptaParaConferenciaHumana: boolean // "apta" = liberada PARA conferência humana (obrigatória); nunca "validada"
  score: number
  conferenciaDocumental: ConferenciaCamada
  conferenciaComercial: ConferenciaCamada
  orientacaoOperacional: OrientacaoOperacional
}

// Comercial = divergências vs orçamento; Documental = tudo o mais (campos/formato/legibilidade).
function camadaDa(p: Pendencia): Camada {
  return p.tipo === 'divergencia' ? 'comercial' : 'documental'
}

const ACAO_POR_MOTIVO: Record<string, string> = {
  crm_ausente: 'Informar o CRM do prescritor',
  crm_uf_ausente: 'Informar o CRM e a UF do prescritor',
  assinatura_ausente: 'Adicionar a assinatura do prescritor',
  paciente_ausente: 'Informar o nome do paciente',
  cpf_ausente_obrigatorio: 'Informar o CPF do paciente',
  produto_divergente: 'Corrigir o medicamento (não confere com o orçamento)',
  concentracao_divergente: 'Corrigir a concentração do medicamento',
  quantidade_divergente: 'Ajustar a quantidade prescrita',
  posologia_ausente: 'Informar a posologia',
  data_ausente: 'Informar a data de emissão',
  receita_vencida: 'Emitir nova receita (documento vencido)',
  documento_ilegivel: 'Reenviar a receita de forma legível',
}

function acaoDe(p: Pendencia): string {
  return (p.motivo && ACAO_POR_MOTIVO[p.motivo]) || p.mensagem
}

const RESULTADO_POR_STATUS: Record<StatusAnalise, ResultadoMvp> = {
  sem_pendencias_aparentes: 'apta_para_conferencia_humana',
  pendencias_encontradas: 'necessita_correcao',
  divergente_do_orcamento: 'necessita_correcao',
  precisa_de_revisao_humana: 'necessita_revisao_humana',
  ilegivel: 'ilegivel',
}

export function montarDiagnostico(resultado: ResultadoConferencia): DiagnosticoReceita {
  const documental = resultado.pendencias.filter((p) => camadaDa(p) === 'documental')
  const comercial = resultado.pendencias.filter((p) => camadaDa(p) === 'comercial')
  const resultadoMvp = RESULTADO_POR_STATUS[resultado.status]
  const apta = resultado.status === 'sem_pendencias_aparentes'

  const itens = resultado.pendencias.map(acaoDe)
  let titulo: string
  let mensagem: string
  if (apta) {
    titulo = 'Sem pendências aparentes'
    mensagem = 'Sem pendências aparentes — apta para conferência humana. A conferência humana continua obrigatória.'
  } else if (resultadoMvp === 'ilegivel') {
    titulo = 'Documento ilegível'
    mensagem = 'Não foi possível ler a receita com confiança suficiente. Reenvie o documento legível.'
  } else if (resultadoMvp === 'necessita_revisao_humana') {
    titulo = 'Necessita revisão humana'
    mensagem = 'A pré-análise não teve confiança suficiente. Encaminhe para revisão humana.'
  } else {
    titulo = 'Pendências encontradas'
    mensagem = `Necessita correção: ${itens.length} pendência(s). A conferência humana continua obrigatória.`
  }

  return {
    resultado: resultadoMvp,
    statusAnalise: resultado.status,
    aptaParaConferenciaHumana: apta,
    score: resultado.score,
    conferenciaDocumental: { camada: 'documental', ok: documental.length === 0, pendencias: documental },
    conferenciaComercial: { camada: 'comercial', ok: comercial.length === 0, pendencias: comercial },
    orientacaoOperacional: { titulo, itens, mensagem },
  }
}
