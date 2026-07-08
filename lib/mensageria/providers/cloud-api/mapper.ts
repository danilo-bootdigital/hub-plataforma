// Cloud API — normalização de payloads (PURO: sem I/O, sem crypto).
// Converte o formato bruto da Meta/Cloud API nos DTOs do contrato (../tipos).
// Este é o ÚNICO lugar (junto de webhook/client) que conhece o formato do provider.

import type {
  InboundParseResult, InboundMessageEvent, StatusEvent,
  NormalizedMessageTipo, DeliveryStatusValor, MediaRef,
} from '../tipos'

// --- Formato bruto do webhook Cloud API (tolerante; tudo opcional) ---
interface CAMedia { id?: string; mime_type?: string; caption?: string; filename?: string }
interface CAMessage {
  from?: string; id?: string; timestamp?: string; type?: string
  text?: { body?: string }
  image?: CAMedia; audio?: CAMedia; video?: CAMedia; document?: CAMedia; sticker?: CAMedia
  location?: { latitude?: number; longitude?: number; name?: string }
}
interface CAStatus {
  id?: string; status?: string; timestamp?: string; recipient_id?: string
  errors?: Array<{ title?: string; message?: string }>
}
interface CAValue {
  metadata?: { phone_number_id?: string; display_phone_number?: string }
  contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>
  messages?: CAMessage[]
  statuses?: CAStatus[]
}
interface CAWebhook {
  object?: string
  entry?: Array<{ id?: string; changes?: Array<{ field?: string; value?: CAValue }> }>
}

function isoFromUnix(ts?: string): string | undefined {
  if (!ts) return undefined
  const n = Number(ts)
  if (!Number.isFinite(n)) return undefined
  return new Date(n * 1000).toISOString()
}

function mediaRef(media?: CAMedia): MediaRef | undefined {
  if (!media?.id) return undefined
  return {
    providerMediaId: media.id,
    ...(media.mime_type ? { mime: media.mime_type } : {}),
    ...(media.filename ? { nomeArquivo: media.filename } : {}),
  }
}

function mapContent(m: CAMessage): { tipo: NormalizedMessageTipo; corpo?: string; media?: MediaRef } {
  switch (m.type) {
    case 'text': return { tipo: 'texto', corpo: m.text?.body }
    case 'image': return { tipo: 'imagem', corpo: m.image?.caption, media: mediaRef(m.image) }
    case 'audio': return { tipo: 'audio', media: mediaRef(m.audio) }
    case 'video': return { tipo: 'video', corpo: m.video?.caption, media: mediaRef(m.video) }
    case 'document': return { tipo: 'documento', corpo: m.document?.caption, media: mediaRef(m.document) }
    case 'sticker': return { tipo: 'imagem', media: mediaRef(m.sticker) }
    case 'location':
      return { tipo: 'localizacao', corpo: m.location ? `${m.location.latitude},${m.location.longitude}` : undefined }
    case 'contacts': return { tipo: 'contato' }
    default: return { tipo: 'sistema', corpo: m.type }
  }
}

const STATUS_MAP: Record<string, DeliveryStatusValor> = {
  sent: 'enviada', delivered: 'entregue', read: 'lida', failed: 'falha',
}

// Mensagens de ENTRADA → InboundMessageEvent[] (externalEventId = wamid, único).
export function parseInbound(payload: unknown): InboundParseResult {
  const wh = (payload ?? {}) as CAWebhook
  const messages: InboundMessageEvent[] = []
  for (const entry of wh.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value
      if (!value?.messages?.length) continue
      const accountExternalId = value.metadata?.phone_number_id ?? ''
      const nameByWaId = new Map<string, string | undefined>(
        (value.contacts ?? []).map((c) => [c.wa_id ?? '', c.profile?.name]),
      )
      for (const m of value.messages) {
        if (!m.id) continue
        const { tipo, corpo, media } = mapContent(m)
        const from = m.from ?? ''
        messages.push({
          externalEventId: m.id,             // wamid é globalmente único → dedup
          accountExternalId,
          message: {
            externalUserId: from,
            ...(from ? { telefone: from } : {}),          // wa_id = dígitos E.164 (sem '+')
            ...(nameByWaId.get(from) ? { displayName: nameByWaId.get(from) } : {}),
            providerMessageId: m.id,
            tipo,
            ...(corpo != null ? { corpo } : {}),
            ...(media ? { media } : {}),
            ...(isoFromUnix(m.timestamp) ? { ocorridoEm: isoFromUnix(m.timestamp) } : {}),
          },
        })
      }
    }
  }
  return { messages }
}

// Callbacks de STATUS → StatusEvent[] (externalEventId = wamid:status, único por transição).
export function mapStatus(payload: unknown): StatusEvent[] {
  const wh = (payload ?? {}) as CAWebhook
  const out: StatusEvent[] = []
  for (const entry of wh.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value
      if (!value?.statuses?.length) continue
      const accountExternalId = value.metadata?.phone_number_id ?? ''
      for (const s of value.statuses) {
        if (!s.id || !s.status) continue
        const status = STATUS_MAP[s.status]
        if (!status) continue
        const erro = s.errors?.[0]?.title ?? s.errors?.[0]?.message
        out.push({
          externalEventId: `${s.id}:${s.status}`,
          accountExternalId,
          providerMessageId: s.id,
          status,
          ...(erro ? { erro } : {}),
          ...(isoFromUnix(s.timestamp) ? { ocorridoEm: isoFromUnix(s.timestamp) } : {}),
        })
      }
    }
  }
  return out
}
