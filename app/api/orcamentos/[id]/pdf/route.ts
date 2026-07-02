import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { launchBrowser } from '@/lib/pdf/launch-browser'
import { buildPrintUrl } from '@/lib/pdf/print-url'
import { extractCookieHeader } from '@/lib/pdf/auth-cookie'

// Rota de download do PDF do orçamento (Puppeteer + template HTML/Tailwind).
//
// GARANTIAS (sem fallback silencioso, sem PDF branco):
// - Se o Puppeteer falhar, ou o marcador [data-pdf-template="ready"] não
//   aparecer, ou o corpo renderizar vazio → retorna 500 com mensagem clara.
// - NUNCA salva/serve um PDF em branco.
//
// USE_HTML_PDF=false desabilita Puppeteer e retorna 503 (diagnóstico).
const PUPPETEER_DISABLED = process.env.USE_HTML_PDF === 'false'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Comprimento mínimo de texto no corpo para considerar o template "renderizado".
const MIN_BODY_TEXT = 40
// Tamanho mínimo plausível de um PDF com conteúdo (bytes).
const MIN_PDF_BYTES = 1200

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (PUPPETEER_DISABLED) {
    return new NextResponse(
      'Geração de PDF via Puppeteer está desabilitada (USE_HTML_PDF=false).',
      { status: 503 }
    )
  }

  const { id } = await params

  try {
    const tStart = performance.now()
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return new NextResponse('Unauthorized', { status: 401 })

    const { data: perfil } = await supabase
      .from('profiles')
      .select('id, organization_id')
      .eq('id', user.id)
      .single()
    if (!perfil) return new NextResponse('Unauthorized', { status: 401 })

    // Só valida existência + escopo (RLS) e pega o número p/ nome do arquivo.
    // Quem monta o HTML é a página /preview-pdf.
    const { data: orcamento, error } = await supabase
      .from('quotes')
      .select('numero')
      .eq('id', id)
      .eq('organization_id', perfil.organization_id)
      .single()
    if (error || !orcamento) {
      return new NextResponse('Orçamento não encontrado', { status: 404 })
    }

    const printUrl = buildPrintUrl(id, new URL(request.url).origin)
    const cookieHeader = extractCookieHeader(request)

    // Diagnóstico da página (temporário — prefixo [pdf-diag]).
    const consoleErros: string[] = []
    const pageErros: string[] = []
    const requestFailures: string[] = []
    const respostasComErro: string[] = []

    const browser = await launchBrowser()
    let pdf: Uint8Array | null = null
    let navStatus: number | null = null
    let htmlLength = 0
    let bodyTextLen = 0
    let markerExists = false

    try {
      const page = await browser.newPage()
      if (cookieHeader) {
        await page.setExtraHTTPHeaders({ Cookie: cookieHeader })
      }

      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErros.push(msg.text().slice(0, 200))
      })
      page.on('pageerror', (err) => pageErros.push(String(err).slice(0, 200)))
      page.on('requestfailed', (req) => {
        requestFailures.push(`${req.url().slice(0, 120)} :: ${req.failure()?.errorText ?? '??'}`)
      })
      page.on('response', (res) => {
        if (res.status() >= 400) respostasComErro.push(`${res.status()} ${res.url().slice(0, 120)}`)
      })

      // NÃO usamos networkidle0: imagens externas (logos) podem travar a rede
      // e/ou nunca completar. Navegamos até o DOM e aguardamos explicitamente
      // o marcador do template + as fontes.
      const resp = await page.goto(printUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      navStatus = resp?.status() ?? null

      // Espera explícita do marcador. Sem ele, NÃO geramos PDF.
      try {
        await page.waitForSelector('[data-pdf-template="ready"]', { timeout: 15_000 })
        markerExists = true
      } catch {
        markerExists = false
      }

      // Fontes prontas (evita texto invisível/deslocado no PDF). Best-effort.
      try {
        await page.evaluate(async () => {
          const d = document as unknown as { fonts?: { ready?: Promise<unknown> } }
          if (d.fonts?.ready) await d.fonts.ready
        })
      } catch { /* ignore */ }

      // Deixa a rede assentar por um curto período (imagens de logo, se houver),
      // sem travar o fluxo caso algo externo não complete.
      try {
        await page.waitForNetworkIdle({ idleTime: 400, timeout: 6_000 })
      } catch { /* ok: seguimos mesmo se um recurso externo não completar */ }

      const html = await page.content()
      htmlLength = html.length
      bodyTextLen = await page.evaluate(() => (document.body?.innerText ?? '').trim().length)

      const diag = {
        id,
        printUrl,
        navStatus,
        markerExists,
        htmlLength,
        bodyTextLen,
        consoleErros: consoleErros.slice(0, 5),
        pageErros: pageErros.slice(0, 5),
        requestFailures: requestFailures.slice(0, 8),
        respostasComErro: respostasComErro.slice(0, 8),
      }
      console.log('[pdf-diag]', JSON.stringify(diag))

      // GUARDA 1: marcador ausente → template não montou → erro claro.
      if (!markerExists) {
        return new NextResponse(
          `PDF não gerado: template não carregou (marcador data-pdf-template="ready" ausente). ` +
            `navStatus=${navStatus}, htmlLength=${htmlLength}. ` +
            `Verifique autenticação/rota do preview-pdf. Detalhe: ${JSON.stringify(diag).slice(0, 400)}`,
          { status: 500 }
        )
      }

      // GUARDA 2: corpo praticamente vazio → não gerar PDF branco.
      if (bodyTextLen < MIN_BODY_TEXT) {
        return new NextResponse(
          `PDF não gerado: template carregou mas está vazio (bodyTextLen=${bodyTextLen}). ` +
            `Provável falha de dados/query. Detalhe: ${JSON.stringify(diag).slice(0, 400)}`,
          { status: 500 }
        )
      }

      pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })
    } finally {
      await browser.close()
    }

    // GUARDA 3: PDF ausente ou pequeno demais (provável branco).
    if (!pdf || pdf.byteLength < MIN_PDF_BYTES) {
      return new NextResponse(
        `PDF não gerado corretamente (bytes=${pdf?.byteLength ?? 0}). Geração abortada para não entregar PDF em branco.`,
        { status: 500 }
      )
    }

    console.log('[pdf-diag] OK', JSON.stringify({ id, pdf_kb: Math.round(pdf.byteLength / 1024), total_ms: Math.round(performance.now() - tStart) }))

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="orcamento-${orcamento.numero}.pdf"`,
        'Content-Length': pdf.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error('[pdf route] erro:', error)
    const msg = error instanceof Error ? error.message : 'Erro interno'
    return new NextResponse(`Erro ao gerar PDF: ${msg.slice(0, 300)}`, { status: 500 })
  }
}
