// Lança uma instância do Chromium compatível com o ambiente atual.
// - Em produção (Vercel/Fluid Compute): usa @sparticuz/chromium (empacotado).
// - Em dev local: tenta CHROME_PATH (env) ou cai no Chromium do sistema.
//
// IMPORTANTE: imports ESTÁTICOS aqui são obrigatórios. Imports dinâmicos
// (await import(...)) são transparentes para o tracer estático do Next.js
// em output: 'standalone', fazendo com que os binários .br do Chromium
// não sejam copiados para o bundle final.

import puppeteer, { type Browser } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL_ENV

export async function launchBrowser(): Promise<Browser> {
  if (isVercel) {
    // Desativa graphics stack (lib mais leve, ~1s mais rápido no cold start)
    chromium.setGraphicsMode = false

    // @sparticuz/chromium@149 detecta Vercel Fluid Compute nativamente
    // (helper.isRunningInAmazonLinux2023 com check em process.env["VERCEL"])
    // e extrai al2023.tar.br automaticamente.
    const executablePath = await chromium.executablePath()
    console.log('[pdf] chromium executablePath:', executablePath)
    console.log('[pdf] graphics:', chromium.graphics)
    console.log('[pdf] args count:', chromium.args.length)
    console.log('[pdf] LD_LIBRARY_PATH:', process.env.LD_LIBRARY_PATH)
    console.log('[pdf] FONTCONFIG_PATH:', process.env.FONTCONFIG_PATH)

    return puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
      executablePath,
      headless: true,
    })
  }

  // Fora da Vercel: container (EasyPanel) ou dev local.
  // - Container: CHROME_PATH=/usr/bin/chromium-browser (setado no Dockerfile).
  // - Dev macOS: Google Chrome local.
  // - Dev/CI Linux sem CHROME_PATH: cai no chromium do sistema, se houver.
  const executablePath =
    process.env.CHROME_PATH ||
    (process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : '/usr/bin/chromium-browser')

  return puppeteer.launch({
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    headless: true,
  })
}
