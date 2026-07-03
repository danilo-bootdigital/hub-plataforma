// DEC-019 — Comparação SEMÂNTICA de posologia (etapa complementar do Diagnóstico).
// PURO (schema/prompt/validação; sem SDK). A IA APENAS compara — NÃO decide, NÃO altera
// score, NÃO aprova/reprova, NÃO toca o motor documental. Resultado é CONSULTIVO.

export type ResultadoComparacaoPosologia = 'compativel' | 'diferenca_encontrada' | 'nao_foi_possivel_comparar'

export interface ComparacaoPosologia {
  resultado: ResultadoComparacaoPosologia
  justificativa: string
}

// JSON Schema da tool (sem score/aprovação — só comparação).
export const SCHEMA_COMPARACAO = {
  type: 'object',
  additionalProperties: false,
  properties: {
    resultado: { type: 'string', enum: ['compativel', 'diferenca_encontrada', 'nao_foi_possivel_comparar'] },
    justificativa: { type: 'string' },
  },
  required: ['resultado', 'justificativa'],
}

export class ComparacaoInvalida extends Error {}

export function parseComparacao(raw: unknown): ComparacaoPosologia {
  if (typeof raw !== 'object' || raw === null) throw new ComparacaoInvalida('retorno não é objeto')
  const o = raw as Record<string, unknown>
  const r = String(o.resultado ?? '')
  const valido: ResultadoComparacaoPosologia[] = ['compativel', 'diferenca_encontrada', 'nao_foi_possivel_comparar']
  if (!(valido as string[]).includes(r)) throw new ComparacaoInvalida(`resultado inválido: ${r}`)
  return { resultado: r as ResultadoComparacaoPosologia, justificativa: o.justificativa == null ? '' : String(o.justificativa) }
}

export interface PromptComparacao {
  system: string
  instrucao: string
}

export function construirPromptComparacao(esperada: string, extraida: string): PromptComparacao {
  const system = [
    'Você COMPARA semanticamente duas posologias de uma receita médica.',
    'NÃO decida, NÃO aprove, NÃO reprove, NÃO calcule score. Apenas classifique a comparação.',
    '"compativel" = mesmo sentido clínico (dose/frequência/duração equivalentes, ainda que redigidos diferente).',
    '"diferenca_encontrada" = há divergência relevante (dose, frequência, via ou duração diferentes).',
    '"nao_foi_possivel_comparar" = uma das posologias está vazia/ilegível/insuficiente.',
    'A "justificativa" deve ser curta e objetiva, para orientar o conferente humano.',
  ].join(' ')
  const instrucao = [
    'Posologia ESPERADA (referência do operador):\n' + (esperada || '(vazia)'),
    '\n\nPosologia EXTRAÍDA da receita:\n' + (extraida || '(vazia)'),
    '\n\nResponda somente pela ferramenta, no formato do schema.',
  ].join('')
  return { system, instrucao }
}
