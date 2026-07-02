import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { launchBrowser } from '@/lib/pdf/launch-browser'
import { buildPrintUrl } from '@/lib/pdf/print-url'
import { extractCookieHeader } from '@/lib/pdf/auth-cookie'

// Rota de download do PDF do orçamento (Puppeteer + template HTML/Tailwind).
//
// GARANTIAS: sem fallback silencioso, sem PDF branco (guardas abaixo).
//
// MODO DEBUG (temporário — investigação do PDF em branco):
//   ?debug=info        → JSON: printUrl, finalUrl, status, redirect, tamanhos,
//                        bodyText na tela vs em print, 1º 1000 chars do HTML
//   ?debug=html        → HTML cru que o Puppeteer recebeu (text/plain)
//   ?debug=screenshot  → PNG do que o Puppeteer vê em MÍDIA PRINT (o que vira PDF)
const PUPPETEER_DISABLED = process.env.USE_HTML_PDF === 'false'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MIN_BODY_TEXT = 40
const MIN_PDF_BYTES = 1200

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (PUPPETEER_DISABLED) {
    return new NextResponse('Geração de PDF via Puppeteer desabilitada (USE_HTML_PDF=false).', { status: 503 })
  }

  const { id } = await params
  const debug = new URL(request.url).searchParams.get('debug')

  try {
    const tStart = performance.now()
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return new NextResponse('Unauthorized', { status: 401 })

    const { data: perfil } = await supabase
      .from('profiles').select('id, organization_id').eq('id', user.id).single()
    if (!perfil) return new NextResponse('Unauthorized', { status: 401 })

    const { data: orcamento, error } = await supabase
      .from('quotes').select('numero').eq('id', id).eq('organization_id', perfil.organization_id).single()
    if (error || !orcamento) return new NextResponse('Orçamento não encontrado', { status: 404 })

    const printUrl = buildPrintUrl(id, new URL(request.url).origin)
    const cookieHeader = extractCookieHeader(request)

    const consoleErros: string[] = []
    const pageErros: string[] = []
    const requestFailures: string[] = []
    const respostasComErro: string[] = []

    const browser = await launchBrowser()
    let pdf: Uint8Array | null = null
    let navStatus: number | null = null
    let finalUrl = ''
    let htmlLength = 0
    let bodyTextLen = 0
    let bodyTextPrint = 0
    let markerExists = false
    let html = ''

    try {
      const page = await browser.newPage()
      if (cookieHeader) await page.setExtraHTTPHeaders({ Cookie: cookieHeader })

      page.on('console', (msg) => { if (msg.type() === 'error') consoleErros.push(msg.text().slice(0, 200)) })
      page.on('pageerror', (err) => pageErros.push(String(err).slice(0, 200)))
      page.on('requestfailed', (req) => requestFailures.push(`${req.url().slice(0, 120)} :: ${req.failure()?.errorText ?? '??'}`))
      page.on('response', (res) => { if (res.status() >= 400) respostasComErro.push(`${res.status()} ${res.url().slice(0, 120)}`) })

      const resp = await page.goto(printUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      navStatus = resp?.status() ?? null
      finalUrl = page.url()

      try { await page.waitForSelector('[data-pdf-template="ready"]', { timeout: 15_000 }); markerExists = true } catch { markerExists = false }
      try { await page.evaluate(async () => { const d = document as unknown as { fonts?: { ready?: Promise<unknown> } }; if (d.fonts?.ready) await d.fonts.ready }) } catch {}
      try { await page.waitForNetworkIdle({ idleTime: 400, timeout: 6_000 }) } catch {}

      html = await page.content()
      htmlLength = html.length
      bodyTextLen = await page.evaluate(() => (document.body?.innerText ?? '').trim().length)

      // bodyText em MÍDIA PRINT (o que o page.pdf enxerga). Diferença grande
      // vs bodyTextLen (tela) revela CSS de print escondendo o conteúdo.
      await page.emulateMediaType('print')
      bodyTextPrint = await page.evaluate(() => (document.body?.innerText ?? '').trim().length)

      const diag = {
        id, printUrl, finalUrl, navStatus,
        redirectLogin: finalUrl.includes('/login'),
        markerExists, htmlLength, bodyTextLen, bodyTextPrint,
        consoleErros: consoleErros.slice(0, 5),
        pageErros: pageErros.slice(0, 5),
        requestFailures: requestFailures.slice(0, 8),
        respostasComErro: respostasComErro.slice(0, 8),
      }
      console.log('[pdf-diag]', JSON.stringify(diag))

      // ---- MODO DEBUG: retorna artefatos ao invés do PDF ----
      if (debug === 'screenshot') {
        const shot = await page.screenshot({ fullPage: true, type: 'png' }) // já em mídia print
        return new NextResponse(Buffer.from(shot), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } })
      }
      if (debug === 'html') {
        return new NextResponse(html, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
      }
      if (debug) {
        return NextResponse.json({ ...diag, first1000: html.slice(0, 1000) }, { headers: { 'Cache-Control': 'no-store' } })
      }
      // -------------------------------------------------------

      // Volta para tela? Não — o page.pdf usa mídia print por padrão de qualquer forma.
      if (!markerExists) {
        return new NextResponse(`PDF não gerado: marcador ausente. navStatus=${navStatus} finalUrl=${finalUrl} htmlLength=${htmlLength}`, { status: 500 })
      }
      if (bodyTextLen < MIN_BODY_TEXT) {
        return new NextResponse(`PDF não gerado: template vazio (bodyTextLen=${bodyTextLen}). Provável falha de dados/query.`, { status: 500 })
      }

      pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })
    } finally {
      await browser.close()
    }

    if (!pdf || pdf.byteLength < MIN_PDF_BYTES) {
      return new NextResponse(`PDF não gerado corretamente (bytes=${pdf?.byteLength ?? 0}).`, { status: 500 })
    }

    console.log('[pdf-diag] OK', JSON.stringify({ id, pdf_kb: Math.round(pdf.byteLength / 1024), bodyTextPrint, total_ms: Math.round(performance.now() - tStart) }))

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
