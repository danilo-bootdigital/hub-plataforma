// Mensageria (DEC-023 · Fatia 0) — endpoint do poller (acionado por Vercel Cron).
// GET protegido por CRON_SECRET (fail-closed). Drena o inbox em loop-até-vazio com
// limites de segurança, usando service-role. NÃO envia, NÃO baixa mídia, NÃO cria UI.

import { NextRequest, NextResponse } from 'next/server'
import { validarCronSecret } from '@/lib/mensageria/poller/cron-auth'
import { drenarAteVazio } from '@/lib/mensageria/poller/loop'
import { drenarInbox } from '@/lib/mensageria/poller/poller'
import { criarPollerDepsSupabase } from '@/lib/mensageria/poller/supabase-deps'

export const runtime = 'nodejs'          // node:crypto + service role
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Limites (alinhados aos defaults do 8A + limites de segurança do loop)
const LOTE = 20
const VISIBILIDADE_SEG = 300
const MAX_TENTATIVAS = 5
const MAX_PASSADAS = 50        // backstop → ≤ 1000 eventos por invocação
const ORCAMENTO_MS = 25_000    // encerra antes do maxDuration (60s), com margem

export async function GET(req: NextRequest) {
  if (!validarCronSecret(req.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const deps = criarPollerDepsSupabase()
  const resumo = await drenarAteVazio(
    () => drenarInbox(deps, { lote: LOTE, visibilidadeSeg: VISIBILIDADE_SEG, maxTentativas: MAX_TENTATIVAS }),
    { maxPassadas: MAX_PASSADAS, orcamentoMs: ORCAMENTO_MS },
    () => Date.now(),
  )

  return NextResponse.json(resumo, { status: 200 })
}
