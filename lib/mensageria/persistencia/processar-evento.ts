// Mensageria (DEC-023 · Fatia 0, Etapa 8B.2) — processador de eventos do inbox.
// Implementa o `processar` que o poller (8A) injeta em `drenarInbox`: dado um evento
// reivindicado (payload BRUTO), re-parseia via adapter, acha o evento pelo external_event_id,
// normaliza (8B.1) e persiste (RPC communication_persistir_mensagem, injetada como `persistir`).
//
// ESCOPO 8B.2: só orquestração de persistência. NÃO baixa mídia, NÃO cria attachment,
// NÃO envia, NÃO agenda. Status events são ignorados (reconciliação é do envio/E9).

import type { EventoReivindicado, ResultadoProcessamento } from '../poller/poller'
import type { ProviderAdapter, NormalizedInboundMessage } from '../providers/tipos'
import { normalizarMensagem } from '../normalizacao/normalizador'

export type ResultadoPersistencia = 'criada' | 'duplicada' | 'conta_nao_encontrada'

export interface PersistirArgs {
  provider: string
  accountExternalId: string
  msg: NormalizedInboundMessage
}

export interface ProcessarDeps {
  resolveAdapter: (code: string) => ProviderAdapter          // registry.resolveProvider
  persistir: (args: PersistirArgs) => Promise<ResultadoPersistencia> // RPC communication_persistir_mensagem
}

export function criarProcessarEvento(deps: ProcessarDeps): (ev: EventoReivindicado) => Promise<ResultadoProcessamento> {
  return async (ev) => {
    let adapter: ProviderAdapter
    try {
      adapter = deps.resolveAdapter(ev.provider)
    } catch {
      return { ok: false, erro: `provider não registrado: ${ev.provider}` }
    }

    // (a) é uma MENSAGEM de entrada?
    const msgEvento = adapter.parseInbound(ev.payload).messages.find((m) => m.externalEventId === ev.external_event_id)
    if (msgEvento) {
      const norm = normalizarMensagem(msgEvento.message)
      if (!norm.ok) {
        // rejeição do normalizador → falha (poller reagenda com backoff e dead-leta no teto)
        return { ok: false, erro: `normalização: ${norm.motivo}` }
      }
      const resultado = await deps.persistir({
        provider: ev.provider,
        accountExternalId: msgEvento.accountExternalId,
        msg: norm.valor,
      })
      if (resultado === 'conta_nao_encontrada') {
        return { ok: false, erro: 'communication_account não encontrada' }
      }
      // 'criada' ou 'duplicada' → sucesso (idempotente)
      return { ok: true }
    }

    // (b) é um STATUS? Ignorado nesta fase (reconciliação de status é do envio/E9).
    const statusEvento = adapter.mapStatus(ev.payload).find((s) => s.externalEventId === ev.external_event_id)
    if (statusEvento) {
      return { ok: true }
    }

    // (c) não localizado no re-parse (anomalia determinística) → falha → dead-letter no teto.
    return { ok: false, erro: 'evento não localizado no payload reprocessado' }
  }
}
