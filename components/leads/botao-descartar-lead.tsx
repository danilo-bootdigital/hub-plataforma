'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { descartarLead } from '@/app/(dashboard)/leads/actions'
import { toast } from 'sonner'

type Props = { leadId: string }

export function BotaoDescartarLead({ leadId }: Props) {
  const [confirmando, setConfirmando] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDescartar() {
    startTransition(async () => {
      try {
        await descartarLead(leadId, 'Descartado manualmente.')
      } catch {
        toast.error('Erro ao descartar lead.')
      }
    })
  }

  if (confirmando) {
    return (
      <div className="flex gap-2">
        <Button
          variant="destructive"
          size="sm"
          className="flex-1"
          onClick={handleDescartar}
          disabled={isPending}
        >
          {isPending ? 'Descartando...' : 'Confirmar descarte'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmando(false)}
          disabled={isPending}
        >
          Cancelar
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="outline"
      className="w-full text-red-600 hover:text-red-700"
      onClick={() => setConfirmando(true)}
    >
      Descartar Lead
    </Button>
  )
}
