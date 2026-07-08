// Mensageria (DEC-023 · Fatia 0, Etapa 8A) — máquina de estado do poller (PURA).
// Decide a próxima transição de um evento do inbox após uma tentativa de processamento.
// Sem I/O, sem DB, sem Date.now interno (o "agora" é injetado → determinismo em teste).

export const POLLER_DEFAULTS = {
  maxTentativas: 5,
  backoffBaseSeg: 60,
  backoffCapSeg: 3600, // 1h
  visibilidadeSeg: 300,
  lote: 20,
} as const

export interface TransicaoInput {
  tentativas: number           // tentativas JÁ CONTADAS no claim (inclui a atual)
  outcome: 'ok' | 'falha' | 'adiar'
  erro?: string
  agoraMs: number              // Date.now() injetado
  maxTentativas?: number
  backoffBaseSeg?: number
  backoffCapSeg?: number
}

export interface TransicaoPatch {
  status: 'processado' | 'pendente' | 'erro'
  tentativas: number
  proxima_tentativa_em: string | null   // ISO 8601
  processado_em: string | null          // ISO 8601
  erro: string | null
}

// Backoff exponencial: base * 2^(tentativa-1), com teto. tentativa >= 1.
export function calcularBackoffSeg(tentativa: number, baseSeg: number, capSeg: number): number {
  const expo = baseSeg * Math.pow(2, Math.max(0, tentativa - 1))
  return Math.min(expo, capSeg)
}

export function proximaTransicao(input: TransicaoInput): TransicaoPatch {
  const max = input.maxTentativas ?? POLLER_DEFAULTS.maxTentativas
  const base = input.backoffBaseSeg ?? POLLER_DEFAULTS.backoffBaseSeg
  const cap = input.backoffCapSeg ?? POLLER_DEFAULTS.backoffCapSeg

  if (input.outcome === 'ok') {
    return {
      status: 'processado',
      tentativas: input.tentativas,
      proxima_tentativa_em: null,
      processado_em: new Date(input.agoraMs).toISOString(),
      erro: null,
    }
  }

  // Adiar (E9.5): reagenda com backoff mas DEVOLVE a tentativa contada no claim
  // (tentativas-1) → não caminha para o dead-letter. O término é por IDADE do evento
  // (decidido em processar-evento), não por esgotar tentativas.
  if (input.outcome === 'adiar') {
    const backoffSeg = calcularBackoffSeg(input.tentativas, base, cap)
    return {
      status: 'pendente',
      tentativas: Math.max(0, input.tentativas - 1),
      proxima_tentativa_em: new Date(input.agoraMs + backoffSeg * 1000).toISOString(),
      processado_em: null,
      erro: null,
    }
  }

  // Falha do handler: a tentativa JÁ foi contada no claim → NÃO incrementar aqui
  // (evita incremento duplo). Decide apenas backoff vs dead-letter pelo valor atual.
  if (input.tentativas >= max) {
    return {
      status: 'erro',
      tentativas: input.tentativas,
      proxima_tentativa_em: null,
      processado_em: null,
      erro: input.erro ?? `falha após ${input.tentativas} tentativas`,
    }
  }

  const backoffSeg = calcularBackoffSeg(input.tentativas, base, cap)
  return {
    status: 'pendente',
    tentativas: input.tentativas,
    proxima_tentativa_em: new Date(input.agoraMs + backoffSeg * 1000).toISOString(),
    processado_em: null,
    erro: input.erro ?? null,
  }
}
