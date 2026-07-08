// Mensageria (DEC-023 · Fatia 0) — validação do CRON_SECRET (PURA, testável).
// A Vercel injeta 'Authorization: Bearer <CRON_SECRET>' nas chamadas de cron quando a
// env CRON_SECRET existe. Fail-closed: sem secret configurado, nega. Comparação em
// tempo constante (evita timing attack).

import { timingSafeEqual } from 'node:crypto'

export function validarCronSecret(authHeader: string | null | undefined, secret: string | undefined): boolean {
  if (!secret) return false          // fail-closed: nada configurado → nega
  if (!authHeader) return false
  const esperado = `Bearer ${secret}`
  const a = Buffer.from(authHeader)
  const b = Buffer.from(esperado)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
