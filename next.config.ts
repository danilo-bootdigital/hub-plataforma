import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // `output` condicional por ambiente — o CRM é deployado em DOIS lugares:
  //
  //  • Vercel (preview/staging): NÃO usar 'standalone'. O tracer estático do
  //    standalone não copia os binários .br do @sparticuz/chromium (lidos em
  //    runtime via lambdafs), quebrando o PDF. Saída padrão inclui node_modules.
  //
  //  • EasyPanel (produção, container Docker): PRECISA de 'standalone' — o
  //    Dockerfile faz `COPY .next/standalone` + `node server.js`. Lá o PDF usa
  //    o Chromium do SISTEMA (apk add chromium + CHROME_PATH), não o @sparticuz.
  //
  // `process.env.VERCEL` é "1" só durante o build na Vercel; ausente no Docker.
  output: process.env.VERCEL ? undefined : 'standalone',

  // Fixa a raiz do projeto: evita o Next inferir um workspace-root errado
  // (lockfile em diretório pai) e aninhar o .next/standalone num caminho
  // profundo, o que quebraria o `node server.js` do Dockerfile.
  outputFileTracingRoot: process.cwd(),

  // Só relevante no build Vercel (@sparticuz/chromium). Inofensivo no container.
  // Glob "/api/orcamentos/**" casa a rota (a chave com "[id]" é interpretada
  // como classe de caractere e não casaria).
  outputFileTracingIncludes: {
    '/api/orcamentos/**': [
      './node_modules/@sparticuz/chromium/bin/**',
    ],
  },
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
}

export default nextConfig
