// Testes do core do webhook receiver (DEC-023 · Fatia 0, Etapa 7).
// node:test. Deps injetadas (resolve + inserirInbox) — sem Next, sem Supabase, sem rede.
// Cobre a política híbrida oficial: 401 / 200-eventos / 200-deadletter(JSON inválido) /
// 200-deadletter(0 eventos) / 500(falha transitória) / 404.

import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { receberWebhook, type InboxRow, type WebhookDeps } from '../webhook-receiver'
import type {
  ProviderAdapter, IncomingWebhook, InboundParseResult, StatusEvent,
  SendResult, FetchedMedia, AccountRef, OutboundContent, MediaRef,
} from '../providers/tipos'

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

function baseAdapter(code: string, over: Partial<ProviderAdapter>): ProviderAdapter {
  return {
    code,
    channels: ['whatsapp'],
    verifyWebhook(req: IncomingWebhook) {
      if (req.method === 'GET') {
        const c = req.query['hub.challenge']
        return c ? { ok: true, challenge: c } : { ok: false, motivo: 'challenge ausente' }
      }
      return req.headers['x-sig'] === 'good' ? { ok: true } : { ok: false, motivo: 'assinatura inválida' }
    },
    parseInbound(_p: unknown): InboundParseResult { return { messages: [] } },
    mapStatus(_p: unknown): StatusEvent[] { return [] },
    async sendMessage(_a: AccountRef, _t: string, _c: OutboundContent): Promise<SendResult> { return { providerMessageId: 'x', status: 'enviada' } },
    async fetchMedia(_r: MediaRef): Promise<FetchedMedia> { return { bytes: new Uint8Array(), mime: 'x' } },
    ...over,
  }
}

// 'fake' → 1 mensagem + 1 status; 'empty' → 0 eventos.
function fakeAdapter(): ProviderAdapter {
  return baseAdapter('fake', {
    parseInbound: () => ({ messages: [{ externalEventId: 'evt-msg', accountExternalId: 'ACC', message: { externalUserId: 'wa1', providerMessageId: 'wamid.1', tipo: 'texto', corpo: 'oi' } }] }),
    mapStatus: () => [{ externalEventId: 'evt-st', accountExternalId: 'ACC', providerMessageId: 'wamid.1', status: 'entregue' }],
  })
}
function emptyAdapter(): ProviderAdapter {
  return baseAdapter('empty', {})
}

function deps(over?: Partial<WebhookDeps>): { deps: WebhookDeps; inserted: InboxRow[][] } {
  const inserted: InboxRow[][] = []
  const base: WebhookDeps = {
    resolve: (code) => {
      if (code === 'fake') return fakeAdapter()
      if (code === 'empty') return emptyAdapter()
      throw new Error('não registrado')
    },
    inserirInbox: async (rows) => { inserted.push(rows) },
  }
  return { deps: { ...base, ...over }, inserted }
}

test('GET: challenge válido → 200 + challenge', async () => {
  const { deps: d } = deps()
  const r = await receberWebhook(d, { provider: 'fake', method: 'GET', query: { 'hub.challenge': 'ABC' }, headers: {}, rawBody: '' })
  assert.deepEqual(r, { status: 200, body: 'ABC' })
})

test('GET: sem challenge → 403', async () => {
  const { deps: d } = deps()
  const r = await receberWebhook(d, { provider: 'fake', method: 'GET', query: {}, headers: {}, rawBody: '' })
  assert.equal(r.status, 403)
})

test('provider desconhecido → 404', async () => {
  const { deps: d } = deps()
  const r = await receberWebhook(d, { provider: 'zzz', method: 'POST', query: {}, headers: { 'x-sig': 'good' }, rawBody: '{}' })
  assert.equal(r.status, 404)
})

test('POST: assinatura inválida → 401 e NÃO grava nada', async () => {
  const { deps: d, inserted } = deps()
  const r = await receberWebhook(d, { provider: 'fake', method: 'POST', query: {}, headers: {}, rawBody: '{}' })
  assert.equal(r.status, 401)
  assert.equal(inserted.length, 0)
})

test('POST: válido com eventos → grava linhas pendente e responde 200', async () => {
  const { deps: d, inserted } = deps()
  const raw = JSON.stringify({ any: 'payload' })
  const r = await receberWebhook(d, { provider: 'fake', method: 'POST', query: {}, headers: { 'x-sig': 'good' }, rawBody: raw })
  assert.deepEqual(r, { status: 200, body: 'ok' })
  const rows = inserted[0]
  assert.equal(rows.length, 2)
  assert.deepEqual(rows.map((x) => x.external_event_id).sort(), ['evt-msg', 'evt-st'])
  for (const row of rows) {
    assert.equal(row.provider, 'fake')
    assert.equal(row.status, 'pendente')
    assert.equal(row.erro, null)
    assert.equal(row.account_external_id, 'ACC')
    assert.deepEqual(row.payload, { any: 'payload' })
  }
})

test('POST: JSON inválido (assinatura ok) → 200 + DEAD-LETTER', async () => {
  const { deps: d, inserted } = deps()
  const raw = 'isto-não-é-json'
  const r = await receberWebhook(d, { provider: 'fake', method: 'POST', query: {}, headers: { 'x-sig': 'good' }, rawBody: raw })
  assert.equal(r.status, 200)
  assert.equal(inserted.length, 1)
  const row = inserted[0][0]
  assert.equal(row.status, 'erro')
  assert.equal(row.external_event_id, `raw:${sha256(raw)}`)
  assert.deepEqual(row.payload, { raw }) // corpo bruto preservado em envelope jsonb válido
  assert.match(row.erro ?? '', /JSON inválido/)
  assert.equal(row.account_external_id, null)
})

test('POST: JSON válido mas 0 eventos → 200 + DEAD-LETTER', async () => {
  const { deps: d, inserted } = deps()
  const raw = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'novo_tipo_desconhecido', value: {} }] }] })
  const r = await receberWebhook(d, { provider: 'empty', method: 'POST', query: {}, headers: { 'x-sig': 'good' }, rawBody: raw })
  assert.equal(r.status, 200)
  const row = inserted[0][0]
  assert.equal(row.status, 'erro')
  assert.equal(row.external_event_id, `raw:${sha256(raw)}`)
  assert.deepEqual(row.payload, JSON.parse(raw)) // payload autêntico preservado
  assert.match(row.erro ?? '', /sem eventos interpret/i)
})

test('POST: falha transitória ao gravar → 500 (permite retry deduplicado)', async () => {
  const { deps: d } = deps({ inserirInbox: async () => { throw new Error('db down') } })
  const r = await receberWebhook(d, { provider: 'fake', method: 'POST', query: {}, headers: { 'x-sig': 'good' }, rawBody: '{"any":"x"}' })
  assert.equal(r.status, 500)
})

test('dead-letter: JSON inválido também vira 500 se a escrita falhar', async () => {
  const { deps: d } = deps({ inserirInbox: async () => { throw new Error('db down') } })
  const r = await receberWebhook(d, { provider: 'fake', method: 'POST', query: {}, headers: { 'x-sig': 'good' }, rawBody: 'quebrado' })
  assert.equal(r.status, 500)
})
