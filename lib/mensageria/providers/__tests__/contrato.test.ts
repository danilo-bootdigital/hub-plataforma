// Testes de contrato da camada de providers (DEC-023 · Fatia 0, Etapa 5).
// node:test (padrão do projeto). Usa um adapter FAKE para exercitar o contrato
// e o registry — sem I/O externo e sem provider concreto.

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  registerProvider, resolveProvider, isProviderRegistered, listProviders, _resetRegistry,
} from '../registry'
import type {
  ProviderAdapter, IncomingWebhook, InboundParseResult, StatusEvent,
  SendResult, FetchedMedia, AccountRef, OutboundContent, MediaRef,
} from '../tipos'

// Adapter fake que satisfaz o contrato ProviderAdapter (sem I/O real).
function fakeAdapter(code: string, channels: string[] = ['whatsapp']): ProviderAdapter {
  return {
    code,
    channels,
    verifyWebhook(req: IncomingWebhook) {
      if (req.method === 'GET') {
        const challenge = req.query['hub.challenge']
        return challenge ? { ok: true, challenge } : { ok: false, motivo: 'challenge ausente' }
      }
      return req.headers['x-signature']
        ? { ok: true }
        : { ok: false, motivo: 'assinatura ausente' }
    },
    parseInbound(_payload: unknown): InboundParseResult {
      return {
        messages: [{
          externalEventId: 'evt-1',
          accountExternalId: 'ACC1',
          message: { externalUserId: 'wa1', providerMessageId: 'wamid.1', tipo: 'texto', corpo: 'oi' },
        }],
      }
    },
    mapStatus(_payload: unknown): StatusEvent[] {
      return [{ externalEventId: 'st-1', accountExternalId: 'ACC1', providerMessageId: 'wamid.1', status: 'entregue' }]
    },
    async sendMessage(_account: AccountRef, _to: string, _content: OutboundContent): Promise<SendResult> {
      return { providerMessageId: 'wamid.out', status: 'enviada' }
    },
    async fetchMedia(_ref: MediaRef): Promise<FetchedMedia> {
      return { bytes: new Uint8Array([1, 2, 3]), mime: 'image/jpeg' }
    },
  }
}

test('registry: register + resolve + list', () => {
  _resetRegistry()
  const a = fakeAdapter('fake')
  registerProvider(a)
  assert.equal(isProviderRegistered('fake'), true)
  assert.equal(resolveProvider('fake'), a)
  assert.deepEqual(listProviders(), ['fake'])
})

test('registry: resolve de code desconhecido lança', () => {
  _resetRegistry()
  assert.throws(() => resolveProvider('nao_existe'), /não registrado/)
  assert.equal(isProviderRegistered('nao_existe'), false)
})

test('registry: registro duplicado lança', () => {
  _resetRegistry()
  registerProvider(fakeAdapter('dup'))
  assert.throws(() => registerProvider(fakeAdapter('dup')), /já registrado/)
})

test('registry: começa vazio (nenhum provider concreto na Etapa 5)', () => {
  _resetRegistry()
  assert.deepEqual(listProviders(), [])
})

test('contrato: verifyWebhook GET devolve challenge; POST exige assinatura', () => {
  const a = fakeAdapter('fake')
  assert.deepEqual(
    a.verifyWebhook({ method: 'GET', query: { 'hub.challenge': 'X' }, headers: {}, rawBody: '' }),
    { ok: true, challenge: 'X' },
  )
  assert.equal(a.verifyWebhook({ method: 'POST', query: {}, headers: {}, rawBody: '{}' }).ok, false)
  assert.equal(a.verifyWebhook({ method: 'POST', query: {}, headers: { 'x-signature': 'sig' }, rawBody: '{}' }).ok, true)
})

test('contrato: parseInbound devolve eventos com externalEventId + accountExternalId', () => {
  const a = fakeAdapter('fake')
  const res = a.parseInbound({})
  assert.equal(res.messages.length, 1)
  const ev = res.messages[0]
  assert.ok(ev.externalEventId, 'externalEventId presente (dedup)')
  assert.ok(ev.accountExternalId, 'accountExternalId presente (resolução de conta)')
  assert.equal(ev.message.tipo, 'texto')
  assert.ok(ev.message.providerMessageId, 'providerMessageId presente (idempotência)')
})

test('contrato: mapStatus devolve status de entrega normalizado', () => {
  const a = fakeAdapter('fake')
  const st = a.mapStatus({})
  assert.equal(st.length, 1)
  assert.equal(st[0].status, 'entregue')
  assert.ok(st[0].providerMessageId)
})

test('contrato: sendMessage e fetchMedia respeitam os formatos de retorno', async () => {
  const a = fakeAdapter('fake')
  const sr = await a.sendMessage({ externalAccountId: 'ACC1' }, '5511999999999', { tipo: 'texto', corpo: 'oi' })
  assert.ok(sr.providerMessageId)
  assert.equal(sr.status, 'enviada')

  const fm = await a.fetchMedia({ providerMediaId: 'm1' })
  assert.ok(fm.bytes instanceof Uint8Array)
  assert.equal(fm.mime, 'image/jpeg')
})
