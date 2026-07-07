// Mensageria — Driver de INTEGRAÇÃO ponta a ponta (DEC-023 · Fatia 0).
// Liga os COMPONENTES REAIS (webhook-receiver → poller → adapter Cloud API →
// normalizador → RPCs 073/074) contra um Postgres EFÊMERO real, via psql (child_process).
// NÃO usa mock/in-memory: as deps de banco chamam as RPCs reais. Roda como script:
// exit 0 = tudo passou; exit 1 = alguma asserção falhou. Conexão via env libpq (PGHOST/PGPORT).

import { execFileSync } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { receberWebhook, type InboxRow } from '../../lib/mensageria/webhook-receiver'
import { drenarInbox, type EventoReivindicado, type PollerDeps } from '../../lib/mensageria/poller/poller'
import type { TransicaoPatch } from '../../lib/mensageria/poller/transicao'
import { criarProcessarEvento, type PersistirArgs, type ResultadoPersistencia, type AplicarStatusArgs, type ResultadoAplicarStatus } from '../../lib/mensageria/persistencia/processar-evento'
import { createCloudApiAdapter } from '../../lib/mensageria/providers/cloud-api'
import type { ProviderAdapter } from '../../lib/mensageria/providers/tipos'

// ---------- psql helpers ----------
function psql(sql: string): string {
  return execFileSync('psql', ['-tA', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8' }).trim()
}
function lit(v: string | null | undefined): string {
  return v === null || v === undefined ? 'NULL' : `$x$${v}$x$`
}
function ts(v: string | null | undefined): string {
  return v === null || v === undefined ? 'NULL' : `$x$${v}$x$::timestamptz`
}
function jsonb(o: unknown): string { return `$j$${JSON.stringify(o)}$j$::jsonb` }
function n(sql: string): number { return parseInt(psql(sql) || '0', 10) }

// ---------- deps de banco REAIS (via psql) ----------
async function inserirInbox(rows: InboxRow[]): Promise<void> {
  for (const r of rows) {
    psql(`INSERT INTO communication_inbound_events(provider, external_event_id, account_external_id, payload, status, erro)
          VALUES (${lit(r.provider)}, ${lit(r.external_event_id)}, ${lit(r.account_external_id)}, ${jsonb(r.payload)}, ${lit(r.status)}, ${lit(r.erro)})
          ON CONFLICT (provider, external_event_id) DO NOTHING`)
  }
}
async function claim(limite: number, visibilidadeSeg: number, maxTentativas: number): Promise<EventoReivindicado[]> {
  const out = psql(`SELECT coalesce(json_agg(row_to_json(t)),'[]') FROM communication_inbound_claim(${limite},${visibilidadeSeg},${maxTentativas}) t`)
  const rows = JSON.parse(out) as Array<Record<string, unknown>>
  return rows.map((r) => ({
    id: String(r.id), provider: String(r.provider), external_event_id: String(r.external_event_id),
    account_external_id: (r.account_external_id as string | null) ?? null, payload: r.payload, tentativas: Number(r.tentativas),
    recebido_em: (r.created_at as string | null) ?? null,
  }))
}
async function persistir(args: PersistirArgs): Promise<ResultadoPersistencia> {
  const m = args.msg
  return psql(`SELECT communication_persistir_mensagem(${lit(args.provider)}, ${lit(args.accountExternalId)}, ${lit(m.externalUserId)}, ${lit(m.telefone)}, ${lit(m.displayName)}, ${lit(m.tipo)}, ${lit(m.corpo)}, ${lit(m.providerMessageId)}, ${ts(m.ocorridoEm)})`) as ResultadoPersistencia
}
async function aplicarStatus(args: AplicarStatusArgs): Promise<ResultadoAplicarStatus> {
  return psql(`SELECT (communication_aplicar_status(${lit(args.provider)}, ${lit(args.providerMessageId)}, ${lit(args.status)}, ${lit(args.erro)}, ${ts(args.ocorridoEm)}))->>'resultado'`) as ResultadoAplicarStatus
}
async function aplicar(id: string, p: TransicaoPatch): Promise<void> {
  psql(`UPDATE communication_inbound_events SET status=${lit(p.status)}, tentativas=${p.tentativas}, proxima_tentativa_em=${ts(p.proxima_tentativa_em)}, processado_em=${ts(p.processado_em)}, erro=${lit(p.erro)} WHERE id=${lit(id)}`)
}

// ---------- adapter real (config de teste p/ assinar o webhook) ----------
const APP_SECRET = 'e2e_secret'
const adapter: ProviderAdapter = createCloudApiAdapter({ config: { appSecret: APP_SECRET, verifyToken: 'vt', token: 't', graphBaseUrl: 'https://x', graphVersion: 'v21.0' } })
const resolve = (code: string): ProviderAdapter => { if (code === 'cloud_api') return adapter; throw new Error('provider desconhecido') }
const sig = (raw: string) => 'sha256=' + createHmac('sha256', APP_SECRET).update(raw).digest('hex')

const webhookDeps = { resolve, inserirInbox }
const pollerDeps: PollerDeps = { claim, processar: criarProcessarEvento({ resolveAdapter: resolve, persistir, aplicarStatus, agora: () => Date.now() }), aplicar, agora: () => Date.now() }

// ---------- asserts ----------
let falhas = 0
function ok(cond: boolean, msg: string) { if (cond) console.log(`  ✓ ${msg}`); else { console.log(`  ✗ ${msg}`); falhas++ } }
function eq(a: unknown, b: unknown, msg: string) { ok(a === b, `${msg} — obtido ${JSON.stringify(a)} / esperado ${JSON.stringify(b)}`) }

function payloadTexto(wamid: string, phone = 'PNID1') {
  return { object: 'whatsapp_business_account', entry: [{ id: 'WABA', changes: [{ field: 'messages', value: {
    metadata: { phone_number_id: phone }, contacts: [{ profile: { name: 'Fulano' }, wa_id: '5511999998888' }],
    messages: [{ from: '5511999998888', id: wamid, timestamp: '1700000000', type: 'text', text: { body: 'olá e2e' } }],
  } }] }] }
}

async function main() {
  // ===== 1. HAPPY PATH: webhook → inbox → poller → adapter → normalizador → RPC → domínio =====
  console.log('[1] Happy path (fluxo completo)')
  const p1 = payloadTexto('wamid.E2E1'); const raw1 = JSON.stringify(p1)
  const w1 = await receberWebhook(webhookDeps, { provider: 'cloud_api', method: 'POST', query: {}, headers: { 'x-hub-signature-256': sig(raw1) }, rawBody: raw1 })
  eq(w1.status, 200, 'webhook recebe (200)')
  eq(n(`SELECT count(*) FROM communication_inbound_events WHERE external_event_id='wamid.E2E1' AND status='pendente'`), 1, 'inbox grava (1 pendente)')
  const r1 = await drenarInbox(pollerDeps, { lote: 20, visibilidadeSeg: 300, maxTentativas: 5 })
  eq(r1.reivindicados, 1, 'poller reivindica (1)')
  eq(r1.processados, 1, 'poller processa (1)')
  eq(n(`SELECT count(*) FROM communication_conversations`), 1, 'conversation criada')
  eq(n(`SELECT count(*) FROM communication_conversation_participants WHERE tipo='externo'`), 1, 'participante externo criado')
  eq(n(`SELECT count(*) FROM communication_messages WHERE direction='inbound' AND tipo='texto' AND corpo='olá e2e'`), 1, 'message criada')
  eq(n(`SELECT count(*) FROM communication_messages WHERE sender_participant_id IS NOT NULL`), 1, 'message.sender_participant_id vinculado')
  eq(n(`SELECT count(*) FROM communication_message_events WHERE evento='recebida'`), 1, 'message_event recebida criada')
  eq(n(`SELECT unread_count FROM communication_conversations LIMIT 1`), 1, 'unread_count atualizado (1)')
  eq(psql(`SELECT (last_message_at IS NOT NULL) FROM communication_conversations LIMIT 1`), 't', 'last_message_at atualizado')
  eq(psql(`SELECT status FROM communication_inbound_events WHERE external_event_id='wamid.E2E1'`), 'processado', 'inbox marcado processado')

  // ===== 2. DEDUP no inbox: reentrega do mesmo wamid =====
  console.log('[2] Reentrega (dedup no inbox)')
  await receberWebhook(webhookDeps, { provider: 'cloud_api', method: 'POST', query: {}, headers: { 'x-hub-signature-256': sig(raw1) }, rawBody: raw1 })
  eq(n(`SELECT count(*) FROM communication_inbound_events WHERE external_event_id='wamid.E2E1'`), 1, 'reentrega não duplica no inbox')
  eq(n(`SELECT count(*) FROM communication_messages`), 1, 'nenhuma message extra')

  // ===== 3. PAYLOAD INVÁLIDO (JSON) → dead-letter no webhook =====
  console.log('[3] Payload inválido (JSON) → dead-letter')
  const rawBad = 'isto-não-é-json{'
  const w3 = await receberWebhook(webhookDeps, { provider: 'cloud_api', method: 'POST', query: {}, headers: { 'x-hub-signature-256': sig(rawBad) }, rawBody: rawBad })
  eq(w3.status, 200, 'webhook responde 200 (ack)')
  eq(n(`SELECT count(*) FROM communication_inbound_events WHERE external_event_id LIKE 'raw:%' AND status='erro'`), 1, 'dead-letter gravado (status=erro)')

  // ===== 4. ACCOUNT INEXISTENTE → retry → dead-letter =====
  console.log('[4] Account inexistente → retry → dead-letter')
  const p4 = payloadTexto('wamid.NOACC', 'DESCONHECIDO'); const raw4 = JSON.stringify(p4)
  await receberWebhook(webhookDeps, { provider: 'cloud_api', method: 'POST', query: {}, headers: { 'x-hub-signature-256': sig(raw4) }, rawBody: raw4 })
  for (let i = 0; i < 4; i++) await drenarInbox(pollerDeps, { lote: 20, visibilidadeSeg: 0, maxTentativas: 3, backoffBaseSeg: 0 })
  eq(psql(`SELECT status||':'||tentativas FROM communication_inbound_events WHERE external_event_id='wamid.NOACC'`), 'erro:3', 'account inexistente vira dead-letter no teto')
  eq(n(`SELECT count(*) FROM communication_conversations`), 1, 'nenhuma conversa criada p/ conta inexistente')

  // ===== 5. NORMALIZADOR REJEITANDO (imagem sem media id) → retry → dead-letter =====
  console.log('[5] Normalizador rejeitando → dead-letter')
  const p5 = { object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: {
    metadata: { phone_number_id: 'PNID1' }, contacts: [{ profile: { name: 'X' }, wa_id: '5511888887777' }],
    messages: [{ from: '5511888887777', id: 'wamid.NOIMG', timestamp: '1700000001', type: 'image', image: { mime_type: 'image/jpeg' } }], // sem image.id
  } }] }] }
  const raw5 = JSON.stringify(p5)
  await receberWebhook(webhookDeps, { provider: 'cloud_api', method: 'POST', query: {}, headers: { 'x-hub-signature-256': sig(raw5) }, rawBody: raw5 })
  const msgsAntes = n(`SELECT count(*) FROM communication_messages`)
  for (let i = 0; i < 4; i++) await drenarInbox(pollerDeps, { lote: 20, visibilidadeSeg: 0, maxTentativas: 3, backoffBaseSeg: 0 })
  eq(psql(`SELECT status FROM communication_inbound_events WHERE external_event_id='wamid.NOIMG'`), 'erro', 'normalizador reject vira dead-letter')
  eq(n(`SELECT count(*) FROM communication_messages`), msgsAntes, 'nenhuma message criada para o rejeitado')

  // ===== 6. IDEMPOTÊNCIA de provider_message_id: 2ª mensagem real + reprocesso =====
  console.log('[6] Segunda mensagem (mesma conversa) + unread incrementa')
  const p6 = payloadTexto('wamid.E2E2'); const raw6 = JSON.stringify(p6)
  await receberWebhook(webhookDeps, { provider: 'cloud_api', method: 'POST', query: {}, headers: { 'x-hub-signature-256': sig(raw6) }, rawBody: raw6 })
  await drenarInbox(pollerDeps, { lote: 20, visibilidadeSeg: 300, maxTentativas: 5 })
  eq(n(`SELECT count(*) FROM communication_conversations`), 1, 'ainda 1 conversa (mesmo contato)')
  eq(n(`SELECT count(*) FROM communication_messages WHERE direction='inbound'`), 2, '2 mensagens inbound')
  eq(n(`SELECT unread_count FROM communication_conversations LIMIT 1`), 2, 'unread_count = 2')

  console.log(`\n== ${falhas === 0 ? '✅ TODOS OS CENÁRIOS E2E PASSARAM' : `❌ ${falhas} ASSERÇÃO(ÕES) FALHARAM`} ==`)
  process.exit(falhas === 0 ? 0 : 1)
}

main().catch((e) => { console.error('ERRO no driver e2e:', e); process.exit(1) })
