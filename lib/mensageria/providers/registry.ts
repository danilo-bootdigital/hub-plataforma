// Mensageria (DEC-023 · Fatia 0, Etapa 5) — REGISTRY de providers.
// Único ponto que mapeia `code` → adapter concreto. O domínio resolve providers
// APENAS por este registry (nunca importa um adapter concreto diretamente).
//
// Nesta etapa o registry nasce VAZIO: nenhum adapter concreto é registrado aqui.
// Os adapters (ex.: Cloud API, Etapa 6) se auto-registram via registerProvider()
// no seu próprio módulo — mantendo este arquivo agnóstico de nomes de provider.

import type { ProviderAdapter } from './tipos'

const registry = new Map<string, ProviderAdapter>()

// Registra um adapter. Lança se o code já estiver registrado (evita sobrescrita silenciosa).
export function registerProvider(adapter: ProviderAdapter): void {
  if (registry.has(adapter.code)) {
    throw new Error(`Provider já registrado: ${adapter.code}`)
  }
  registry.set(adapter.code, adapter)
}

// Resolve um adapter pelo code. Lança se não houver adapter registrado para o code.
export function resolveProvider(code: string): ProviderAdapter {
  const adapter = registry.get(code)
  if (!adapter) {
    throw new Error(`Provider não registrado: ${code}`)
  }
  return adapter
}

export function isProviderRegistered(code: string): boolean {
  return registry.has(code)
}

// Codes registrados (ordenado, p/ determinismo em logs/telas).
export function listProviders(): string[] {
  return [...registry.keys()].sort()
}

// Uso EXCLUSIVO de testes — limpa o registry entre casos (isolamento).
export function _resetRegistry(): void {
  registry.clear()
}
