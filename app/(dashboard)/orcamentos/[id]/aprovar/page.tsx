'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BadgeStatusOrcamento } from '@/components/orcamentos/badge-status-orcamento'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { QuoteStatus } from '@/types/database'

type Props = {
  orcamentoId: string
  status: QuoteStatus
  numero: string
}

export default function AprovarOrcamentoPage({ orcamentoId, status, numero }: Props) {
  const router = useRouter()
  const [motivo, setMotivo] = useState('')
  const [isPending, setIsPending] = useState(false)

  const handleAprovar = async () => {
    setIsPending(true)
    try {
      const response = await fetch('/api/orcamentos/acao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orcamentoId,
          acao: status === 'rascunho' ? 'aprovar_rascunho' : 'aprovar_interna',
          motivo: motivo || 'Aprovação realizada',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Falha ao aprovar orçamento')
      }

      toast.success('Orçamento aprovado com sucesso!')
      router.push(`/orcamentos/${orcamentoId}`)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao aprovar orçamento.')
    } finally {
      setIsPending(false)
    }
  }

  const handleEnviarCliente = async () => {
    setIsPending(true)
    try {
      const response = await fetch('/api/orcamentos/acao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orcamentoId,
          acao: 'enviar_cliente',
          motivo: 'Orçamento enviado ao cliente',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Falha ao enviar orçamento ao cliente')
      }

      toast.success('Orçamento enviado ao cliente com sucesso!')
      router.push(`/orcamentos/${orcamentoId}`)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar orçamento ao cliente.')
    } finally {
      setIsPending(false)
    }
  }

  const handleClienteAprovou = async () => {
    setIsPending(true)
    try {
      const response = await fetch('/api/orcamentos/acao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orcamentoId,
          acao: 'cliente_aprovou',
          motivo: 'Cliente aprovou o orçamento',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Falha ao aprovar orçamento')
      }

      toast.success('Orçamento aprovado pelo cliente!')
      router.push(`/orcamentos/${orcamentoId}`)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao aprovar orçamento.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href={`/orcamentos/${orcamentoId}`}>
          <Button variant="ghost" size="sm" className="gap-1 pl-0 text-slate-600">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao orçamento
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aprovar Orçamento #{numero}</CardTitle>
          <BadgeStatusOrcamento status={status} />
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Botão para enviar aprovação - quando status for rascunho */}
          {status === 'rascunho' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Enviar este orçamento para aprovação interna:
              </p>
              <Input
                placeholder="Motivo da aprovação (opcional)"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="mt-1"
              />
              <Button
                onClick={handleAprovar}
                disabled={isPending}
                className="w-full"
              >
                {isPending ? 'Enviando...' : 'Enviar para Aprovação'}
              </Button>
            </div>
          )}

          {/* Botão para aprovar internamente - quando status for aguardando aprovação */}
          {status === 'aguardando_aprovacao_interna' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Aprovar este orçamento internamente:
              </p>
              <Input
                placeholder="Motivo da aprovação (opcional)"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="mt-1"
              />
              <Button
                onClick={handleAprovar}
                disabled={isPending}
                className="w-full"
              >
                {isPending ? 'Aprovando...' : 'Aprovar Internamente'}
              </Button>
            </div>
          )}

          {/* Botão para enviar ao cliente - quando status for aprovado internamente */}
          {status === 'aprovado_internamente' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Enviar este orçamento ao cliente:
              </p>
              <Button
                onClick={handleEnviarCliente}
                disabled={isPending}
                className="w-full"
              >
                {isPending ? 'Enviando...' : 'Enviar ao Cliente'}
              </Button>
            </div>
          )}

          {/* Botão para marcar como aprovado pelo cliente */}
          {status === 'enviado_ao_cliente' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Marcar como aprovado pelo cliente:
              </p>
              <Button
                onClick={handleClienteAprovou}
                disabled={isPending}
                className="w-full"
              >
                {isPending ? 'Processando...' : 'Cliente Aprovou'}
              </Button>
            </div>
          )}

          {/* Status final */}
          {(status === 'aprovado_pelo_cliente' || status === 'recusado_pelo_cliente') && (
            <div className="text-center space-y-2">
              <p className="text-sm text-slate-600">
                Este orçamento já foi {status === 'aprovado_pelo_cliente' ? 'aprovado' : 'recusado'} pelo cliente.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}