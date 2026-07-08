// Mensageria (DEC-023 · Fatia 0) — loop-até-vazio do poller (PURO, testável).
// Executa passadas de drenagem (drenarInbox) até a fila esvaziar OU atingir um limite
// de segurança (nº de passadas ou orçamento de tempo). `umaPassada` e o relógio são
// injetados → testável sem DB e sem Next.

import type { PollerResumo } from './poller'

export interface LoopOpts {
  maxPassadas: number
  orcamentoMs: number
}

export interface LoopResumo {
  passadas: number
  reivindicados: number
  processados: number
  reagendados: number
  deadletter: number
  encerrado_por: 'vazio' | 'orcamento' | 'max_passadas'
}

export async function drenarAteVazio(
  umaPassada: () => Promise<PollerResumo>,
  opts: LoopOpts,
  agora: () => number,
): Promise<LoopResumo> {
  const inicio = agora()
  const r: LoopResumo = {
    passadas: 0, reivindicados: 0, processados: 0, reagendados: 0, deadletter: 0,
    encerrado_por: 'vazio',
  }

  while (true) {
    if (r.passadas >= opts.maxPassadas) { r.encerrado_por = 'max_passadas'; break }
    if (agora() - inicio >= opts.orcamentoMs) { r.encerrado_por = 'orcamento'; break }

    const p = await umaPassada()
    r.passadas++
    r.reivindicados += p.reivindicados
    r.processados += p.processados
    r.reagendados += p.reagendados
    r.deadletter += p.deadletter

    if (p.reivindicados === 0) { r.encerrado_por = 'vazio'; break }
  }

  return r
}
