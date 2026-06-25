'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CheckCircle, ShoppingCart, ExternalLink, Send } from 'lucide-react'
import { enviarAoCliente, aprovarOrcamento, transformarEmPedido } from '../actions'
import type { QuoteStatus } from '@/types/database'
import Link from 'next/link'

type Props = {
  orcamentoId: string
  status: QuoteStatus
  pedidoExistente?: { id: string; numero: number } | null
}

export function AcoesOrcamento({ orcamentoId, status, pedidoExistente }: Props) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [acao, setAcao] = useState<string | null>(null)

  const podeEnviarAoCliente = status === 'rascunho'
  const podeAprovarCliente = status === 'enviado_ao_cliente' || status === 'aprovado_internamente'
  const podeConverter = status === 'aprovado_pelo_cliente' && !pedidoExistente

  const handleEnviarAoCliente = async () => {
    setIsPending(true)
    setAcao('enviar')
    try {
      await enviarAoCliente(orcamentoId)
      toast.success('Orçamento enviado ao cliente!')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar orçamento')
    } finally {
      setIsPending(false)
      setAcao(null)
    }
  }

  const handleAprovarCliente = async () => {
    setIsPending(true)
    setAcao('aprovar')
    try {
      await aprovarOrcamento(orcamentoId)
      toast.success('Orçamento aprovado pelo cliente!')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao aprovar orçamento')
    } finally {
      setIsPending(false)
      setAcao(null)
    }
  }

  const handleTransformarPedido = async () => {
    setIsPending(true)
    setAcao('converter')
    try {
      const result = await transformarEmPedido(orcamentoId)
      toast.success(result?.message || 'Pedido gerado com sucesso!')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao converter orçamento em pedido')
    } finally {
      setIsPending(false)
      setAcao(null)
    }
  }

  if (pedidoExistente) {
    return (
      <Link
        href={`/pedidos/${pedidoExistente.id}`}
        className="inline-flex items-center justify-center gap-1.5 h-9 px-3 text-sm border rounded-md border-input bg-background hover:bg-accent hover:text-accent-foreground"
      >
        <ExternalLink className="h-4 w-4" />
        Ver Pedido #{pedidoExistente.numero}
      </Link>
    )
  }

  return (
    <>
      {podeEnviarAoCliente && (
        <Button
          variant="default"
          size="sm"
          className="gap-1.5 bg-blue-600 hover:bg-blue-700"
          onClick={handleEnviarAoCliente}
          disabled={isPending}
        >
          <Send className="h-4 w-4" />
          {isPending && acao === 'enviar' ? 'Enviando...' : 'Enviar ao Cliente'}
        </Button>
      )}
      {podeAprovarCliente && (
        <Button
          variant="default"
          size="sm"
          className="gap-1.5 bg-green-600 hover:bg-green-700"
          onClick={handleAprovarCliente}
          disabled={isPending}
        >
          <CheckCircle className="h-4 w-4" />
          {isPending && acao === 'aprovar' ? 'Aprovando...' : 'Marcar como Aprovado pelo Cliente'}
        </Button>
      )}
      {podeConverter && (
        <Button
          variant="default"
          size="sm"
          className="gap-1.5 bg-blue-600 hover:bg-blue-700"
          onClick={handleTransformarPedido}
          disabled={isPending}
        >
          <ShoppingCart className="h-4 w-4" />
          {isPending && acao === 'converter' ? 'Gerando...' : 'Transformar em Pedido'}
        </Button>
      )}
    </>
  )
}
