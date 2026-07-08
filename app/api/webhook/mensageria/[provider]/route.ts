// Mensageria (DEC-023 · Fatia 0, Etapa 7) — Webhook receiver (route handler fino).
// Amarra Next + service-role client ao core puro (lib/mensageria/webhook-receiver).
// GET = verificação (challenge). POST = valida assinatura → grava no inbox → 200 rápido.
// NÃO normaliza, NÃO cria conversation/message (poller = Etapa 8). Agnóstico de provider
// (resolve pelo segmento [provider]); os adapters concretos vêm de register-all.

import { NextRequest, NextResponse } from 'next/server'
import '@/lib/mensageria/providers/register-all' // auto-registra os adapters no registry
import { resolveProvider } from '@/lib/mensageria/providers/registry'
import { receberWebhook, type InboxRow } from '@/lib/mensageria/webhook-receiver'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'        // node:crypto (HMAC) + service role
export const dynamic = 'force-dynamic' // webhook: sem cache

// Insere no inbox com dedup (ON CONFLICT DO NOTHING via upsert ignoreDuplicates).
// Service role: a tabela tem RLS ligada e SEM policy — só o service role escreve.
async function inserirInbox(rows: InboxRow[]): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('communication_inbound_events')
    .upsert(rows, { onConflict: 'provider,external_event_id', ignoreDuplicates: true })
  if (error) throw new Error(error.message)
}

async function handle(req: NextRequest, method: 'GET' | 'POST', provider: string) {
  const url = new URL(req.url)
  const query = Object.fromEntries(url.searchParams.entries())
  const headers = Object.fromEntries(req.headers.entries())
  const rawBody = method === 'POST' ? await req.text() : '' // bytes exatos p/ assinatura
  const res = await receberWebhook(
    { resolve: resolveProvider, inserirInbox },
    { provider, method, query, headers, rawBody },
  )
  return new NextResponse(res.body, { status: res.status })
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params
  return handle(req, 'GET', provider)
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params
  return handle(req, 'POST', provider)
}
