// Testes do loop de drenagem (DEC-023 · Fatia 0, Etapa 8A). node:test.
// Deps injetadas (claim/processar/aplicar/agora) — sem DB.
// tentativas dos eventos reivindicados JÁ vêm incrementadas pelo claim.

import test from 'node:test'
import assert from 'node:assert/strict'
import { drenarInbox, type EventoReivindicado, type PollerDeps, type ResultadoProcessamento } from '../poller'
import type { TransicaoPatch } from '../transicao'

const T0 = 1_700_000_000_000

function evento(id: string, tentativas = 1): EventoReivindicado {
  return { id, provider: 'cloud_api', external_event_id: `evt-${id}`, account_external_id: 'ACC', payload: {}, tentativas }
}

function deps(eventos: EventoReivindicado[], processar: (ev: EventoReivindicado) => Promise<ResultadoProcessamento>) {
  const aplicados: Array<{ id: string; patch: TransicaoPatch }> = []
  const claims: Array<{ limite: number; visibilidadeSeg: number; maxTentativas: number }> = []
  const d: PollerDeps = {
    claim: async (limite, visibilidadeSeg, maxTentativas) => { claims.push({ limite, visibilidadeSeg, maxTentativas }); return eventos },
    processar,
    aplicar: async (id, patch) => { aplicados.push({ id, patch }) },
    agora: () => T0,
  }
  return { d, aplicados, claims }
}

test('claim vazio → resumo zerado', async () => {
  const { d } = deps([], async () => ({ ok: true }))
  const r = await drenarInbox(d)
  assert.deepEqual(r, { reivindicados: 0, processados: 0, reagendados: 0, deadletter: 0 })
})

test('todos ok → todos processados', async () => {
  const { d, aplicados } = deps([evento('1'), evento('2')], async () => ({ ok: true }))
  const r = await drenarInbox(d)
  assert.deepEqual(r, { reivindicados: 2, processados: 2, reagendados: 0, deadletter: 0 })
  assert.ok(aplicados.every((a) => a.patch.status === 'processado'))
})

test('falha com tentativas baixas → reagendado (pendente + backoff), SEM re-incrementar', async () => {
  const { d, aplicados } = deps([evento('1', 1)], async () => ({ ok: false, erro: 'x' }))
  const r = await drenarInbox(d)
  assert.deepEqual(r, { reivindicados: 1, processados: 0, reagendados: 1, deadletter: 0 })
  assert.equal(aplicados[0].patch.status, 'pendente')
  assert.equal(aplicados[0].patch.tentativas, 1) // preservado (contado no claim)
  assert.equal(aplicados[0].patch.proxima_tentativa_em, new Date(T0 + 60_000).toISOString())
})

test('falha no limite (tentativas>=max) → dead-letter', async () => {
  const { d, aplicados } = deps([evento('1', 5)], async () => ({ ok: false, erro: 'x' }))
  const r = await drenarInbox(d)
  assert.deepEqual(r, { reivindicados: 1, processados: 0, reagendados: 0, deadletter: 1 })
  assert.equal(aplicados[0].patch.status, 'erro')
  assert.equal(aplicados[0].patch.tentativas, 5)
})

test('processar que LANÇA é tratado como falha', async () => {
  const { d, aplicados } = deps([evento('1', 5)], async () => { throw new Error('explodiu') })
  const r = await drenarInbox(d)
  assert.equal(r.deadletter, 1)
  assert.equal(aplicados[0].patch.status, 'erro')
  assert.match(aplicados[0].patch.erro ?? '', /explodiu/)
})

test('claim recebe lote, visibilidade e maxTentativas das opções', async () => {
  const { d, claims } = deps([], async () => ({ ok: true }))
  await drenarInbox(d, { lote: 7, visibilidadeSeg: 42, maxTentativas: 3 })
  assert.deepEqual(claims[0], { limite: 7, visibilidadeSeg: 42, maxTentativas: 3 })
})

test('mix: 1 ok + 1 falha-retry + 1 dead-letter', async () => {
  const evs = [evento('ok', 1), evento('retry', 1), evento('dead', 5)]
  const { d, aplicados } = deps(evs, async (ev) => (ev.id === 'ok' ? { ok: true } : { ok: false, erro: 'e' }))
  const r = await drenarInbox(d)
  assert.deepEqual(r, { reivindicados: 3, processados: 1, reagendados: 1, deadletter: 1 })
  const byId = Object.fromEntries(aplicados.map((a) => [a.id, a.patch.status]))
  assert.deepEqual(byId, { ok: 'processado', retry: 'pendente', dead: 'erro' })
})
