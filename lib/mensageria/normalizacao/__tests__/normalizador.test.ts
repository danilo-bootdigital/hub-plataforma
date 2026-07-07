// Testes do normalizador de domínio (DEC-023 · Fatia 0, Etapa 8B.1). node:test, puro.

import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizarMensagem, normalizarStatus } from '../normalizador'
import type { NormalizedInboundMessage, StatusEvent } from '../../providers/tipos'

function base(over: Partial<NormalizedInboundMessage> = {}): NormalizedInboundMessage {
  return { externalUserId: 'wa1', providerMessageId: 'wamid.1', tipo: 'texto', corpo: 'oi', ...over }
}

// --- Tipos de mensagem ---
test('texto → canônico', () => {
  const r = normalizarMensagem(base({ tipo: 'texto', corpo: 'olá mundo' }))
  assert.ok(r.ok && r.valor.tipo === 'texto' && r.valor.corpo === 'olá mundo')
})

test('imagem com mídia → ok; legenda vira corpo', () => {
  const r = normalizarMensagem(base({ tipo: 'imagem', corpo: 'foto', media: { providerMediaId: 'M1', mime: 'image/jpeg' } }))
  assert.ok(r.ok)
  if (r.ok) { assert.equal(r.valor.tipo, 'imagem'); assert.equal(r.valor.media?.providerMediaId, 'M1'); assert.equal(r.valor.media?.mime, 'image/jpeg') }
})

test('áudio com mídia → ok', () => {
  const r = normalizarMensagem(base({ tipo: 'audio', corpo: undefined, media: { providerMediaId: 'A1', mime: 'audio/ogg' } }))
  assert.ok(r.ok && r.valor.tipo === 'audio' && r.valor.media?.providerMediaId === 'A1')
})

test('vídeo com mídia → ok', () => {
  const r = normalizarMensagem(base({ tipo: 'video', media: { providerMediaId: 'V1', mime: 'video/mp4' } }))
  assert.ok(r.ok && r.valor.tipo === 'video')
})

test('documento com mídia (nome de arquivo) → ok', () => {
  const r = normalizarMensagem(base({ tipo: 'documento', media: { providerMediaId: 'D1', mime: 'application/pdf', nomeArquivo: 'receita.pdf' } }))
  assert.ok(r.ok)
  if (r.ok) assert.equal(r.valor.media?.nomeArquivo, 'receita.pdf')
})

test('localização → tipo localizacao, corpo com coords preservado', () => {
  const r = normalizarMensagem(base({ tipo: 'localizacao', corpo: '-23.5,-46.6' }))
  assert.ok(r.ok && r.valor.tipo === 'localizacao' && r.valor.corpo === '-23.5,-46.6')
})

test('contato → ok (sem mídia)', () => {
  const r = normalizarMensagem(base({ tipo: 'contato', corpo: undefined }))
  assert.ok(r.ok && r.valor.tipo === 'contato')
})

test('sistema → ok', () => {
  const r = normalizarMensagem(base({ tipo: 'sistema', corpo: 'reaction' }))
  assert.ok(r.ok && r.valor.tipo === 'sistema')
})

test('tipo desconhecido/inválido → REJEITA (não vira sistema)', () => {
  // força um tipo inválido em runtime
  const r = normalizarMensagem(base({ tipo: 'zzz' as unknown as NormalizedInboundMessage['tipo'] }))
  assert.ok(!r.ok && /tipo desconhecido|inválido/.test(r.motivo))
})

// --- Rejeições / invariantes ---
test('externalUserId ausente → rejeita', () => {
  const r = normalizarMensagem(base({ externalUserId: '  ' }))
  assert.ok(!r.ok && /externalUserId/.test(r.motivo))
})

test('providerMessageId ausente → rejeita', () => {
  const r = normalizarMensagem(base({ providerMessageId: '' }))
  assert.ok(!r.ok && /providerMessageId/.test(r.motivo))
})

test('tipo de mídia SEM mídia → rejeita', () => {
  const r = normalizarMensagem(base({ tipo: 'imagem', media: undefined }))
  assert.ok(!r.ok && /mídia ausente/.test(r.motivo))
})

// --- Canonicalização (provider-agnóstica) ---
test('telefone é reduzido a dígitos; displayName/corpo são trimados', () => {
  const r = normalizarMensagem(base({ telefone: '+55 (11) 99999-8888', displayName: '  Ana  ', corpo: '  oi  ' }))
  assert.ok(r.ok)
  if (r.ok) { assert.equal(r.valor.telefone, '5511999998888'); assert.equal(r.valor.displayName, 'Ana'); assert.equal(r.valor.corpo, 'oi') }
})

test('ocorridoEm inválido é descartado; válido é normalizado para ISO', () => {
  const ruim = normalizarMensagem(base({ ocorridoEm: 'não-é-data' }))
  assert.ok(ruim.ok && ruim.valor.ocorridoEm === undefined)
  const bom = normalizarMensagem(base({ ocorridoEm: '2026-07-06T12:00:00Z' }))
  assert.ok(bom.ok && bom.valor.ocorridoEm === '2026-07-06T12:00:00.000Z')
})

test('providers diferentes → MESMO modelo canônico', () => {
  // provider A: telefone "sujo", displayName com espaços
  const a = normalizarMensagem(base({ externalUserId: '5511999998888', telefone: ' +55 11 99999-8888 ', displayName: 'Ana ', providerMessageId: 'X', corpo: 'oi' }))
  // provider B (futuro): mesmo contato, formato diferente de telefone
  const b = normalizarMensagem(base({ externalUserId: '5511999998888', telefone: '5511999998888', displayName: 'Ana', providerMessageId: 'X', corpo: 'oi' }))
  assert.ok(a.ok && b.ok)
  if (a.ok && b.ok) assert.deepEqual(a.valor, b.valor)
})

// --- Status ---
test('status entregue → canônico', () => {
  const s: StatusEvent = { externalEventId: 'wamid.1:delivered', accountExternalId: 'ACC', providerMessageId: 'wamid.1', status: 'entregue' }
  const r = normalizarStatus(s)
  assert.ok(r.ok && r.valor.status === 'entregue' && r.valor.providerMessageId === 'wamid.1')
})

test('status inválido → rejeita', () => {
  const s = { externalEventId: 'e', accountExternalId: 'ACC', providerMessageId: 'wamid.1', status: 'xpto' } as unknown as StatusEvent
  const r = normalizarStatus(s)
  assert.ok(!r.ok && /status inválido/.test(r.motivo))
})

test('status sem providerMessageId → rejeita', () => {
  const s: StatusEvent = { externalEventId: 'e', accountExternalId: 'ACC', providerMessageId: '', status: 'lida' }
  const r = normalizarStatus(s)
  assert.ok(!r.ok && /providerMessageId/.test(r.motivo))
})
