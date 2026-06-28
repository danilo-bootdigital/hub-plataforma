'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PackageCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { converterEmPrePedido } from '@/app/(dashboard)/assistente/orcamentos/actions'

// Fatia 16: converte um Orçamento aprovado em Pré-pedido (cria orders@pendente).
// Confirmação inline; conversão única (o servidor bloqueia duplicação).
export function BotaoConverter({ quoteId }: { quoteId: string }) {
  const [isPending, startTransition] = useTransition()
  const [confirmando, setConfirmando] = useState(false)
  const router = useRouter()

  function converter() {
    startTransition(async () => {
      try {
        await converterEmPrePedido(quoteId)
        toast.success('Orçamento convertido em Pré-pedido.')
        setConfirmando(false)
        router.push('/assistente/prepedidos')
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao converter.')
      }
    })
  }

  if (confirmando) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600">Converter este Orçamento em Pré-pedido? A conversão é única.</span>
        <Button variant="ghost" disabled={isPending} onClick={() => setConfirmando(false)}>
          Cancelar
        </Button>
        <Button disabled={isPending} onClick={converter}>
          Confirmar conversão
        </Button>
      </div>
    )
  }

  return (
    <Button onClick={() => setConfirmando(true)}>
      <PackageCheck className="mr-2 h-4 w-4" />
      Converter em Pré-pedido
    </Button>
  )
}
