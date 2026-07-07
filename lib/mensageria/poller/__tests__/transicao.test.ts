// Testes da máquina de estado do poller (DEC-023 · Fatia 0, Etapa 8A). node:test, puro.
// Modelo: a tentativa é contada no CLAIM → a transição NÃO incrementa (só decide).

import test from 'node:test'
import assert from 'node:assert/strict'
import { proximaTransicao, calcularBackoffSeg, POLLER_DEFAULTS } from '../transicao'

const T0 = 1_700_000_000_000 // agora fixo (ms)

test('ok → processado (tentativas inalteradas, sem próxima tentativa)', () => {
  const p = proximaTransicao({ tentativas: 1, outcome: 'ok', agoraMs: T0 })
  assert.equal(p.status, 'processado')
  assert.equal(p.tentativas, 1)
  assert.equal(p.proxima_tentativa_em, null)
  assert.equal(p.processado_em, new Date(T0).toISOString())
})

test('falha NÃO incrementa tentativas (já contada no claim)', () => {
  const ok = proximaTransicao({ tentativas: 2, outcome: 'ok', agoraMs: T0 })
  const falha = proximaTransicao({ tentativas: 2, outcome: 'falha', agoraMs: T0 })
  assert.equal(ok.tentativas, 2)
  assert.equal(falha.tentativas, 2) // sem +1
})

test('falha com tentativas=1 → pendente, backoff 60s', () => {
  const p = proximaTransicao({ tentativas: 1, outcome: 'falha', erro: 'boom', agoraMs: T0 })
  assert.equal(p.status, 'pendente')
  assert.equal(p.tentativas, 1)
  assert.equal(p.proxima_tentativa_em, new Date(T0 + 60_000).toISOString())
  assert.equal(p.erro, 'boom')
})

test('backoff cresce com a tentativa: 2→120s, 3→240s, 4→480s', () => {
  assert.equal(proximaTransicao({ tentativas: 2, outcome: 'falha', agoraMs: T0 }).proxima_tentativa_em, new Date(T0 + 120_000).toISOString())
  assert.equal(proximaTransicao({ tentativas: 3, outcome: 'falha', agoraMs: T0 }).proxima_tentativa_em, new Date(T0 + 240_000).toISOString())
  assert.equal(proximaTransicao({ tentativas: 4, outcome: 'falha', agoraMs: T0 }).proxima_tentativa_em, new Date(T0 + 480_000).toISOString())
})

test('falha com tentativas>=max → dead-letter (status=erro), tentativas preservado', () => {
  const p = proximaTransicao({ tentativas: 5, outcome: 'falha', erro: 'x', agoraMs: T0 })
  assert.equal(p.status, 'erro')
  assert.equal(p.tentativas, 5)
  assert.equal(p.proxima_tentativa_em, null)
  assert.ok(p.erro)
})

test('backoff respeita o teto (cap 1h)', () => {
  assert.equal(calcularBackoffSeg(7, POLLER_DEFAULTS.backoffBaseSeg, POLLER_DEFAULTS.backoffCapSeg), 3600)
  assert.equal(calcularBackoffSeg(1, 60, 3600), 60)
  assert.equal(calcularBackoffSeg(3, 60, 3600), 240)
})

test('maxTentativas customizado é respeitado', () => {
  // max=2: falha com tentativas=2 já é dead-letter
  const p = proximaTransicao({ tentativas: 2, outcome: 'falha', agoraMs: T0, maxTentativas: 2 })
  assert.equal(p.status, 'erro')
  assert.equal(p.tentativas, 2)
})
