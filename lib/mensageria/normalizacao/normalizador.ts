// Mensageria (DEC-023 · Fatia 0, Etapa 8B.1) — Normalizador de domínio (PURO).
// Camada de anti-corrupção entre os adapters de provider e o domínio: recebe os DTOs
// já mapeados pelo ProviderAdapter (NormalizedInboundMessage / StatusEvent) e devolve
// um modelo CANÔNICO e VALIDADO — garantindo que QUALQUER provider produza exatamente
// o mesmo modelo de entrada. Sem I/O, sem DB, sem resolução de contato/identidade.
//
// ESCOPO 8B.1: só normalização/validação. NÃO cria conversation/message/identity/contact.

import type {
  NormalizedInboundMessage, NormalizedMessageTipo, MediaRef,
  StatusEvent, DeliveryStatusValor,
} from '../providers/tipos'

export type Resultado<T> = { ok: true; valor: T } | { ok: false; motivo: string }

const TIPOS: readonly NormalizedMessageTipo[] = [
  'texto', 'imagem', 'audio', 'video', 'documento', 'localizacao', 'contato', 'sistema',
]
const TIPOS_COM_MIDIA: readonly NormalizedMessageTipo[] = ['imagem', 'audio', 'video', 'documento']
const STATUS: readonly DeliveryStatusValor[] = ['enviada', 'entregue', 'lida', 'falha']

// Só dígitos (E.164 sem símbolos). Provider-agnóstico: normaliza '+55 (11) 9...' → '5511 9...'.
function soDigitos(s?: string): string | undefined {
  if (!s) return undefined
  const d = s.replace(/\D/g, '')
  return d.length > 0 ? d : undefined
}
function limpar(s?: string): string | undefined {
  if (s == null) return undefined
  const t = s.trim()
  return t.length > 0 ? t : undefined
}
function isoValido(s?: string): string | undefined {
  if (!s) return undefined
  const ms = Date.parse(s)
  return Number.isNaN(ms) ? undefined : new Date(ms).toISOString()
}
function normalizarMedia(m?: MediaRef): MediaRef | undefined {
  if (!m || !m.providerMediaId) return undefined
  const mime = limpar(m.mime)
  const nomeArquivo = limpar(m.nomeArquivo)
  return {
    providerMediaId: m.providerMediaId,
    ...(mime ? { mime } : {}),
    ...(nomeArquivo ? { nomeArquivo } : {}),
  }
}

// Normaliza uma mensagem de entrada em um NormalizedInboundMessage canônico.
// Rejeita (ok:false) quando faltam invariantes que o domínio exige a jusante.
export function normalizarMensagem(msg: NormalizedInboundMessage): Resultado<NormalizedInboundMessage> {
  const externalUserId = limpar(msg.externalUserId)
  if (!externalUserId) return { ok: false, motivo: 'externalUserId ausente' }

  const providerMessageId = limpar(msg.providerMessageId)
  if (!providerMessageId) return { ok: false, motivo: 'providerMessageId ausente' }

  // Tipo desconhecido/inválido é REJEITADO (não coage para 'sistema'): não mascarar
  // payload novo do provider nem bug de mapper. 'sistema' explícito é aceito (está em TIPOS).
  if (!(TIPOS as readonly string[]).includes(msg.tipo as string)) {
    return { ok: false, motivo: `tipo desconhecido/inválido: '${String(msg.tipo)}'` }
  }
  const tipo: NormalizedMessageTipo = msg.tipo

  const media = normalizarMedia(msg.media)
  if (TIPOS_COM_MIDIA.includes(tipo) && !media) {
    return { ok: false, motivo: `mídia ausente para tipo '${tipo}'` }
  }

  const telefone = soDigitos(msg.telefone)
  const displayName = limpar(msg.displayName)
  const corpo = limpar(msg.corpo)
  const ocorridoEm = isoValido(msg.ocorridoEm)

  const canonica: NormalizedInboundMessage = {
    externalUserId,
    providerMessageId,
    tipo,
    ...(telefone ? { telefone } : {}),
    ...(displayName ? { displayName } : {}),
    ...(corpo ? { corpo } : {}),
    ...(media ? { media } : {}),
    ...(ocorridoEm ? { ocorridoEm } : {}),
  }
  return { ok: true, valor: canonica }
}

// Normaliza/valida um evento de status de entrega em um StatusEvent canônico.
export function normalizarStatus(s: StatusEvent): Resultado<StatusEvent> {
  const externalEventId = limpar(s.externalEventId)
  if (!externalEventId) return { ok: false, motivo: 'externalEventId ausente' }

  const providerMessageId = limpar(s.providerMessageId)
  if (!providerMessageId) return { ok: false, motivo: 'providerMessageId ausente' }

  if (!(STATUS as readonly string[]).includes(s.status)) {
    return { ok: false, motivo: `status inválido: '${String(s.status)}'` }
  }

  const erro = limpar(s.erro)
  const ocorridoEm = isoValido(s.ocorridoEm)

  const canonico: StatusEvent = {
    externalEventId,
    accountExternalId: limpar(s.accountExternalId) ?? '',
    providerMessageId,
    status: s.status,
    ...(erro ? { erro } : {}),
    ...(ocorridoEm ? { ocorridoEm } : {}),
  }
  return { ok: true, valor: canonico }
}
