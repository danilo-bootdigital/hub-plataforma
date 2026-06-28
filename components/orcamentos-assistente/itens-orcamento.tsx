'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Check } from 'lucide-react'
import { formatarMoeda } from '@/lib/utils'
import {
  adicionarItemOrcamento,
  alterarItemQuantidade,
  removerItemOrcamento,
} from '@/app/(dashboard)/assistente/orcamentos/actions'

export type ItemOrcamento = {
  id: string
  descricao: string
  quantidade: number
  preco_unitario: number
  subtotal: number
}
type ProdutoOpcao = { id: string; nome: string; preco_unitario: number }

export function ItensOrcamento({
  quoteId,
  editavel,
  produtos,
  itens,
  totalBruto,
}: {
  quoteId: string
  editavel: boolean
  produtos: ProdutoOpcao[]
  itens: ItemOrcamento[]
  totalBruto: number
}) {
  const [isPending, startTransition] = useTransition()
  const [produtoId, setProdutoId] = useState('')
  const [qtdNovo, setQtdNovo] = useState('1')
  const [qtdEdit, setQtdEdit] = useState<Record<string, string>>(
    Object.fromEntries(itens.map((i) => [i.id, String(i.quantidade)]))
  )
  const router = useRouter()

  function run(fn: () => Promise<void>, ok: string) {
    startTransition(async () => {
      try {
        await fn()
        toast.success(ok)
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro.')
      }
    })
  }

  function adicionar() {
    if (!produtoId) return toast.error('Selecione um produto.')
    const q = Number(qtdNovo)
    if (!Number.isFinite(q) || q <= 0) return toast.error('Quantidade deve ser maior que zero.')
    run(async () => {
      await adicionarItemOrcamento(quoteId, produtoId, q)
      setProdutoId('')
      setQtdNovo('1')
    }, 'Item adicionado.')
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left">
              <th className="px-4 py-3 font-medium text-slate-600">Produto</th>
              <th className="px-4 py-3 font-medium text-slate-600 w-40">Quantidade</th>
              <th className="px-4 py-3 font-medium text-slate-600">Valor unitário</th>
              <th className="px-4 py-3 font-medium text-slate-600">Subtotal</th>
              {editavel && <th className="px-4 py-3 w-16">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 && (
              <tr>
                <td colSpan={editavel ? 5 : 4} className="px-4 py-8 text-center text-slate-400">
                  Nenhum item adicionado.
                </td>
              </tr>
            )}
            {itens.map((i) => (
              <tr key={i.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium text-slate-800">{i.descricao}</td>
                <td className="px-4 py-3">
                  {editavel ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={qtdEdit[i.id] ?? String(i.quantidade)}
                        onChange={(e) => setQtdEdit((m) => ({ ...m, [i.id]: e.target.value }))}
                        className="h-8 w-24"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() => run(() => alterarItemQuantidade(quoteId, i.id, Number(qtdEdit[i.id])), 'Quantidade atualizada.')}
                      >
                        <Check className="h-4 w-4 text-emerald-600" />
                      </Button>
                    </div>
                  ) : (
                    Number(i.quantidade)
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{formatarMoeda(Number(i.preco_unitario))}</td>
                <td className="px-4 py-3 text-slate-800">{formatarMoeda(Number(i.subtotal))}</td>
                {editavel && (
                  <td className="px-4 py-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => run(() => removerItemOrcamento(quoteId, i.id), 'Item removido.')}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-slate-50">
              <td colSpan={editavel ? 3 : 2} className="px-4 py-3 text-right font-medium text-slate-600">Total Bruto</td>
              <td className="px-4 py-3 font-bold text-slate-900">{formatarMoeda(Number(totalBruto))}</td>
              {editavel && <td />}
            </tr>
          </tfoot>
        </table>
      </div>

      {editavel ? (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-white p-4">
          <div className="min-w-56 flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-500">Produto</label>
            <select
              value={produtoId}
              disabled={isPending}
              onChange={(e) => setProdutoId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">— Selecione —</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome} — {formatarMoeda(Number(p.preco_unitario))}</option>
              ))}
            </select>
          </div>
          <div className="w-28">
            <label className="mb-1 block text-xs font-medium text-slate-500">Qtd</label>
            <Input type="number" min={0} step="any" value={qtdNovo} onChange={(e) => setQtdNovo(e.target.value)} className="h-9" />
          </div>
          <Button className="gap-1.5" disabled={isPending} onClick={adicionar}>
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>
      ) : (
        <p className="text-sm text-slate-500">Itens só podem ser alterados enquanto o Orçamento está em <strong>RASCUNHO</strong>.</p>
      )}
    </div>
  )
}
