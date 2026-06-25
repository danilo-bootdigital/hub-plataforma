'use client'

import { useState, useTransition } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  editarPedido,
  verificarPedidoPodeEditar,
} from '@/app/(dashboard)/pedidos/actions'
import type { OrderStatus } from '@/types/database'

type Props = {
  pedido: {
    id: string
    numero: number
    status: OrderStatus
    valor_total: number
    desconto_geral: number
    frete: number
    observacoes: string | null
    endereco_entrega: string | null
    forma_pagamento: string | null
    criado_em: string
    atualizado_em: string
  }
  itens: Array<{
    id: string
    descricao: string
    quantidade: number
    preco_unitario: number
    desconto_item: number
    subtotal: number
  }>
}

export default function EditarPedidoPage({ pedido, itens }: Props) {
  const router = useRouter()
  const params = useParams()
  const pedidoId = params.id as string
  const [isPending, startTransition] = useTransition()
  const [showSenhaForm, setShowSenhaForm] = useState(false)
  const [senha, setSenha] = useState('')
  const [motivo, setMotivo] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    observacoes: pedido.observacoes || '',
    endereco_entrega: pedido.endereco_entrega || '',
    forma_pagamento: pedido.forma_pagamento || '',
    desconto_geral: pedido.desconto_geral,
    frete: pedido.frete,
  })

  async function solicitarPermissaoEdicao() {
    if (!motivo.trim()) {
      toast.error('Informe o motivo da alteração.')
      return
    }

    const { error } = await verificarPedidoPodeEditar(pedidoId, senha, motivo.trim())

    if (error) {
      toast.error(error)
      setSenha('')
      return
    }

    setShowSenhaForm(false)
    setIsEditing(true)
    toast.success('Alteração autorizada! Pode editar os campos.')
  }

  function handleSalvar() {
    startTransition(async () => {
      try {
        await editarPedido(pedidoId, {
          ...editData,
          itens: itens.map(item => ({
            id: item.id,
            descricao: item.descricao,
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario,
            desconto_item: item.desconto_item,
            subtotal: item.subtotal,
          }))
        }, senha, motivo.trim())
        toast.success('Pedido atualizado com sucesso!')
        router.push(`/pedidos/${pedidoId}`)
      } catch (e: unknown) {
        if (isRedirectError(e)) throw e
        toast.error(e instanceof Error ? e.message : 'Erro ao atualizar pedido.')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Editar Pedido #{pedido.numero}</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Voltar
        </Button>
      </div>

      {/* Status do pedido */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações do Pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <p className="font-medium">{pedido.status}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Criado em</p>
              <p className="font-medium">{new Date(pedido.criado_em).toLocaleDateString('pt-BR')}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Valor Total</p>
              <p className="font-medium">R$ {pedido.valor_total.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Última atualização</p>
              <p className="font-medium">{new Date(pedido.atualizado_em).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulário de senha para edição */}
      {showSenhaForm && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-base text-amber-800">Autorização de Alteração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="senha" className="text-sm font-medium text-amber-800">
                Senha Administrativa
              </Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite a senha administrativa"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="motivo" className="text-sm font-medium text-amber-800">
                Motivo da Alteração
              </Label>
              <Textarea
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Explique o motivo da alteração deste pedido"
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={solicitarPermissaoEdicao} disabled={isPending}>
                Autorizar Alteração
              </Button>
              <Button variant="outline" onClick={() => setShowSenhaForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulário de edição */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Editar Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={editData.observacoes}
                onChange={(e) => setEditData({ ...editData, observacoes: e.target.value })}
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="endereco_entrega">Endereço de Entrega</Label>
              <Input
                id="endereco_entrega"
                value={editData.endereco_entrega}
                onChange={(e) => setEditData({ ...editData, endereco_entrega: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="desconto_geral">Desconto Geral (%)</Label>
                <Input
                  id="desconto_geral"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={editData.desconto_geral}
                  onChange={(e) => setEditData({ ...editData, desconto_geral: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="frete">Valor do Frete</Label>
                <Input
                  id="frete"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editData.frete}
                  onChange={(e) => setEditData({ ...editData, frete: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="forma_pagamento">Forma de Pagamento</Label>
              <Input
                id="forma_pagamento"
                value={editData.forma_pagamento}
                onChange={(e) => setEditData({ ...editData, forma_pagamento: e.target.value })}
                className="mt-1"
                placeholder="Ex: PIX, Cartão, Boleto, etc."
              />
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleSalvar} disabled={isPending}>
                Salvar Alterações
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancelar Edição
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Itens do pedido (somente leitura) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Itens do Pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-slate-500">
                  <th className="pb-2 pr-4">Descrição</th>
                  <th className="pb-2 pr-4 text-right">Qtd</th>
                  <th className="pb-2 pr-4 text-right">Preço unit.</th>
                  <th className="pb-2 pr-4 text-right">Desc.</th>
                  <th className="pb-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium text-slate-900">{item.descricao}</td>
                    <td className="py-2 pr-4 text-right text-slate-700">{item.quantidade}</td>
                    <td className="py-2 pr-4 text-right text-slate-700">R$ {item.preco_unitario.toFixed(2)}</td>
                    <td className="py-2 pr-4 text-right text-slate-600">{item.desconto_item > 0 ? `${item.desconto_item}%` : '—'}</td>
                    <td className="py-2 text-right font-medium text-slate-900">R$ {item.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Botão para solicitar edição (se não estiver editando) */}
      {!isEditing && !showSenhaForm && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => setShowSenhaForm(true)}
            disabled={pedido.status === 'concluido' || pedido.status === 'cancelado'}
          >
            Editar Pedido
          </Button>
          <p className="text-xs text-slate-500 mt-2">
            {pedido.status === 'concluido' || pedido.status === 'cancelado'
              ? 'Pedidos concluídos ou cancelados não podem ser editados.'
              : 'A edição de pedidos requer autorização administrativa.'}
          </p>
        </div>
      )}
    </div>
  )
}