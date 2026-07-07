// Mensageria (DEC-023 · Fatia 0, Etapa 5) — CONTRATO da camada de providers.
// Definição PURA (sem I/O, sem DB, sem alias @/). É a fronteira única entre o
// domínio (agnóstico) e cada provider concreto (Cloud API, etc., em Etapa 6+).
//
// Regra de fronteira: NENHUM nome de provider (Meta/Cloud API/WhatsApp/Evolution)
// aparece aqui nem no domínio — só dentro de lib/mensageria/providers/<code>/.
//
// Os tipos abaixo MAPEIAM ao domínio (CommMessage*/CommMessageStatus em
// types/database.ts), mas são mantidos independentes para o contrato não depender
// de aliases nem do schema — mantém os testes de contrato isolados.

// --- Vocabulário normalizado (espelha o domínio, sem importá-lo) ---
export type NormalizedMessageTipo =
  | 'texto' | 'imagem' | 'audio' | 'video' | 'documento' | 'localizacao' | 'contato' | 'sistema'

// Status de entrega REPORTADO pelo provider (subconjunto de CommMessageStatus do domínio;
// 'recebida'/'enfileirada' são estados internos, não vêm do provider).
export type DeliveryStatusValor = 'enviada' | 'entregue' | 'lida' | 'falha'

// --- Mídia ---
export interface MediaRef {
  providerMediaId: string          // id da mídia no provider (para download sob demanda)
  mime?: string
  nomeArquivo?: string
}

export interface FetchedMedia {
  bytes: Uint8Array
  mime: string
  nomeArquivo?: string
}

// --- Entrada (webhook → eventos normalizados) ---
export interface NormalizedInboundMessage {
  externalUserId: string           // id do participante no provider (ex.: wa_id)
  telefone?: string                // E.164 quando disponível
  displayName?: string
  providerMessageId: string        // id da mensagem no provider (ex.: wamid) — idempotência
  tipo: NormalizedMessageTipo
  corpo?: string                   // texto normalizado
  media?: MediaRef
  ocorridoEm?: string              // ISO 8601, quando o provider informa
}

// Evento de MENSAGEM de entrada, com a chave de dedup do inbox e a conta de destino.
export interface InboundMessageEvent {
  externalEventId: string          // id ESTÁVEL p/ dedup em communication_inbound_events
  accountExternalId: string        // ex.: PHONE_NUMBER_ID → resolve a communication_account
  message: NormalizedInboundMessage
}

// Evento de STATUS de entrega (callback do provider sobre uma mensagem já enviada).
export interface StatusEvent {
  externalEventId: string          // id estável p/ dedup
  accountExternalId: string
  providerMessageId: string        // a qual mensagem o status se refere
  status: DeliveryStatusValor
  erro?: string
  ocorridoEm?: string
}

export interface InboundParseResult {
  messages: InboundMessageEvent[]  // mensagens de entrada normalizadas
}

// --- Saída (envio) ---
export interface OutboundContent {
  tipo: NormalizedMessageTipo
  corpo?: string
  media?: MediaRef
}

export interface SendResult {
  providerMessageId: string        // id atribuído pelo provider à mensagem enviada
  status: DeliveryStatusValor      // status inicial (normalmente 'enviada')
}

// Referência abstrata da conta conectada. Segredos/tokens NÃO trafegam aqui — o
// adapter os obtém do ambiente (env), fora do domínio (DEC-023 §2/§7).
export interface AccountRef {
  externalAccountId: string        // ex.: PHONE_NUMBER_ID
}

// --- Webhook (abstração do request de entrada, provider-agnóstica) ---
export interface IncomingWebhook {
  method: 'GET' | 'POST'
  query: Record<string, string | undefined>
  headers: Record<string, string | undefined>
  rawBody: string
}

export type WebhookVerification =
  | { ok: true; challenge?: string }   // GET de verificação devolve challenge; POST assinado ok
  | { ok: false; motivo: string }

// ============================================================================
// Contrato que TODO provider deve implementar (blueprint §5.2).
// Só estas operações são conhecidas pelo domínio.
// ============================================================================
export interface ProviderAdapter {
  readonly code: string                       // code em communication_providers (ex.: 'cloud_api')
  readonly channels: readonly string[]        // canais atendidos (ex.: ['whatsapp'])

  // Valida verificação (GET challenge) e assinatura (POST). NÃO decide negócio.
  verifyWebhook(req: IncomingWebhook): WebhookVerification

  // Normaliza o payload de entrada em eventos de mensagem (com externalEventId estável).
  parseInbound(payload: unknown): InboundParseResult

  // Extrai atualizações de status de entrega do payload (callbacks do provider).
  mapStatus(payload: unknown): StatusEvent[]

  // Envia uma mensagem. I/O externo — implementado no adapter concreto (Etapa 6+).
  sendMessage(account: AccountRef, to: string, content: OutboundContent): Promise<SendResult>

  // Baixa uma mídia referenciada (para gravar no bucket privado). I/O externo.
  fetchMedia(ref: MediaRef): Promise<FetchedMedia>
}
