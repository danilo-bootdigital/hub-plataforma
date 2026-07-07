// Mensageria (DEC-023 · Fatia 0, Etapa 7) — CORE do webhook receiver.
// Lógica pura e testável (sem Next, sem Supabase, sem I/O direto): recebe uma
// requisição normalizada + dependências injetadas e decide status/corpo + o que
// gravar no inbox. O route handler (app/) apenas amarra Next + admin client a isto.
//
// ESCOPO: só grava em communication_inbound_events (inbox bruto idempotente) e
// responde rápido. NÃO normaliza, NÃO cria conversation/message (poller = Etapa 8).
//
// POLÍTICA (oficial) de recepção POST (após assinatura VÁLIDA):
//  - JSON inválido            → 200 + DEAD-LETTER (status='erro'); nada é descartado.
//  - JSON válido, 0 eventos   → 200 + DEAD-LETTER (status='erro'); payload autêntico preservado.
//  - eventos interpretáveis   → 200 + linhas 'pendente' (poller processa depois).
//  - assinatura inválida      → 401, não grava nada.
//  - falha transitória grava  → 500 (provider reenvia; dedup protege).
// Dead-letter usa external_event_id = 'raw:' + sha256(rawBody) → idempotente no reenvio.

import { createHash } from 'node:crypto'
import type { ProviderAdapter } from './providers/tipos'

export interface InboxRow {
  provider: string
  external_event_id: string
  account_external_id: string | null
  payload: unknown                 // jsonb: evento bruto, ou { raw } quando o corpo não é JSON
  status: 'pendente' | 'erro'      // 'erro' = dead-letter (não processável pelo poller)
  erro: string | null              // motivo, quando dead-letter
}

export interface WebhookInput {
  provider: string
  method: 'GET' | 'POST'
  query: Record<string, string | undefined>
  headers: Record<string, string | undefined>
  rawBody: string
}

export interface WebhookDeps {
  resolve: (code: string) => ProviderAdapter          // registry.resolveProvider
  inserirInbox: (rows: InboxRow[]) => Promise<void>    // upsert ON CONFLICT DO NOTHING (service role)
}

export interface WebhookResult { status: number; body: string }

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

function eventRow(provider: string, externalEventId: string, accountExternalId: string, payload: unknown): InboxRow {
  return { provider, external_event_id: externalEventId, account_external_id: accountExternalId || null, payload, status: 'pendente', erro: null }
}

function deadLetterRow(provider: string, rawBody: string, payload: unknown, erro: string): InboxRow {
  return { provider, external_event_id: `raw:${sha256(rawBody)}`, account_external_id: null, payload, status: 'erro', erro }
}

// Persiste e traduz falha transitória em 500 (retry deduplicado). rows sempre >= 1 aqui.
async function persistir(deps: WebhookDeps, rows: InboxRow[]): Promise<WebhookResult> {
  try {
    await deps.inserirInbox(rows)
  } catch {
    return { status: 500, body: 'inbox write failed' }
  }
  return { status: 200, body: 'ok' }
}

export async function receberWebhook(deps: WebhookDeps, input: WebhookInput): Promise<WebhookResult> {
  let adapter: ProviderAdapter
  try {
    adapter = deps.resolve(input.provider)
  } catch {
    return { status: 404, body: 'unknown provider' }
  }

  // GET: verificação de subscrição (challenge). Não escreve nada.
  if (input.method === 'GET') {
    const v = adapter.verifyWebhook({ method: 'GET', query: input.query, headers: input.headers, rawBody: '' })
    return v.ok ? { status: 200, body: v.challenge ?? 'ok' } : { status: 403, body: 'forbidden' }
  }

  // POST: valida assinatura ANTES de qualquer processamento/escrita.
  const v = adapter.verifyWebhook({ method: 'POST', query: input.query, headers: input.headers, rawBody: input.rawBody })
  if (!v.ok) return { status: 401, body: 'invalid signature' }

  // (2) JSON inválido → dead-letter (payload autêntico encapsulado em { raw }).
  let parsed: unknown
  try {
    parsed = JSON.parse(input.rawBody || '{}')
  } catch {
    return persistir(deps, [
      deadLetterRow(input.provider, input.rawBody, { raw: input.rawBody }, 'JSON inválido no corpo do webhook'),
    ])
  }

  // Eventos interpretáveis (mensagens + status).
  const rows: InboxRow[] = []
  for (const m of adapter.parseInbound(parsed).messages) {
    rows.push(eventRow(input.provider, m.externalEventId, m.accountExternalId, parsed))
  }
  for (const s of adapter.mapStatus(parsed)) {
    rows.push(eventRow(input.provider, s.externalEventId, s.accountExternalId, parsed))
  }

  // (3) JSON válido mas nenhum evento interpretável → dead-letter (não descartar em silêncio).
  if (rows.length === 0) {
    return persistir(deps, [
      deadLetterRow(input.provider, input.rawBody, parsed, 'payload autêntico sem eventos interpretáveis'),
    ])
  }

  // (1) eventos → linhas 'pendente' para o poller (Etapa 8).
  return persistir(deps, rows)
}
