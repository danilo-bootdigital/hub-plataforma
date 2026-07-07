// Testes do processador de eventos (DEC-023 · Fatia 0, Etapa 8B.2). node:test.
// Unit (fakes) + integração TS: drenarInbox (8A) + criarProcessarEvento + adapter Cloud API real.

import test from 'node:test'
import assert from 'node:assert/strict'
import { criarProcessarEvento, type PersistirArgs, type ResultadoPersistencia, type AplicarStatusArgs, type ResultadoAplicarStatus } from '../processar-evento'
import { drenarInbox, type EventoReivindicado, type PollerDeps } from '../../poller/poller'
import type { TransicaoPatch } from '../../poller/transicao'
import type {
  ProviderAdapter, IncomingWebhook, InboundParseResult, StatusEvent,
  SendResult, FetchedMedia, AccountRef, OutboundContent, MediaRef,
} from '../../providers/tipos'
import { createCloudApiAdapter } from '../../providers/cloud-api'

function ev(over: Partial<EventoReivindicado> = {}): EventoReivindicado {
  return { id: 'row1', provider: 'cloud_api', external_event_id: 'evt-1', account_external_id: 'PNID1', payload: {}, tentativas: 1, ...over }
}

// adapter fake: 1 mensagem (evt-1) + 1 status (evt-st)
function fakeAdapter(msgOver: Record<string, unknown> = {}): ProviderAdapter {
  return {
    code: 'cloud_api', channels: ['whatsapp'],
    verifyWebhook(_r: IncomingWebhook) { return { ok: true } },
    parseInbound(_p: unknown): InboundParseResult {
      return { messages: [{ externalEventId: 'evt-1', accountExternalId: 'PNID1', message: { externalUserId: 'wa1', providerMessageId: 'wamid.1', tipo: 'texto', corpo: 'oi', ...msgOver } as never }] }
    },
    mapStatus(_p: unknown): StatusEvent[] { return [{ externalEventId: 'evt-st', accountExternalId: 'PNID1', providerMessageId: 'wamid.1', status: 'entregue' }] },
    async sendMessage(_a: AccountRef, _t: string, _c: OutboundContent): Promise<SendResult> { return { providerMessageId: 'x', status: 'enviada' } },
    async fetchMedia(_r: MediaRef): Promise<FetchedMedia> { return { bytes: new Uint8Array(), mime: 'x' } },
  }
}

const T0 = 1_700_000_000_000

function deps(over: {
  persistirResultado?: ResultadoPersistencia
  adapter?: ProviderAdapter
  aplicarStatusResultado?: ResultadoAplicarStatus
  agoraMs?: number
  graceStatusMs?: number
} = {}) {
  const chamadas: PersistirArgs[] = []
  const statusChamadas: AplicarStatusArgs[] = []
  const d = criarProcessarEvento({
    resolveAdapter: (code) => { if (code === 'cloud_api') return over.adapter ?? fakeAdapter(); throw new Error('não registrado') },
    persistir: async (args) => { chamadas.push(args); return over.persistirResultado ?? 'criada' },
    aplicarStatus: async (args) => { statusChamadas.push(args); return over.aplicarStatusResultado ?? 'aplicado' },
    agora: () => over.agoraMs ?? T0,
    graceStatusMs: over.graceStatusMs,
  })
  return { processar: d, chamadas, statusChamadas }
}

test('mensagem → normaliza e persiste (ok)', async () => {
  const { processar, chamadas } = deps()
  const r = await processar(ev())
  assert.deepEqual(r, { ok: true })
  assert.equal(chamadas.length, 1)
  assert.equal(chamadas[0].provider, 'cloud_api')
  assert.equal(chamadas[0].accountExternalId, 'PNID1')
  assert.equal(chamadas[0].msg.providerMessageId, 'wamid.1')
  assert.equal(chamadas[0].msg.tipo, 'texto')
})

test('duplicada → sucesso (idempotente)', async () => {
  const { processar } = deps({ persistirResultado: 'duplicada' })
  assert.deepEqual(await processar(ev()), { ok: true })
})

test('conta_nao_encontrada → falha (dead-letter a jusante)', async () => {
  const { processar } = deps({ persistirResultado: 'conta_nao_encontrada' })
  const r = await processar(ev())
  assert.ok(!r.ok && /account/i.test(r.erro))
})

test('normalizador rejeita → falha, sem persistir', async () => {
  const { processar, chamadas } = deps({ adapter: fakeAdapter({ externalUserId: '' }) })
  const r = await processar(ev())
  assert.ok(!r.ok && /normaliz/.test(r.erro))
  assert.equal(chamadas.length, 0)
})

test('status event aplicado → ok, chama aplicarStatus (não persiste mensagem)', async () => {
  const { processar, chamadas, statusChamadas } = deps({ aplicarStatusResultado: 'aplicado' })
  const r = await processar(ev({ external_event_id: 'evt-st' }))
  assert.deepEqual(r, { ok: true })
  assert.equal(chamadas.length, 0)
  assert.equal(statusChamadas.length, 1)
  assert.equal(statusChamadas[0].provider, 'cloud_api')
  assert.equal(statusChamadas[0].providerMessageId, 'wamid.1')
  assert.equal(statusChamadas[0].status, 'entregue')
})

for (const resultado of ['ignorado_duplicado', 'ignorado_regressao'] as const) {
  test(`status ${resultado} → ok (idempotente)`, async () => {
    const { processar } = deps({ aplicarStatusResultado: resultado })
    assert.deepEqual(await processar(ev({ external_event_id: 'evt-st' })), { ok: true })
  })
}

test('status mensagem_nao_encontrada JOVEM → adiar (não consome tentativa)', async () => {
  const { processar } = deps({ aplicarStatusResultado: 'mensagem_nao_encontrada', agoraMs: T0 })
  const r = await processar(ev({ external_event_id: 'evt-st', recebido_em: new Date(T0 - 1_000).toISOString() }))
  assert.equal(r.ok, 'adiar')
})

test('status mensagem_nao_encontrada ENVELHECIDO → ignorado (terminal)', async () => {
  const { processar } = deps({ aplicarStatusResultado: 'mensagem_nao_encontrada', agoraMs: T0 })
  const r = await processar(ev({ external_event_id: 'evt-st', recebido_em: new Date(T0 - 10 * 60_000).toISOString() }))
  assert.equal(r.ok, 'ignorado')
})

test('status mensagem_nao_encontrada sem recebido_em → ignorado (evita loop infinito)', async () => {
  const { processar } = deps({ aplicarStatusResultado: 'mensagem_nao_encontrada', agoraMs: T0 })
  const r = await processar(ev({ external_event_id: 'evt-st' }))  // recebido_em ausente
  assert.equal(r.ok, 'ignorado')
})

test('status com providerMessageId ausente → falha (normalizador rejeita), sem aplicarStatus', async () => {
  const adapter = fakeAdapter()
  adapter.mapStatus = () => [{ externalEventId: 'evt-st', accountExternalId: 'PNID1', providerMessageId: '', status: 'entregue' }]
  const { processar, statusChamadas } = deps({ adapter })
  const r = await processar(ev({ external_event_id: 'evt-st' }))
  assert.ok(!(r.ok === true) && r.ok === false && /normaliz/.test((r as { erro: string }).erro))
  assert.equal(statusChamadas.length, 0)
})

test('provider não registrado → falha', async () => {
  const { processar } = deps()
  const r = await processar(ev({ provider: 'zzz' }))
  assert.ok(!r.ok && /não registrado/.test(r.erro))
})

test('evento não localizado no payload → falha', async () => {
  const { processar } = deps()
  const r = await processar(ev({ external_event_id: 'inexistente' }))
  assert.ok(!r.ok && /não localizado/.test(r.erro))
})

// --- Integração: poller (8A) + processar + adapter Cloud API real ---
test('integração: drenarInbox processa payload REAL do Cloud API e persiste normalizado', async () => {
  const cloud = createCloudApiAdapter({ config: { token: 't', appSecret: 's', verifyToken: 'v' } })
  const payloadReal = {
    object: 'whatsapp_business_account',
    entry: [{ id: 'WABA', changes: [{ field: 'messages', value: {
      metadata: { phone_number_id: 'PNID1' },
      contacts: [{ profile: { name: 'Fulano' }, wa_id: '5511999998888' }],
      messages: [{ from: '5511999998888', id: 'wamid.REAL', timestamp: '1700000000', type: 'text', text: { body: 'olá' } }],
    } }] }],
  }
  const persistidas: PersistirArgs[] = []
  const aplicados: Array<{ id: string; patch: TransicaoPatch }> = []
  const processar = criarProcessarEvento({
    resolveAdapter: (code) => { if (code === 'cloud_api') return cloud; throw new Error('x') },
    persistir: async (a) => { persistidas.push(a); return 'criada' },
    aplicarStatus: async () => 'aplicado',
    agora: () => 1_700_000_000_000,
  })
  const pollerDeps: PollerDeps = {
    claim: async () => [ev({ external_event_id: 'wamid.REAL', payload: payloadReal })],
    processar,
    aplicar: async (id, patch) => { aplicados.push({ id, patch }) },
    agora: () => 1_700_000_000_000,
  }
  const resumo = await drenarInbox(pollerDeps)
  assert.deepEqual(resumo, { reivindicados: 1, processados: 1, reagendados: 0, deadletter: 0 })
  assert.equal(persistidas.length, 1)
  assert.equal(persistidas[0].msg.providerMessageId, 'wamid.REAL')
  assert.equal(persistidas[0].msg.corpo, 'olá')
  assert.equal(persistidas[0].msg.telefone, '5511999998888')
  assert.equal(persistidas[0].msg.displayName, 'Fulano')
  assert.equal(aplicados[0].patch.status, 'processado')
})
