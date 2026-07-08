// Cloud API — verificação de webhook (challenge GET + assinatura HMAC no POST).
// Não decide negócio; apenas valida autenticidade da requisição.

import { createHmac, timingSafeEqual } from 'node:crypto'
import type { IncomingWebhook, WebhookVerification } from '../tipos'
import type { CloudApiConfig } from './config'

export function verifyWebhook(config: CloudApiConfig, req: IncomingWebhook): WebhookVerification {
  // GET: verificação de subscrição (Meta envia hub.mode/hub.verify_token/hub.challenge)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']
    if (mode === 'subscribe' && token && config.verifyToken && token === config.verifyToken) {
      return challenge ? { ok: true, challenge } : { ok: true }
    }
    return { ok: false, motivo: 'verify_token inválido ou ausente' }
  }

  // POST: assinatura X-Hub-Signature-256 = 'sha256=' + HMAC_SHA256(rawBody, appSecret)
  const assinatura = req.headers['x-hub-signature-256']
  if (!assinatura) return { ok: false, motivo: 'assinatura ausente' }
  if (!config.appSecret) return { ok: false, motivo: 'app secret não configurado' }

  const esperado = 'sha256=' + createHmac('sha256', config.appSecret).update(req.rawBody).digest('hex')
  const a = Buffer.from(assinatura)
  const b = Buffer.from(esperado)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, motivo: 'assinatura inválida' }
  }
  return { ok: true }
}
