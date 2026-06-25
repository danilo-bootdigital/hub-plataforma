'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  enviarParaAprovacao,
  aprovarInterno,
  rejeitarInterno,
  enviarAoCliente,
  marcarRecusadoCliente,
  marcarAprovadoCliente,
  excluirOrcamento,
} from '@/app/(dashboard)/orcamentos/actions'
import type { QuoteStatus, UserRole } from '@/types/database'
import Link from 'next/link'

type Props = {
  orcamentoId: string
  status: QuoteStatus
  cargo: UserRole
  isResponsavel: boolean
}

export function AcoesOrcamento({ orcamentoId, status, cargo, isResponsavel }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [comentario, setComentario] = useState('')
  const [confirmExcluir, setConfirmExcluir] = useState(false)

  const isAdminGestor = cargo === 'admin' || cargo === 'gestor'
  const podeAgir = isAdminGestor || isResponsavel

  // Funções para ações que não precisam de confirmação
  const actionHandlers = {
    enviarParaAprovacao: () => enviarParaAprovacao(orcamentoId),
    aprovarInterno: () => aprovarInterno(orcamentoId, comentario),
    rejeitarInterno: () => rejeitarInterno(orcamentoId, comentario),
    enviarAoCliente: () => enviarAoCliente(orcamentoId),
    marcarRecusadoCliente: () => marcarRecusadoCliente(orcamentoId),
    marcarAprovadoCliente: () => marcarAprovadoCliente(orcamentoId),
    excluirOrcamento: () => excluirOrcamento(orcamentoId),
  }

  // Função para executar ações
  function executarAcao(chave: keyof typeof actionHandlers, mensagem: string) {
    startTransition(async () => {
      try {
        await actionHandlers[chave]()
        toast.success(mensagem)
        router.refresh()
      } catch (error: any) {
        toast.error(error.message || 'Erro ao executar ação.')
      }
    })
  }

  // Fluxo simplificado
  const fluxoSimplificado = {
    rascunho: {
      acao: 'Enviar para aprovação',
      onClick: actionHandlers.enviarParaAprovacao,
      cor: 'default',
    },
    aguardando_aprovacao_interna: {
      acao: isAdminGestor ? 'Aprovar Internamente' : null,
      onClick: isAdminGestor ? actionHandlers.aprovarInterno : null,
      cor: 'default',
    },
    aguardando_confirmacao_vendedor: {
      acao: null,
      onClick: null,
      cor: 'default',
    },
    aprovado_internamente: {
      acao: 'Enviar ao Cliente',
      onClick: actionHandlers.enviarAoCliente,
      cor: 'default',
    },
    enviado_ao_cliente: {
      acao: null,
      onClick: null,
      cor: 'default',
    },
    aprovado_pelo_cliente: {
      acao: 'Orçamento Aprovado',
      onClick: null,
      cor: 'default',
    },
    recusado_pelo_cliente: {
      acao: null,
      onClick: null,
      cor: 'default',
    },
    rejeitado_internamente: {
      acao: 'Reenviar para Aprovação',
      onClick: actionHandlers.enviarParaAprovacao,
      cor: 'default',
    },
  }

  const fluxoAtual = fluxoSimplificado[status]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Fluxo principal */}
        {fluxoAtual.acao && fluxoAtual.onClick && (
          <form action={fluxoAtual.onClick}>
            <Button
              type="submit"
              className="w-full"
              disabled={isPending}
              variant={fluxoAtual.cor === 'destructive' ? 'destructive' : 'default'}
            >
              {fluxoAtual.acao}
            </Button>
          </form>
        )}

        {/* Ações específicas por status */}
        {status === 'aguardando_aprovacao_interna' && isAdminGestor && (
          <>
            <Input
              placeholder="Motivo da rejeição..."
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />
            <form action={actionHandlers.rejeitarInterno}>
              <Button
                type="submit"
                variant="destructive"
                className="w-full"
                disabled={isPending || !comentario.trim()}
              >
                Rejeitar
              </Button>
            </form>
          </>
        )}

        {/* Cliente recusou */}
        {status === 'recusado_pelo_cliente' && (
          <p className="text-center text-sm text-slate-400">Orçamento recusado pelo cliente.</p>
        )}

        {/* Orçamento finalizado (aprovado e convertido) */}
        {status === 'aprovado_pelo_cliente' && (
          <div className="text-center space-y-2">
            <p className="text-sm text-green-600 font-medium">✓ Orçamento Aprovado</p>
            <p className="text-xs text-slate-500">O orçamento foi aprovado pelo cliente</p>
          </div>
        )}

        {/* Ações de exclusão */}
        {(status === 'rascunho' || status === 'rejeitado_internamente') && podeAgir && (
          <>
            <form action={actionHandlers.excluirOrcamento}>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                className="w-full"
                disabled={isPending}
              >
                {confirmExcluir ? 'Confirmar exclusão' : 'Excluir orçamento'}
              </Button>
            </form>
            {confirmExcluir && (
              <Button variant="outline" size="sm" className="w-full" onClick={() => setConfirmExcluir(false)}>
                Cancelar
              </Button>
            )}
          </>
        )}

        {/* Link para pedido existente */}
        {status === 'aprovado_pelo_cliente' && (
          <div className="pt-2 border-t">
            <Link href={`/pedidos?quote_id=${orcamentoId}`}>
              <Button variant="outline" size="sm" className="w-full">
                Ver Pedidos Gerados
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}