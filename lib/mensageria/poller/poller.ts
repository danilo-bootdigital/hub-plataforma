// Mensageria (DEC-023 · Fatia 0, Etapa 8A) — loop de drenagem do inbox.
// Orquestra: claim (SKIP LOCKED) → processar (injetado) → aplicar transição.
// Dependências INJETADAS (claim/processar/aplicar/agora) → testável sem DB e sem
// consumidor real. O `processar` real (normalizador → conversation/message) é da Etapa 8B;
// aqui ele é apenas um contrato injetado.

import { proximaTransicao, POLLER_DEFAULTS, type TransicaoPatch } from './transicao'

export interface EventoReivindicado {
  id: string
  provider: string
  external_event_id: string
  account_external_id: string | null
  payload: unknown
  tentativas: number
}

export type ResultadoProcessamento = { ok: true } | { ok: false; erro: string }

export interface PollerDeps {
  claim: (limite: number, visibilidadeSeg: number, maxTentativas: number) => Promise<EventoReivindicado[]>
  processar: (ev: EventoReivindicado) => Promise<ResultadoProcessamento>
  aplicar: (id: string, patch: TransicaoPatch) => Promise<void>
  agora: () => number   // Date.now injetável (determinismo em teste)
}

export interface PollerOpts {
  lote?: number
  visibilidadeSeg?: number
  maxTentativas?: number
  backoffBaseSeg?: number
  backoffCapSeg?: number
}

export interface PollerResumo {
  reivindicados: number
  processados: number
  reagendados: number
  deadletter: number
}

// Uma passada de drenagem: reivindica 1 lote e processa cada evento.
// A repetição/cadência é responsabilidade do agendador (cron, Etapa 8B) — não aqui.
export async function drenarInbox(deps: PollerDeps, opts: PollerOpts = {}): Promise<PollerResumo> {
  const lote = opts.lote ?? POLLER_DEFAULTS.lote
  const visibilidadeSeg = opts.visibilidadeSeg ?? POLLER_DEFAULTS.visibilidadeSeg
  const maxTentativas = opts.maxTentativas ?? POLLER_DEFAULTS.maxTentativas

  const eventos = await deps.claim(lote, visibilidadeSeg, maxTentativas)
  const resumo: PollerResumo = { reivindicados: eventos.length, processados: 0, reagendados: 0, deadletter: 0 }

  for (const ev of eventos) {
    let outcome: ResultadoProcessamento
    try {
      outcome = await deps.processar(ev)
    } catch (e) {
      outcome = { ok: false, erro: e instanceof Error ? e.message : 'erro no processamento' }
    }

    const patch = proximaTransicao({
      tentativas: ev.tentativas,
      outcome: outcome.ok ? 'ok' : 'falha',
      erro: outcome.ok ? undefined : outcome.erro,
      agoraMs: deps.agora(),
      maxTentativas,
      backoffBaseSeg: opts.backoffBaseSeg,
      backoffCapSeg: opts.backoffCapSeg,
    })

    await deps.aplicar(ev.id, patch)

    if (patch.status === 'processado') resumo.processados++
    else if (patch.status === 'pendente') resumo.reagendados++
    else resumo.deadletter++
  }

  return resumo
}
