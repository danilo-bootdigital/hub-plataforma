// Cloud API — chamadas HTTP à Graph API (envio + download de mídia).
// O HttpClient é INJETÁVEL: em produção usa o fetch global; nos testes é mockado
// (nenhuma chamada real à Meta). Isola a dependência de rede.

import type { AccountRef, OutboundContent, SendResult, MediaRef, FetchedMedia } from '../tipos'
import type { CloudApiConfig } from './config'

export interface HttpResponse {
  ok: boolean
  status: number
  json(): Promise<unknown>
  text(): Promise<string>
  arrayBuffer(): Promise<ArrayBuffer>
}
export interface HttpRequestInit {
  method?: string
  headers?: Record<string, string>
  body?: string
}
export type HttpClient = (url: string, init?: HttpRequestInit) => Promise<HttpResponse>

// Cliente padrão sobre o fetch global (Node 18+). Acessado via globalThis para não
// depender da lib DOM no typecheck. NUNCA é usado nos testes (http é injetado).
export const defaultHttp: HttpClient = async (url, init) => {
  const fetchFn = (globalThis as { fetch?: (u: string, i?: unknown) => Promise<HttpResponse> }).fetch
  if (!fetchFn) throw new Error('fetch global indisponível neste runtime')
  return fetchFn(url, init)
}

function authHeaders(config: CloudApiConfig, extra?: Record<string, string>): Record<string, string> {
  return { Authorization: `Bearer ${config.token}`, ...(extra ?? {}) }
}

export async function sendMessage(
  config: CloudApiConfig, http: HttpClient,
  account: AccountRef, to: string, content: OutboundContent,
): Promise<SendResult> {
  if (content.tipo !== 'texto') {
    throw new Error(`envio de tipo '${content.tipo}' não suportado na Fatia 0 (apenas 'texto')`)
  }
  if (!config.token) throw new Error('WHATSAPP_TOKEN não configurado')
  const url = `${config.graphBaseUrl}/${config.graphVersion}/${account.externalAccountId}/messages`
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { body: content.corpo ?? '' },
  }
  const res = await http(url, {
    method: 'POST',
    headers: authHeaders(config, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`Cloud API sendMessage falhou (HTTP ${res.status}): ${await res.text()}`)
  }
  const data = (await res.json()) as { messages?: Array<{ id?: string }> }
  const id = data.messages?.[0]?.id
  if (!id) throw new Error('Cloud API sendMessage: resposta sem message id')
  return { providerMessageId: id, status: 'enviada' }
}

export async function fetchMedia(
  config: CloudApiConfig, http: HttpClient, ref: MediaRef,
): Promise<FetchedMedia> {
  if (!config.token) throw new Error('WHATSAPP_TOKEN não configurado')
  // Passo 1: metadados da mídia (retorna a URL de download temporária).
  const metaUrl = `${config.graphBaseUrl}/${config.graphVersion}/${ref.providerMediaId}`
  const metaRes = await http(metaUrl, { headers: authHeaders(config) })
  if (!metaRes.ok) throw new Error(`Cloud API fetchMedia (metadados) falhou (HTTP ${metaRes.status})`)
  const meta = (await metaRes.json()) as { url?: string; mime_type?: string }
  if (!meta.url) throw new Error('Cloud API fetchMedia: metadados sem url')
  // Passo 2: download do binário (também exige Authorization).
  const binRes = await http(meta.url, { headers: authHeaders(config) })
  if (!binRes.ok) throw new Error(`Cloud API fetchMedia (download) falhou (HTTP ${binRes.status})`)
  const buf = await binRes.arrayBuffer()
  return {
    bytes: new Uint8Array(buf),
    mime: meta.mime_type ?? ref.mime ?? 'application/octet-stream',
    ...(ref.nomeArquivo ? { nomeArquivo: ref.nomeArquivo } : {}),
  }
}
