// Cloud API — montagem do ProviderAdapter + auto-registro no registry.
// Único ponto que amarra config/http/webhook/mapper/client no contrato do domínio.

import { registerProvider, isProviderRegistered } from '../registry'
import type { ProviderAdapter } from '../tipos'
import { resolveConfig, type CloudApiConfig } from './config'
import { defaultHttp, sendMessage, fetchMedia, type HttpClient } from './client'
import { verifyWebhook } from './webhook'
import { parseInbound, mapStatus } from './mapper'

export const CLOUD_API_CODE = 'cloud_api'

export interface CloudApiAdapterOpts {
  config?: Partial<CloudApiConfig>   // testes injetam config fake (sem secrets reais)
  http?: HttpClient                  // testes injetam http mock (sem chamadas reais)
}

export function createCloudApiAdapter(opts?: CloudApiAdapterOpts): ProviderAdapter {
  const config = resolveConfig(opts?.config)
  const http = opts?.http ?? defaultHttp
  return {
    code: CLOUD_API_CODE,
    channels: ['whatsapp'],
    verifyWebhook: (req) => verifyWebhook(config, req),
    parseInbound: (payload) => parseInbound(payload),
    mapStatus: (payload) => mapStatus(payload),
    sendMessage: (account, to, content) => sendMessage(config, http, account, to, content),
    fetchMedia: (ref) => fetchMedia(config, http, ref),
  }
}

// Instância padrão (usa env + fetch global). Não faz I/O no import.
export const cloudApiAdapter = createCloudApiAdapter()

// Auto-registro idempotente. Importar este módulo registra o provider no registry.
export function registerCloudApi(): void {
  if (!isProviderRegistered(CLOUD_API_CODE)) registerProvider(cloudApiAdapter)
}

registerCloudApi()
