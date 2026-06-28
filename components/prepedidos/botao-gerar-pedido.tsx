'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { gerarPedidoDefinitivo } from '@/app/(dashboard)/assistente/orcamentos/actions'

// Fatia 17: promove o Pré-pedido (orders@PRE_PEDIDO) para Pedido definitivo
// (orders@PEDIDO) na mesma linha. Confirmação inline; promoção única.
export function BotaoGerarPedido({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition()
  const [confirmando, setConfirmando] = useState(false)
  const router = useRouter()

  function gerar() {
    startTransition(async () => {
      try {
        await gerarPedidoDefinitivo(orderId)
        toast.success('Pedido definitivo gerado.')
        setConfirmando(false)
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao gerar Pedido.')
      }
    })
  }

  if (confirmando) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="text-xs text-slate-600">Gerar Pedido definitivo?</span>
        <Button variant="ghost" size="sm" disabled={isPending} onClick={() => setConfirmando(false)}>
          Cancelar
        </Button>
        <Button size="sm" disabled={isPending} onClick={gerar}>
          Confirmar
        </Button>
      </span>
    )
  }

  return (
    <Button variant="outline" size="sm" onClick={() => setConfirmando(true)}>
      Gerar Pedido
    </Button>
  )
}
