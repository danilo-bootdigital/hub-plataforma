'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { compararPosologiaConferencia } from './actions'
import { COMPARACAO_LABEL, COMPARACAO_EMOJI } from './ui'
import type { ComparacaoPosologia } from '@/lib/ia/comparar-posologia'

// Opção B: comparar a posologia esperada com a já extraída, SOB DEMANDA, na tela de Resultado.
// Consultivo — não refaz análise nem altera resultado/checklist/score/decisão.
export function BlocoCompararPosologia({
  conferenciaId, esperadaInicial, comparacaoInicial,
}: {
  conferenciaId: string
  esperadaInicial: string | null
  comparacaoInicial: ComparacaoPosologia | null
}) {
  const router = useRouter()
  const [texto, setTexto] = useState(esperadaInicial ?? '')
  const [cmp, setCmp] = useState<ComparacaoPosologia | null>(comparacaoInicial)
  const [pending, start] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  function comparar() {
    setErro(null)
    start(async () => {
      try {
        setCmp(await compararPosologiaConferencia(conferenciaId, texto))
        router.refresh()
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Falha ao comparar a posologia.')
      }
    })
  }

  const cor = cmp?.resultado === 'compativel' ? 'text-emerald-700'
    : cmp?.resultado === 'diferenca_encontrada' ? 'text-amber-700' : 'text-slate-500'

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="mb-2 text-sm font-semibold text-slate-700">Comparar Posologia</p>
      <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={2}
        placeholder="Cole a posologia esperada para comparar com a receita — mesmo depois da análise." />
      {erro && <p className="mt-1 text-sm text-red-700">{erro}</p>}
      <Button variant="outline" size="sm" className="mt-2" disabled={pending || !texto.trim()} onClick={comparar}>
        {pending ? <Loader2 className="animate-spin" /> : null} Comparar
      </Button>
      {cmp && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className={`text-sm font-semibold ${cor}`}>{COMPARACAO_EMOJI[cmp.resultado] ?? ''} {COMPARACAO_LABEL[cmp.resultado] ?? cmp.resultado}</p>
          {cmp.justificativa && <p className="mt-1 text-sm text-slate-600">{cmp.justificativa}</p>}
        </div>
      )}
      <p className="mt-2 text-xs text-slate-400">Consultivo — não altera o resultado principal, o checklist, o score nem a decisão.</p>
    </div>
  )
}
