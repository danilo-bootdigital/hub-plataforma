// Testes do loop-até-vazio (DEC-023 · Fatia 0). node:test, puro (drenar + relógio injetados).

import test from 'node:test'
import assert from 'node:assert/strict'
import { drenarAteVazio } from '../loop'
import type { PollerResumo } from '../poller'

function passada(reivindicados: number, processados = reivindicados): PollerResumo {
  return { reivindicados, processados, reagendados: 0, deadletter: 0 }
}

// Fila com N passadas cheias e depois vazia → encerra por 'vazio' e acumula.
test('para quando a fila esvazia (encerrado_por=vazio) e acumula o resumo', async () => {
  const seq = [passada(20), passada(20), passada(0)]
  let i = 0
  const r = await drenarAteVazio(async () => seq[i++], { maxPassadas: 50, orcamentoMs: 60_000 }, () => 0)
  assert.equal(r.encerrado_por, 'vazio')
  assert.equal(r.passadas, 3)
  assert.equal(r.reivindicados, 40)
  assert.equal(r.processados, 40)
})

// Nunca esvazia → encerra por 'max_passadas'.
test('respeita MAX_PASSADAS', async () => {
  const r = await drenarAteVazio(async () => passada(20), { maxPassadas: 3, orcamentoMs: 60_000 }, () => 0)
  assert.equal(r.encerrado_por, 'max_passadas')
  assert.equal(r.passadas, 3)
  assert.equal(r.reivindicados, 60)
})

// Nunca esvazia + relógio avança → encerra por 'orcamento'.
test('respeita ORCAMENTO_MS (relógio fake)', async () => {
  let t = 0
  const agora = () => { const v = t; t += 10_000; return v } // 0,10000,20000,30000...
  const r = await drenarAteVazio(async () => passada(20), { maxPassadas: 50, orcamentoMs: 25_000 }, agora)
  assert.equal(r.encerrado_por, 'orcamento')
  assert.equal(r.passadas, 2) // inicio=0; passa em 10000 e 20000; em 30000 estoura
})

test('fila já vazia na 1ª passada → 1 passada, vazio', async () => {
  const r = await drenarAteVazio(async () => passada(0), { maxPassadas: 50, orcamentoMs: 60_000 }, () => 0)
  assert.equal(r.passadas, 1)
  assert.equal(r.encerrado_por, 'vazio')
  assert.equal(r.reivindicados, 0)
})
