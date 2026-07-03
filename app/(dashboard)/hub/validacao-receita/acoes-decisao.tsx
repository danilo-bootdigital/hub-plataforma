'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, RotateCcw, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { aprovarConferencia, reprovarConferencia, devolverConferenciaParaCorrecao } from './actions'

// Decisão humana. onDecidido: tela inline (/nova) refaz o fetch; sem callback, refresh do server (/[id]).
export function AcoesDecisao({ conferenciaId, onDecidido }: { conferenciaId: string; onDecidido?: () => void }) {
  const router = useRouter()
  const [obs, setObs] = useState('')
  const [pending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  function decidir(fn: (id: string, obs?: string) => Promise<void>) {
    setErro(null)
    startTransition(async () => {
      try {
        await fn(conferenciaId, obs.trim() || undefined)
        if (onDecidido) onDecidido()
        else router.refresh()
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Falha ao registrar a decisão.')
      }
    })
  }

  return (
    <div className="space-y-2">
      <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2}
        placeholder="Observação (opcional) — registrada no histórico" />
      {erro && <p className="text-sm text-red-700">{erro}</p>}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button onClick={() => decidir(aprovarConferencia)} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Check />} Aprovar
        </Button>
        <Button variant="outline" onClick={() => decidir(devolverConferenciaParaCorrecao)} disabled={pending}>
          <RotateCcw /> Devolver
        </Button>
        <Button variant="destructive" onClick={() => decidir(reprovarConferencia)} disabled={pending}>
          <X /> Rejeitar
        </Button>
      </div>
    </div>
  )
}
