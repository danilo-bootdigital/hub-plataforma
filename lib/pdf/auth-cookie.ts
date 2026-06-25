// Extrai o header Cookie de uma Request do Next.js para ser repassado
// ao Chromium via page.setExtraHTTPHeaders() — necessário porque o
// Puppeteer roda em um browser anônimo, sem cookies da sessão Supabase.

export function extractCookieHeader(request: Request): string {
  return request.headers.get('cookie') ?? ''
}
