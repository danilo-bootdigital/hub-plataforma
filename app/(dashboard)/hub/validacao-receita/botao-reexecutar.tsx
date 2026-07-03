'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { rodarPreAnalise } from './actions'

// Reexecuta a análise NA MESMA validação (mantém o arquivo anexado). Não cria nova.
export function BotaoReexecutar({ conferenciaId, onFeito }: { conferenciaId: string; onFeito?: () => void }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  function reexecutar() {
    setErro(null)
    start(async () => {
      try {
        await rodarPreAnalise(conferenciaId)
        if (onFeito) onFeito()
        else router.refresh()
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Falha ao reexecutar a análise.')
      }
    })
  }

  return (
    <div>
      <Button onClick={reexecutar} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />} Reexecutar análise
      </Button>
      {erro && <p className="mt-2 text-sm text-red-700">{erro}</p>}
    </div>
  )
}
