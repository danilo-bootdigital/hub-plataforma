// Cloud API (WhatsApp Business Platform) — configuração do provider.
// Os SEGREDOS vêm de env (DEC-023 §2/§7); NUNCA do domínio nem do banco.
// resolveConfig() lê env de forma tolerante (default ''), sem lançar no import —
// métodos que precisam de um segredo falham só quando efetivamente chamados.

export interface CloudApiConfig {
  graphBaseUrl: string   // ex.: https://graph.facebook.com
  graphVersion: string   // ex.: v21.0
  token: string          // system user token (Authorization: Bearer)
  appSecret: string      // validação de assinatura X-Hub-Signature-256
  verifyToken: string    // verificação do webhook (GET hub.verify_token)
}

export function resolveConfig(over?: Partial<CloudApiConfig>): CloudApiConfig {
  const env = process.env
  return {
    graphBaseUrl: over?.graphBaseUrl ?? env.WHATSAPP_GRAPH_BASE_URL ?? 'https://graph.facebook.com',
    graphVersion: over?.graphVersion ?? env.WHATSAPP_GRAPH_VERSION ?? 'v21.0',
    token: over?.token ?? env.WHATSAPP_TOKEN ?? '',
    appSecret: over?.appSecret ?? env.WHATSAPP_APP_SECRET ?? '',
    verifyToken: over?.verifyToken ?? env.WHATSAPP_VERIFY_TOKEN ?? '',
  }
}
