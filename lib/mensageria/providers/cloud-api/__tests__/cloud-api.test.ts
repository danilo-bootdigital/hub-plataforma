// Testes do adapter Cloud API (DEC-023 · Fatia 0, Etapa 6).
// node:test. HTTP e config INJETADOS (mock) — nenhuma chamada real à Meta,
// nenhum secret real. Cobre: verifyWebhook, parseInbound, mapStatus, sendMessage,
// fetchMedia e o auto-registro no registry.

import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { createCloudApiAdapter, registerCloudApi, cloudApiAdapter, CLOUD_API_CODE } from '../index'
import type { HttpClient, HttpRequestInit, HttpResponse, FetchImpl } from '../client'
import { createDefaultHttp } from '../client'
import { _resetRegistry, resolveProvider, listProviders } from '../../registry'

const cfg = {
  graphBaseUrl: 'https://graph.test',
  graphVersion: 'v21.0',
  token: 'TESTTOKEN',
  appSecret: 'test_secret',
  verifyToken: 'VT',
}

type MockRes = { ok?: boolean; status?: number; json?: unknown; text?: string; buf?: ArrayBuffer }
function makeHttp(responses: MockRes[]): { http: HttpClient; calls: Array<{ url: string; init?: HttpRequestInit }> } {
  const calls: Array<{ url: string; init?: HttpRequestInit }> = []
  let i = 0
  const http: HttpClient = async (url, init) => {
    calls.push({ url, init })
    const r = responses[i++] ?? { ok: true }
    const res: HttpResponse = {
      ok: r.ok ?? true,
      status: r.status ?? 200,
      json: async () => r.json,
      text: async () => r.text ?? '',
      arrayBuffer: async () => r.buf ?? new ArrayBuffer(0),
    }
    return res
  }
  return { http, calls }
}

// ---------- verifyWebhook ----------
test('verifyWebhook GET: token correto devolve challenge', () => {
  const a = createCloudApiAdapter({ config: cfg, http: makeHttp([]).http })
  const r = a.verifyWebhook({ method: 'GET', query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'VT', 'hub.challenge': '12345' }, headers: {}, rawBody: '' })
  assert.deepEqual(r, { ok: true, challenge: '12345' })
})

test('verifyWebhook GET: token errado é rejeitado', () => {
  const a = createCloudApiAdapter({ config: cfg, http: makeHttp([]).http })
  const r = a.verifyWebhook({ method: 'GET', query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'ERRADO', 'hub.challenge': 'x' }, headers: {}, rawBody: '' })
  assert.equal(r.ok, false)
})

test('verifyWebhook POST: assinatura válida aceita; inválida/ausente rejeitada', () => {
  const a = createCloudApiAdapter({ config: cfg, http: makeHttp([]).http })
  const rawBody = JSON.stringify({ hello: 'world' })
  const sig = 'sha256=' + createHmac('sha256', cfg.appSecret).update(rawBody).digest('hex')
  assert.equal(a.verifyWebhook({ method: 'POST', query: {}, headers: { 'x-hub-signature-256': sig }, rawBody }).ok, true)
  assert.equal(a.verifyWebhook({ method: 'POST', query: {}, headers: { 'x-hub-signature-256': 'sha256=deadbeef' }, rawBody }).ok, false)
  assert.equal(a.verifyWebhook({ method: 'POST', query: {}, headers: {}, rawBody }).ok, false)
})

// ---------- parseInbound ----------
const inboundPayload = {
  object: 'whatsapp_business_account',
  entry: [{
    id: 'WABA', changes: [{
      field: 'messages', value: {
        messaging_product: 'whatsapp',
        metadata: { display_phone_number: '15550001111', phone_number_id: 'PNID1' },
        contacts: [{ profile: { name: 'Fulano' }, wa_id: '5511999999999' }],
        messages: [
          { from: '5511999999999', id: 'wamid.TEXT', timestamp: '1700000000', type: 'text', text: { body: 'olá' } },
          { from: '5511999999999', id: 'wamid.IMG', timestamp: '1700000001', type: 'image', image: { id: 'MEDIA1', mime_type: 'image/jpeg', caption: 'foto' } },
        ],
      },
    }],
  }],
}

test('parseInbound: normaliza texto e imagem com externalEventId/accountExternalId', () => {
  const a = createCloudApiAdapter({ config: cfg, http: makeHttp([]).http })
  const { messages } = a.parseInbound(inboundPayload)
  assert.equal(messages.length, 2)

  const txt = messages[0]
  assert.equal(txt.externalEventId, 'wamid.TEXT')
  assert.equal(txt.accountExternalId, 'PNID1')
  assert.equal(txt.message.tipo, 'texto')
  assert.equal(txt.message.corpo, 'olá')
  assert.equal(txt.message.externalUserId, '5511999999999')
  assert.equal(txt.message.telefone, '5511999999999')
  assert.equal(txt.message.displayName, 'Fulano')
  assert.equal(txt.message.providerMessageId, 'wamid.TEXT')
  assert.ok(txt.message.ocorridoEm)

  const img = messages[1]
  assert.equal(img.message.tipo, 'imagem')
  assert.equal(img.message.corpo, 'foto')
  assert.equal(img.message.media?.providerMediaId, 'MEDIA1')
  assert.equal(img.message.media?.mime, 'image/jpeg')
})

test('parseInbound: payload sem mensagens devolve lista vazia', () => {
  const a = createCloudApiAdapter({ config: cfg, http: makeHttp([]).http })
  assert.deepEqual(a.parseInbound({}).messages, [])
  assert.deepEqual(a.parseInbound({ entry: [{ changes: [{ value: { statuses: [] } }] }] }).messages, [])
})

// ---------- mapStatus ----------
test('mapStatus: mapeia delivered→entregue com externalEventId único', () => {
  const a = createCloudApiAdapter({ config: cfg, http: makeHttp([]).http })
  const payload = {
    entry: [{ changes: [{ field: 'messages', value: {
      metadata: { phone_number_id: 'PNID1' },
      statuses: [{ id: 'wamid.TEXT', status: 'delivered', timestamp: '1700000002', recipient_id: '5511999999999' }],
    } }] }],
  }
  const st = a.mapStatus(payload)
  assert.equal(st.length, 1)
  assert.equal(st[0].externalEventId, 'wamid.TEXT:delivered')
  assert.equal(st[0].providerMessageId, 'wamid.TEXT')
  assert.equal(st[0].status, 'entregue')
  assert.equal(st[0].accountExternalId, 'PNID1')
})

// ---------- sendMessage (mock) ----------
test('sendMessage: monta request correto e normaliza SendResult', async () => {
  const { http, calls } = makeHttp([{ ok: true, json: { messages: [{ id: 'wamid.OUT' }] } }])
  const a = createCloudApiAdapter({ config: cfg, http })
  const r = await a.sendMessage({ externalAccountId: 'PNID1' }, '5511999999999', { tipo: 'texto', corpo: 'oi' })
  assert.deepEqual(r, { providerMessageId: 'wamid.OUT', status: 'enviada' })
  assert.equal(calls[0].url, 'https://graph.test/v21.0/PNID1/messages')
  assert.equal(calls[0].init?.method, 'POST')
  assert.equal(calls[0].init?.headers?.Authorization, 'Bearer TESTTOKEN')
  const body = JSON.parse(calls[0].init?.body ?? '{}')
  assert.equal(body.to, '5511999999999')
  assert.equal(body.type, 'text')
  assert.equal(body.text.body, 'oi')
})

test('sendMessage: tipo não-texto é rejeitado na Fatia 0', async () => {
  const a = createCloudApiAdapter({ config: cfg, http: makeHttp([]).http })
  await assert.rejects(
    a.sendMessage({ externalAccountId: 'PNID1' }, '55', { tipo: 'imagem' }),
    /não suportado/,
  )
})

// ---------- sendMessage: erros HTTP lançam com o corpo (4xx/5xx/429) ----------
for (const { nome, status, corpo } of [
  { nome: '4xx', status: 400, corpo: '{"error":{"message":"parametro invalido","code":100}}' },
  { nome: '5xx', status: 500, corpo: '{"error":{"message":"internal","code":1}}' },
  { nome: '429', status: 429, corpo: '{"error":{"message":"rate limit","code":80007}}' },
]) {
  test(`sendMessage: ${nome} lança erro com HTTP status e corpo`, async () => {
    const { http } = makeHttp([{ ok: false, status, text: corpo }])
    const a = createCloudApiAdapter({ config: cfg, http })
    await assert.rejects(
      a.sendMessage({ externalAccountId: 'PNID1' }, '5511999999999', { tipo: 'texto', corpo: 'oi' }),
      (err: Error) => {
        assert.match(err.message, new RegExp(`HTTP ${status}`))
        assert.ok(err.message.includes(corpo), 'mensagem deve conter o corpo da resposta')
        return true
      },
    )
  })
}

// ---------- createDefaultHttp: timeout via AbortController ----------
function okResponse(): HttpResponse {
  return { ok: true, status: 200, json: async () => ({}), text: async () => '', arrayBuffer: async () => new ArrayBuffer(0) }
}

test('createDefaultHttp: requisição OK injeta AbortSignal (não abortado) e devolve resposta', async () => {
  let seen: AbortSignal | undefined
  const fetchImpl: FetchImpl = async (_url, init) => { seen = init?.signal; return okResponse() }
  const http = createDefaultHttp({ timeoutMs: 1000, fetchImpl })
  const res = await http('https://graph.test/x', { method: 'GET' })
  assert.equal(res.ok, true)
  assert.ok(seen instanceof AbortSignal)
  assert.equal(seen!.aborted, false)
})

test('createDefaultHttp: timeout aborta a requisição e lança erro de timeout', async () => {
  let sig: AbortSignal | undefined
  // fetch que só resolve/rejeita quando o signal abortar (simula rede pendurada)
  const hangingFetch: FetchImpl = (_url, init) => new Promise((_resolve, reject) => {
    sig = init?.signal
    init?.signal?.addEventListener('abort', () => reject(new Error('AbortError')))
  })
  const http = createDefaultHttp({ timeoutMs: 10, fetchImpl: hangingFetch })
  await assert.rejects(http('https://graph.test/lento'), /timeout após 10ms/)
  assert.equal(sig?.aborted, true, 'o signal deve ter sido abortado pelo timer')
})

test('createDefaultHttp: erro de rede (não-timeout) propaga o erro original', async () => {
  const boom: FetchImpl = async () => { throw new Error('ECONNRESET') }
  const http = createDefaultHttp({ timeoutMs: 1000, fetchImpl: boom })
  await assert.rejects(http('https://graph.test/x'), /ECONNRESET/)
})

// ---------- fetchMedia (mock, 2 passos) ----------
test('fetchMedia: baixa metadados + binário e normaliza FetchedMedia', async () => {
  const bytes = new Uint8Array([1, 2, 3])
  const { http, calls } = makeHttp([
    { ok: true, json: { url: 'https://media.test/x', mime_type: 'image/png' } },
    { ok: true, buf: bytes.buffer },
  ])
  const a = createCloudApiAdapter({ config: cfg, http })
  const fm = await a.fetchMedia({ providerMediaId: 'MEDIA1' })
  assert.ok(fm.bytes instanceof Uint8Array)
  assert.equal(fm.bytes.length, 3)
  assert.equal(fm.mime, 'image/png')
  assert.equal(calls[0].url, 'https://graph.test/v21.0/MEDIA1')
  assert.equal(calls[1].url, 'https://media.test/x')
})

test('fetchMedia: não quebra através de createDefaultHttp (timeout wrapper) — fluxo de 2 passos', async () => {
  const bytes = new Uint8Array([9, 8, 7])
  let i = 0
  const fetchImpl: FetchImpl = async (url) => {
    i++
    if (i === 1) return { ok: true, status: 200, json: async () => ({ url: 'https://media.test/y', mime_type: 'image/webp' }), text: async () => '', arrayBuffer: async () => new ArrayBuffer(0) }
    assert.equal(url, 'https://media.test/y')
    return { ok: true, status: 200, json: async () => ({}), text: async () => '', arrayBuffer: async () => bytes.buffer }
  }
  const http = createDefaultHttp({ timeoutMs: 1000, fetchImpl })
  const a = createCloudApiAdapter({ config: cfg, http })
  const fm = await a.fetchMedia({ providerMediaId: 'MEDIA9' })
  assert.equal(fm.mime, 'image/webp')
  assert.equal(fm.bytes.length, 3)
})

test('fetchMedia: timeout no download aborta (não trava)', async () => {
  const hangingFetch: FetchImpl = (_url, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('AbortError')))
  })
  const http = createDefaultHttp({ timeoutMs: 10, fetchImpl: hangingFetch })
  const a = createCloudApiAdapter({ config: cfg, http })
  await assert.rejects(a.fetchMedia({ providerMediaId: 'MEDIA_LENTA' }), /timeout após 10ms/)
})

// ---------- registry ----------
test('registry: registerCloudApi registra o adapter cloud_api', () => {
  _resetRegistry()
  registerCloudApi()
  assert.equal(resolveProvider(CLOUD_API_CODE), cloudApiAdapter)
  assert.equal(cloudApiAdapter.code, 'cloud_api')
  assert.deepEqual([...cloudApiAdapter.channels], ['whatsapp'])
  assert.ok(listProviders().includes('cloud_api'))
})
