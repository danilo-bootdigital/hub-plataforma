// Mensageria (DEC-023 · Fatia 0) — dependências REAIS do poller (service-role).
// Monta PollerDeps (claim/processar/aplicar) ligando as RPCs 073/074 + a transição do
// inbox via createAdminClient. É I/O (glue) — validado por tsc/dry-run das RPCs, não por
// unit test. EXCLUÍDO do tsconfig.mensageria (usa @/ alias e supabase-js).

import '@/lib/mensageria/providers/register-all' // auto-registra adapters no registry
import { resolveProvider } from '@/lib/mensageria/providers/registry'
import { createAdminClient } from '@/lib/supabase/admin'
import { criarProcessarEvento, type PersistirArgs, type ResultadoPersistencia } from '@/lib/mensageria/persistencia/processar-evento'
import type { PollerDeps, EventoReivindicado } from '@/lib/mensageria/poller/poller'
import type { TransicaoPatch } from '@/lib/mensageria/poller/transicao'

type AdminClient = ReturnType<typeof createAdminClient>

async function claim(admin: AdminClient, limite: number, visibilidadeSeg: number, maxTentativas: number): Promise<EventoReivindicado[]> {
  const { data, error } = await admin.rpc('communication_inbound_claim', {
    p_limit: limite, p_visibilidade_seg: visibilidadeSeg, p_max_tentativas: maxTentativas,
  })
  if (error) throw new Error(`claim RPC: ${error.message}`)
  const rows = (data ?? []) as Array<Record<string, unknown>>
  return rows.map((row) => ({
    id: String(row.id),
    provider: String(row.provider),
    external_event_id: String(row.external_event_id),
    account_external_id: (row.account_external_id as string | null) ?? null,
    payload: row.payload,
    tentativas: Number(row.tentativas),
  }))
}

async function persistir(admin: AdminClient, args: PersistirArgs): Promise<ResultadoPersistencia> {
  const m = args.msg
  const { data, error } = await admin.rpc('communication_persistir_mensagem', {
    p_provider: args.provider,
    p_account_external_id: args.accountExternalId,
    p_external_user_id: m.externalUserId,
    p_telefone: m.telefone ?? null,
    p_display_name: m.displayName ?? null,
    p_tipo: m.tipo,
    p_corpo: m.corpo ?? null,
    p_provider_message_id: m.providerMessageId,
    p_ocorrido_em: m.ocorridoEm ?? null,
  })
  if (error) throw new Error(`persistir RPC: ${error.message}`)
  return data as ResultadoPersistencia
}

async function aplicar(admin: AdminClient, id: string, patch: TransicaoPatch): Promise<void> {
  const { error } = await admin
    .from('communication_inbound_events')
    .update({
      status: patch.status,
      tentativas: patch.tentativas,
      proxima_tentativa_em: patch.proxima_tentativa_em,
      processado_em: patch.processado_em,
      erro: patch.erro,
    })
    .eq('id', id)
  if (error) throw new Error(`aplicar transição no inbox: ${error.message}`)
}

// Constrói as deps reais do poller (1 admin client por invocação).
export function criarPollerDepsSupabase(): PollerDeps {
  const admin = createAdminClient()
  return {
    claim: (limite, visibilidadeSeg, maxTentativas) => claim(admin, limite, visibilidadeSeg, maxTentativas),
    processar: criarProcessarEvento({
      resolveAdapter: resolveProvider,
      persistir: (a) => persistir(admin, a),
    }),
    aplicar: (id, patch) => aplicar(admin, id, patch),
    agora: () => Date.now(),
  }
}
