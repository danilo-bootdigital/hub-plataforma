'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import type { QuoteStatus, UserRole } from '@/types/database'

type Props = {
  orcamentoId: string
  status: QuoteStatus
  cargo: UserRole
}

export function AcoesOrcamentoDetalhe({ orcamentoId, status, cargo }: Props) {
  const [isPending, startTransition] = useTransition()
  const [motivo, setMotivo] = useState('')
  const [pedidoGerado, setPedidoGerado] = useState(false)

  const isAdminGestor = cargo === 'admin' || cargo === 'gestor'

  const converterParaPedido = async () => {
    startTransition(async () => {
      try {
        const response = await fetch('/api/orcamentos/transformar-em-pedido', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orcamentoId,
            motivo: motivo || 'Conversão manual',
          }),
        })

        if (!response.ok) {
          throw new Error('Falha ao converter orçamento em pedido')
        }

        const data = await response.json()
        toast.success(data.message || 'Pedido gerado com sucesso!')
        setPedidoGerado(true)
        // Forçar refresh dos dados
        setTimeout(() => window.location.reload(), 1000)
      } catch (error: any) {
        toast.error(error.message || 'Erro ao gerar pedido.')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Botão para converter em pedido - apenas quando status for aprovado pelo cliente */}
        {status === 'aprovado_pelo_cliente' && !pedidoGerado && (
          <div className="space-y-2">
            <p className="text-sm text-slate-600">Converter este orçamento em pedido:</p>
            <Input
              placeholder="Motivo da conversão (opcional)"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="mt-1"
            />
            <Button
              onClick={converterParaPedido}
              disabled={isPending}
              className="w-full"
            >
              {isPending ? 'Gerando pedido...' : 'Converter em Pedido'}
            </Button>
          </div>
        )}

        {/* Mensagem quando pedido já foi gerado */}
        {status === 'aprovado_pelo_cliente' && pedidoGerado && (
          <div className="text-center space-y-2">
            <p className="text-sm text-green-600 font-medium">✓ Pedido Gerado</p>
            <p className="text-xs text-slate-500">Este orçamento já foi convertido em pedido</p>
            <Link href={`/pedidos?quote_id=${orcamentoId}`}>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
              >
                Ver Pedidos Gerados
              </Button>
            </Link>
          </div>
        )}

        {/* Botão para enviar aprovação - quando status for rascunho */}
        {status === 'rascunho' && (
          <Button
            onClick={() => {
              window.location.href = `/orcamentos/${orcamentoId}/aprovar`
            }}
            disabled={isPending}
            variant="default"
            className="w-full"
          >
            Enviar para Aprovação
          </Button>
        )}

        {/* Botão para aprovar internamente - quando status for aguardando aprovação */}
        {status === 'aguardando_aprovacao_interna' && isAdminGestor && (
          <Button
            onClick={() => {
              window.location.href = `/orcamentos/${orcamentoId}/aprovar`
            }}
            disabled={isPending}
            variant="default"
            className="w-full"
          >
            Aprovar Internamente
          </Button>
        )}

        {/* Botão para enviar ao cliente - quando status for aprovado internamente */}
        {status === 'aprovado_internamente' && (
          <Button
            onClick={() => {
              window.location.href = `/orcamentos/${orcamentoId}/aprovar`
            }}
            disabled={isPending}
            variant="default"
            className="w-full"
          >
            Enviar ao Cliente
          </Button>
        )}

        {/* Botão para marcar como aprovado pelo cliente */}
        {status === 'enviado_ao_cliente' && (
          <Button
            onClick={() => {
              window.location.href = `/orcamentos/${orcamentoId}/aprovar`
            }}
            disabled={isPending}
            variant="default"
            className="w-full"
          >
            {isPending ? 'Processando...' : 'Cliente Aprovou'}
          </Button>
        )}

        {/* Cliente recusou */}
        {status === 'recusado_pelo_cliente' && (
          <p className="text-center text-sm text-slate-400">Orçamento recusado pelo cliente.</p>
        )}

        {/* Orçamento finalizado (aprovado e convertido) */}
        {status === 'aprovado_pelo_cliente' && pedidoGerado && (
          <div className="text-center space-y-2">
            <p className="text-sm text-green-600 font-medium">✓ Orçamento Aprovado</p>
            <p className="text-xs text-slate-500">O orçamento foi aprovado pelo cliente</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}