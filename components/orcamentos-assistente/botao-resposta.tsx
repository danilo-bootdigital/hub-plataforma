'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { registrarRespostaCliente } from '@/app/(dashboard)/assistente/orcamentos/actions'

// Fatia 15: registra a resposta do Cliente (Aprovado/Recusado) num Orçamento
// enviado. Confirmação inline; a resposta é final (não há desfazer nesta fatia).
export function BotaoResposta({ quoteId }: { quoteId: string }) {
  const [isPending, startTransition] = useTransition()
  const [confirmando, setConfirmando] = useState<null | 'APROVADO' | 'RECUSADO'>(null)
  const router = useRouter()

  function registrar(resposta: 'APROVADO' | 'RECUSADO') {
    startTransition(async () => {
      try {
        await registrarRespostaCliente(quoteId, resposta)
        toast.success(resposta === 'APROVADO' ? 'Orçamento aprovado pelo Cliente.' : 'Orçamento recusado pelo Cliente.')
        setConfirmando(null)
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao registrar resposta.')
      }
    })
  }

  if (confirmando) {
    const aprovar = confirmando === 'APROVADO'
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600">
          Confirmar <strong>{aprovar ? 'aprovação' : 'recusa'}</strong> do Cliente? A resposta é definitiva.
        </span>
        <Button variant="ghost" disabled={isPending} onClick={() => setConfirmando(null)}>
          Cancelar
        </Button>
        <Button disabled={isPending} onClick={() => registrar(confirmando)}>
          Confirmar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="mr-1 text-sm font-medium text-slate-600">Registrar resposta do Cliente:</span>
      <Button variant="outline" disabled={isPending} onClick={() => setConfirmando('APROVADO')}>
        <ThumbsUp className="mr-2 h-4 w-4" />
        Aprovado pelo Cliente
      </Button>
      <Button variant="outline" disabled={isPending} onClick={() => setConfirmando('RECUSADO')}>
        <ThumbsDown className="mr-2 h-4 w-4" />
        Recusado pelo Cliente
      </Button>
    </div>
  )
}
