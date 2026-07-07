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

// Timeout padrão do HTTP real (ms). Seguro para a Graph API (Meta recomenda margem
// ampla; sendMessage/fetchMedia são interativos). Configurável por env/argumento.
export const DEFAULT_HTTP_TIMEOUT_MS = 15000

// fetch subjacente (globalThis.fetch em produção; injetável nos testes). Recebe o
// AbortSignal montado pelo wrapper — nunca é o caller quem cria o signal.
export type FetchImpl = (
  url: string,
  init?: HttpRequestInit & { signal?: AbortSignal },
) => Promise<HttpResponse>

export interface DefaultHttpOpts {
  timeoutMs?: number   // default: WHATSAPP_HTTP_TIMEOUT_MS ou DEFAULT_HTTP_TIMEOUT_MS
  fetchImpl?: FetchImpl // default: globalThis.fetch
}

// Fábrica do cliente padrão sobre o fetch global (Node 18+). Aplica um timeout via
// AbortController a TODA requisição (sendMessage e fetchMedia usam este caminho).
// O signal é interno: se o timer estourar, a requisição é abortada e vira um erro
// claro de timeout. NUNCA é usado nos testes de sendMessage/fetchMedia (http mockado);
// os testes de timeout injetam um fetchImpl que respeita o signal.
export function createDefaultHttp(opts?: DefaultHttpOpts): HttpClient {
  const envTimeout = Number(process.env.WHATSAPP_HTTP_TIMEOUT_MS)
  const timeoutMs = opts?.timeoutMs ?? (Number.isFinite(envTimeout) && envTimeout > 0 ? envTimeout : DEFAULT_HTTP_TIMEOUT_MS)
  return async (url, init) => {
    const fetchFn = opts?.fetchImpl
      ?? (globalThis as { fetch?: FetchImpl }).fetch
    if (!fetchFn) throw new Error('fetch global indisponível neste runtime')
    const controller = new AbortController()
    let timedOut = false
    const timer = setTimeout(() => { timedOut = true; controller.abort() }, timeoutMs)
    try {
      return await fetchFn(url, { ...init, signal: controller.signal })
    } catch (err) {
      if (timedOut) throw new Error(`Cloud API HTTP timeout após ${timeoutMs}ms: ${url}`)
      throw err
    } finally {
      clearTimeout(timer)
    }
  }
}

// Instância padrão (env + fetch global). Não faz I/O no import.
export const defaultHttp: HttpClient = createDefaultHttp()

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
