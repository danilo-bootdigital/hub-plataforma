import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { launchBrowser } from '@/lib/pdf/launch-browser'
import { buildPrintUrl } from '@/lib/pdf/print-url'
import { extractCookieHeader } from '@/lib/pdf/auth-cookie'

// Download do PDF do orçamento (Puppeteer + template HTML/Tailwind).
//
// GARANTIAS: sem fallback silencioso, sem PDF branco. Se o template não montar
// ([data-pdf-template="ready"] ausente), o corpo vier vazio, ou o PDF sair
// pequeno demais → 500 com mensagem clara (nunca entrega branco).
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

  try {
    const tStart = performance.now()
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return new NextResponse('Unauthorized', { status: 401 })

    const { data: perfil } = await supabase
      .from('profiles').select('id, cargo, hub_id, organization_id').eq('id', user.id).single()
    if (!perfil) return new NextResponse('Unauthorized', { status: 401 })

    const { data: orcamento, error } = await supabase
      .from('quotes').select('numero, hub_id').eq('id', id).eq('organization_id', perfil.organization_id).single()
    if (error || !orcamento) return new NextResponse('Orçamento não encontrado', { status: 404 })

    // Escopo cross-hub (mesma regra de /orcamentos/[id]): perfis do Hub só acessam
    // o PDF de orçamentos do PRÓPRIO hub_id. Indústria (admin/gestor) segue por org.
    if (
      (perfil.cargo === 'proprietario_hub' || perfil.cargo === 'assistente') &&
      orcamento.hub_id !== perfil.hub_id
    ) {
      return new NextResponse('Orçamento não encontrado', { status: 404 })
    }

    const printUrl = buildPrintUrl(id, new URL(request.url).origin)
    const cookieHeader = extractCookieHeader(request)

    const browser = await launchBrowser()
    let pdf: Uint8Array | null = null
    let navStatus: number | null = null
    let markerExists = false
    let bodyTextLen = 0

    try {
      const page = await browser.newPage()
      if (cookieHeader) await page.setExtraHTTPHeaders({ Cookie: cookieHeader })

      // Sem networkidle0 (imagens externas podem travar). DOM + espera explícita
      // do marcador + fontes; a rede assenta por pouco tempo (best-effort).
      const resp = await page.goto(printUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      navStatus = resp?.status() ?? null

      try { await page.waitForSelector('[data-pdf-template="ready"]', { timeout: 15_000 }); markerExists = true } catch { markerExists = false }
      try { await page.evaluate(async () => { const d = document as unknown as { fonts?: { ready?: Promise<unknown> } }; if (d.fonts?.ready) await d.fonts.ready }) } catch {}
      try { await page.waitForNetworkIdle({ idleTime: 350, timeout: 2_500 }) } catch {}

      if (!markerExists) {
        const finalUrl = page.url()
        return new NextResponse(
          `PDF não gerado: template não carregou (marcador ausente). navStatus=${navStatus} finalUrl=${finalUrl}`,
          { status: 500 }
        )
      }

      bodyTextLen = await page.evaluate(() => (document.body?.innerText ?? '').trim().length)
      if (bodyTextLen < MIN_BODY_TEXT) {
        return new NextResponse(
          `PDF não gerado: template vazio (bodyTextLen=${bodyTextLen}). Provável falha de dados/query.`,
          { status: 500 }
        )
      }

      pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })
    } finally {
      await browser.close()
    }

    if (!pdf || pdf.byteLength < MIN_PDF_BYTES) {
      return new NextResponse(`PDF não gerado corretamente (bytes=${pdf?.byteLength ?? 0}).`, { status: 500 })
    }

    console.log('[pdf] OK', JSON.stringify({ id, navStatus, bodyTextLen, pdf_kb: Math.round(pdf.byteLength / 1024), total_ms: Math.round(performance.now() - tStart) }))

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="orcamento-${orcamento.numero}.pdf"`,
        'Content-Length': pdf.byteLength.toString(),
        // Evita que o navegador sirva um PDF antigo em cache (GET cacheável).
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('[pdf route] erro:', error)
    const msg = error instanceof Error ? error.message : 'Erro interno'
    return new NextResponse(`Erro ao gerar PDF: ${msg.slice(0, 300)}`, { status: 500 })
  }
}
