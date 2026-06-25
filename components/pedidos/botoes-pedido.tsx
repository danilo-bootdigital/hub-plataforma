'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronRight, X, Trash2, Edit, RotateCcw } from 'lucide-react'
import { avancarStatus, cancelarPedido, excluirPedido, concluirPedido, corrigirStatusPedido } from '@/app/(dashboard)/pedidos/actions'
import { ModalEditarPedido } from '@/components/pedidos/modal-editar-pedido'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

const PROXIMO_LABEL: Record<string, string> = {
  pendente: 'Iniciar Produção',
  em_producao: 'Marcar Pronto',
  pronto: 'Marcar Enviado',
  enviado: 'Marcar Entregue',
  entregue: 'Concluir Pedido',
}

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_producao: 'Em Produção',
  pronto: 'Pronto',
  enviado: 'Enviado',
  entregue: 'Entregue',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

// Transições permitidas para correção de status
const TRANSICOES_CORRECAO: Record<string, string[]> = {
  pronto: ['em_producao'],
  concluido: ['pronto', 'em_producao'],
  em_producao: ['pendente'],
}

export function BotoesPedido({ pedidoId, status, numero, itens, ...pedidoData }: {
  pedidoId: string;
  status: string;
  numero: number;
  itens: any[];
} & any) {
  const [isPending, startTransition] = useTransition()
  const [showCancelar, setShowCancelar] = useState(false)
  const [showExcluir, setShowExcluir] = useState(false)
  const [showEditar, setShowEditar] = useState(false)
  const [showCorrigir, setShowCorrigir] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [senhaAdmin, setSenhaAdmin] = useState('')
  const [novoStatus, setNovoStatus] = useState('')

  const podeAvancar = status in PROXIMO_LABEL
  const podeCancelar = status !== 'cancelado' && status !== 'concluido'
  const podeEditar = status !== 'cancelado' && status !== 'concluido'
  const podeCorrigir = status in TRANSICOES_CORRECAO
  const transicoesDisponiveis = TRANSICOES_CORRECAO[status as string] || []

  function handleAvancar() {
    startTransition(async () => {
      try {
        await avancarStatus(pedidoId)
        toast.success('Status atualizado.')
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao avançar status.')
      }
    })
  }

  function handleCancelar() {
    if (!motivo.trim()) {
      toast.error('Informe o motivo do cancelamento.')
      return
    }
    startTransition(async () => {
      try {
        await cancelarPedido(pedidoId, motivo)
        toast.success('Pedido cancelado.')
        setShowCancelar(false)
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao cancelar.')
      }
    })
  }

  function handleExcluir() {
    if (!senhaAdmin.trim()) {
      toast.error('Informe a senha de administrador.')
      return
    }
    startTransition(async () => {
      try {
        await excluirPedido(pedidoId, senhaAdmin)
        toast.success('Pedido excluído.')
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao excluir.')
        setSenhaAdmin('')
      }
    })
  }

  function handleCorrigir() {
    if (!novoStatus) {
      toast.error('Selecione o novo status.')
      return
    }
    if (!motivo.trim()) {
      toast.error('Informe o motivo da correção.')
      return
    }
    startTransition(async () => {
      try {
        await corrigirStatusPedido(pedidoId, novoStatus, motivo)
        toast.success('Status corrigido com sucesso.')
        setShowCorrigir(false)
        setNovoStatus('')
        setMotivo('')
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao corrigir status.')
      }
    })
  }

  if (!podeAvancar && !podeCancelar && !showExcluir && !showEditar && !showCorrigir) return null

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {showExcluir ? (
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={senhaAdmin}
              onChange={(e) => setSenhaAdmin(e.target.value)}
              placeholder="Senha de administrador..."
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm w-56"
              autoFocus
            />
            <Button size="sm" variant="destructive" onClick={handleExcluir} disabled={isPending}>
              Confirmar Exclusão
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowExcluir(false); setSenhaAdmin('') }} disabled={isPending}>
              Voltar
            </Button>
          </div>
        ) : showCancelar ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo do cancelamento..."
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm w-56"
              autoFocus
            />
            <Button size="sm" variant="destructive" onClick={handleCancelar} disabled={isPending}>
              Confirmar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCancelar(false)} disabled={isPending}>
              Voltar
            </Button>
          </div>
        ) : (
          <>
            {podeAvancar && (
              <Button size="sm" onClick={handleAvancar} disabled={isPending} className="gap-1">
                <ChevronRight className="h-4 w-4" />
                {PROXIMO_LABEL[status]}
              </Button>
            )}
            {podeEditar && (
              <Button size="sm" variant="outline" onClick={() => setShowEditar(true)} disabled={isPending} className="gap-1">
                <Edit className="h-4 w-4" />
                Editar
              </Button>
            )}
            {podeCorrigir && (
              <Button size="sm" variant="outline" onClick={() => setShowCorrigir(true)} disabled={isPending} className="gap-1 text-amber-600 border-amber-200 hover:bg-amber-50">
                <RotateCcw className="h-4 w-4" />
                Corrigir Status
              </Button>
            )}
            {podeCancelar && (
              <Button size="sm" variant="outline" onClick={() => setShowCancelar(true)} disabled={isPending} className="gap-1 text-red-600 border-red-200 hover:bg-red-50">
                <X className="h-4 w-4" />
                Cancelar
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setShowExcluir(true)} disabled={isPending} className="gap-1 text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
              Excluir Pedido
            </Button>
          </>
        )}
      </div>

      {/* Modal de Correção de Status */}
      {showCorrigir && (
        <Dialog open={showCorrigir} onOpenChange={setShowCorrigir}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Corrigir Status do Pedido</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Status Atual</Label>
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  {STATUS_LABELS[status] || status}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="novo-status">Novo Status</Label>
                <Select value={novoStatus} onValueChange={(v) => setNovoStatus(v || '')}>
                  <SelectTrigger id="novo-status">
                    <SelectValue placeholder="Selecione o novo status" />
                  </SelectTrigger>
                  <SelectContent>
                    {transicoesDisponiveis.map((s: string) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s] || s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="motivo-correcao">Motivo da Correção *</Label>
                <Textarea
                  id="motivo-correcao"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Descreva o motivo da correção de status..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowCorrigir(false); setNovoStatus(''); setMotivo('') }} disabled={isPending}>
                Cancelar
              </Button>
              <Button onClick={handleCorrigir} disabled={isPending}>
                {isPending ? 'Corrigindo...' : 'Confirmar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Edição */}
      {showEditar && (
        <ModalEditarPedido
          pedido={{
            pedidoId,
            numero,
            status: status as any,
            itens,
            ...pedidoData,
          }}
          onClose={() => setShowEditar(false)}
        />
      )}
    </>
  )
}
