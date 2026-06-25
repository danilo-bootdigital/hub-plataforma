'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { BadgeStatusPedido } from '@/components/pedidos/badge-status-pedido'
import { formatarMoeda } from '@/lib/utils'
import { editarPedido } from '@/app/(dashboard)/pedidos/actions'
import type { OrderStatus } from '@/types/database'
import type { OrderItem } from '@/types/database'

type EditarPedidoProps = {
  pedidoId: string
  numero: number
  status: OrderStatus
  lead_id?: string | null
  deal_id?: string | null
  contato_id?: string | null
  valor_total: number
  desconto_geral: number
  frete: number
  observacoes?: string | null
  endereco_entrega?: string | null
  forma_pagamento?: string | null
  itens: OrderItem[]
}

export function ModalEditarPedido({
  pedido,
  onClose,
}: {
  pedido: EditarPedidoProps
  onClose: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [senhaAdmin, setSenhaAdmin] = useState('')
  const [motivo, setMotivo] = useState('')
  const [itens, setItens] = useState(pedido.itens.map(item => ({ ...item })))
  const [dadosBasicos, setDadosBasicos] = useState({
    valor_total: pedido.valor_total,
    desconto_geral: pedido.desconto_geral,
    frete: pedido.frete,
    observacoes: pedido.observacoes || '',
    endereco_entrega: pedido.endereco_entrega || '',
    forma_pagamento: pedido.forma_pagamento || '',
  })

  function executar(action: () => Promise<void>, mensagem: string) {
    startTransition(async () => {
      try {
        await action()
        toast.success(mensagem)
        router.refresh()
        onClose()
      } catch (e: unknown) {
        if (isRedirectError(e)) throw e
        toast.error(e instanceof Error ? e.message : 'Erro ao executar ação.')
      }
    })
  }

  function adicionarItem() {
    const novoItem: OrderItem = {
      id: crypto.randomUUID(),
      order_id: '',
      product_id: null,
      descricao: '',
      quantidade: 1,
      preco_unitario: 0,
      desconto_item: 0,
      subtotal: 0,
    }
    setItens([...itens, novoItem])
  }

  function removerItem(itemId: string) {
    setItens(itens.filter(item => item.id !== itemId))
  }

  function atualizarItem(itemId: string, campo: string, valor: any) {
    setItens(itens.map(item => {
      if (item.id === itemId) {
        const itemAtualizado = { ...item, [campo]: valor }
        if (campo === 'quantidade' || campo === 'preco_unitario' || campo === 'desconto_item') {
          itemAtualizado.subtotal = Math.round(
            itemAtualizado.quantidade * itemAtualizado.preco_unitario * (1 - itemAtualizado.desconto_item / 100) * 100
          ) / 100
        }
        return itemAtualizado
      }
      return item
    }))
  }

  function calcularTotais() {
    const subtotal = itens.reduce((acc, item) => acc + item.subtotal, 0)
    const valorTotal = Math.round((subtotal * (1 - dadosBasicos.desconto_geral / 100) + dadosBasicos.frete) * 100) / 100
    return { subtotal, valorTotal }
  }

  const { subtotal, valorTotal } = calcularTotais()

  function handleSubmit() {
    if (!motivo.trim()) {
      toast.error('Informe o motivo da alteração.')
      return
    }

    executar(
      () => editarPedido(pedido.pedidoId, {
        valor_total: dadosBasicos.valor_total,
        desconto_geral: dadosBasicos.desconto_geral,
        frete: dadosBasicos.frete,
        observacoes: dadosBasicos.observacoes || null,
        endereco_entrega: dadosBasicos.endereco_entrega || null,
        forma_pagamento: dadosBasicos.forma_pagamento || null,
        itens: itens.map(item => ({
          product_id: item.product_id,
          descricao: item.descricao,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          desconto_item: item.desconto_item,
          subtotal: item.subtotal,
        })),
      }, senhaAdmin, motivo.trim()),
      'Pedido atualizado com sucesso!'
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Editar Pedido #{pedido.numero}</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
          <p className="text-sm text-slate-500">
            Alterações em pedidos exigem autorização de administrador.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avisos de segurança */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              ⚠️ Esta ação requer senha de administrador e será registrada no histórico de auditoria.
            </p>
          </div>

          {/* Dados do pedido */}
          <div>
            <h3 className="font-medium mb-3">Dados do Pedido</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <BadgeStatusPedido status={pedido.status} />
              </div>
              <div>
                <Label>Valor Total</Label>
                <p className="font-medium">{formatarMoeda(valorTotal)}</p>
              </div>
            </div>
          </div>

          {/* Itens do pedido */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Itens do Pedido</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={adicionarItem}
              >
                + Adicionar item
              </Button>
            </div>
            <div className="space-y-3">
              {itens.map((item) => (
                <Card key={item.id} className="p-3">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <Input
                        placeholder="Descrição"
                        value={item.descricao}
                        onChange={(e) => atualizarItem(item.id, 'descricao', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Qtd"
                        value={item.quantidade}
                        onChange={(e) => atualizarItem(item.id, 'quantidade', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Unit."
                        value={item.preco_unitario}
                        onChange={(e) => atualizarItem(item.id, 'preco_unitario', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Desc %"
                        value={item.desconto_item}
                        onChange={(e) => atualizarItem(item.id, 'desconto_item', parseFloat(e.target.value) || 0)}
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </div>
                    <div className="col-span-1 text-right">
                      <p className="font-medium">{formatarMoeda(item.subtotal)}</p>
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removerItem(item.id)}
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <div className="mt-4 border-t pt-3">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatarMoeda(subtotal)}</span>
              </div>
              {dadosBasicos.desconto_geral > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Desconto ({dadosBasicos.desconto_geral}%)</span>
                  <span>-{formatarMoeda(subtotal * dadosBasicos.desconto_geral / 100)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Total</span>
                <span>{formatarMoeda(valorTotal)}</span>
              </div>
            </div>
          </div>

          {/* Outros dados */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="endereco">Endereço de Entrega</Label>
              <Textarea
                id="endereco"
                value={dadosBasicos.endereco_entrega}
                onChange={(e) => setDadosBasicos({ ...dadosBasicos, endereco_entrega: e.target.value })}
                placeholder="Endereço de entrega"
              />
            </div>
            <div>
              <Label htmlFor="pagamento">Forma de Pagamento</Label>
              <Input
                id="pagamento"
                value={dadosBasicos.forma_pagamento}
                onChange={(e) => setDadosBasicos({ ...dadosBasicos, forma_pagamento: e.target.value })}
                placeholder="Ex: PIX, Cartão, etc."
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={dadosBasicos.observacoes}
                onChange={(e) => setDadosBasicos({ ...dadosBasicos, observacoes: e.target.value })}
                placeholder="Observações adicionais"
              />
            </div>
          </div>

          {/* Autorização */}
          <div className="border-t pt-4 space-y-4">
            <div>
              <Label htmlFor="senha">Senha de Administrador</Label>
              <Input
                id="senha"
                type="password"
                value={senhaAdmin}
                onChange={(e) => setSenhaAdmin(e.target.value)}
                placeholder="Digite a senha de administrador"
              />
            </div>
            <div>
              <Label htmlFor="motivo">Motivo da Alteração</Label>
              <Textarea
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Explique o motivo da alteração deste pedido..."
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex-1"
            >
              {isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}