// Mensageria (DEC-023 · Fatia 0, Etapa 8B.2) — processador de eventos do inbox.
// Implementa o `processar` que o poller (8A) injeta em `drenarInbox`: dado um evento
// reivindicado (payload BRUTO), re-parseia via adapter, acha o evento pelo external_event_id,
// normaliza (8B.1) e persiste (RPC communication_persistir_mensagem, injetada como `persistir`).
//
// ESCOPO 8B.2: só orquestração de persistência de MENSAGEM. NÃO baixa mídia, NÃO cria
// attachment, NÃO envia, NÃO agenda.
// E9.5: o ramo de STATUS passa a reconciliar via RPC communication_aplicar_status
// (injetada como `aplicarStatus`), com a política aprovada de adiar/ignorado.

import type { EventoReivindicado, ResultadoProcessamento } from '../poller/poller'
import type { ProviderAdapter, NormalizedInboundMessage, DeliveryStatusValor } from '../providers/tipos'
import { normalizarMensagem, normalizarStatus } from '../normalizacao/normalizador'

export type ResultadoPersistencia = 'criada' | 'duplicada' | 'conta_nao_encontrada'

// Resultado da RPC communication_aplicar_status (077), campo `resultado`.
export type ResultadoAplicarStatus =
  | 'aplicado' | 'ignorado_duplicado' | 'ignorado_regressao' | 'mensagem_nao_encontrada'

export interface PersistirArgs {
  provider: string
  accountExternalId: string
  msg: NormalizedInboundMessage
}

export interface AplicarStatusArgs {
  provider: string
  providerMessageId: string
  status: DeliveryStatusValor
  erro?: string
  ocorridoEm?: string
}

// Janela de espera para status cujo wamid ainda não tem mensagem correspondente
// (corrida com confirmar_envio / caminho confirmacao_falhou). Dentro dela: adiar;
// depois: ignorar. Default 5 min; injetável para teste.
export const GRACE_STATUS_MS = 5 * 60_000

export interface ProcessarDeps {
  resolveAdapter: (code: string) => ProviderAdapter          // registry.resolveProvider
  persistir: (args: PersistirArgs) => Promise<ResultadoPersistencia> // RPC communication_persistir_mensagem
  aplicarStatus: (args: AplicarStatusArgs) => Promise<ResultadoAplicarStatus> // RPC communication_aplicar_status
  agora: () => number                                        // Date.now injetável (idade do evento)
  graceStatusMs?: number                                     // default GRACE_STATUS_MS
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

    // (b) é um STATUS de entrega? Reconcilia via RPC communication_aplicar_status (E9.5).
    const statusEvento = adapter.mapStatus(ev.payload).find((s) => s.externalEventId === ev.external_event_id)
    if (statusEvento) {
      const norm = normalizarStatus(statusEvento)
      if (!norm.ok) {
        return { ok: false, erro: `normalização (status): ${norm.motivo}` }
      }
      const resultado = await deps.aplicarStatus({
        provider: ev.provider,
        providerMessageId: norm.valor.providerMessageId,
        status: norm.valor.status,
        ...(norm.valor.erro ? { erro: norm.valor.erro } : {}),
        ...(norm.valor.ocorridoEm ? { ocorridoEm: norm.valor.ocorridoEm } : {}),
      })
      if (resultado === 'mensagem_nao_encontrada') {
        // Corrida: o status chegou antes de a mensagem ter wamid gravado. Jovem → adiar
        // (sem consumir tentativa); envelhecido → ignorar (terminal). A idade é wall-clock.
        const grace = deps.graceStatusMs ?? GRACE_STATUS_MS
        const recebidoMs = ev.recebido_em ? Date.parse(ev.recebido_em) : NaN
        const jovem = Number.isFinite(recebidoMs) && (deps.agora() - recebidoMs) < grace
        return jovem
          ? { ok: 'adiar', motivo: 'status sem mensagem correspondente (aguardando confirmação de envio)' }
          : { ok: 'ignorado', motivo: 'status sem mensagem correspondente após janela de espera' }
      }
      // aplicado | ignorado_duplicado | ignorado_regressao → processado (idempotente)
      return { ok: true }
    }

    // (c) não localizado no re-parse (anomalia determinística) → falha → dead-letter no teto.
    return { ok: false, erro: 'evento não localizado no payload reprocessado' }
  }
}
