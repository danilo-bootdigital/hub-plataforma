'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { enviarOrcamentoAoCliente } from '@/app/(dashboard)/assistente/orcamentos/actions'

// Fatia 14: marca o Orçamento como enviado ao Cliente (apenas muda o status).
// Só aparece em RASCUNHO. `bloqueio` traz o motivo quando o envio não é permitido
// (sem itens ou Total Final ≤ 0) — botão fica desabilitado com a justificativa.
export function BotaoEnviar({
  quoteId,
  bloqueio,
}: {
  quoteId: string
  bloqueio: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [confirmando, setConfirmando] = useState(false)
  const router = useRouter()

  function enviar() {
    startTransition(async () => {
      try {
        await enviarOrcamentoAoCliente(quoteId)
        toast.success('Orçamento marcado como enviado ao Cliente.')
        setConfirmando(false)
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao enviar.')
      }
    })
  }

  if (bloqueio) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button disabled variant="outline">
          <Send className="mr-2 h-4 w-4" />
          Marcar como enviado ao Cliente
        </Button>
        <span className="text-xs text-amber-600">{bloqueio}</span>
      </div>
    )
  }

  if (!confirmando) {
    return (
      <Button onClick={() => setConfirmando(true)}>
        <Send className="mr-2 h-4 w-4" />
        Marcar como enviado ao Cliente
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-600">Confirmar envio? Após isso o Orçamento não poderá mais ser editado.</span>
      <Button variant="ghost" disabled={isPending} onClick={() => setConfirmando(false)}>
        Cancelar
      </Button>
      <Button disabled={isPending} onClick={enviar}>
        Confirmar envio
      </Button>
    </div>
  )
}
