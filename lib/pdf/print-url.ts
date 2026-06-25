// Constrói a URL absoluta da rota /preview-pdf que o Puppeteer vai abrir.
// Em produção usa NEXT_PUBLIC_APP_URL. Em dev usa http://localhost:3000.

export function buildPrintUrl(id: string, origin?: string): string {
  // Base URL pública para o Puppeteer abrir /preview-pdf.
  // No container (EasyPanel) a origem derivada de request.url vira
  // "https://0.0.0.0:80" (não navegável) → precisamos de uma base configurável.
  //
  // - NEXT_PUBLIC_APP_URL: embutido em BUILD-time (funciona na Vercel se setado no build).
  // - APP_URL: var NÃO-pública, lida em RUNTIME (funciona no EasyPanel sem mexer no
  //   Dockerfile, pois NEXT_PUBLIC_* não é injetável só em runtime num build Docker).
  // - origin: fallback para dev local.
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    origin ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  return `${base.replace(/\/$/, '')}/orcamentos/${id}/preview-pdf?print=1`
}
