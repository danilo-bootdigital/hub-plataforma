'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Upload, FileSpreadsheet, Check, AlertCircle } from 'lucide-react'
import type { Product } from '@/types/database'

type ItemForm = {
  key: string
  product_id: string | null
  descricao: string
  unidade: string
  quantidade: number
  preco_unitario: number
  desconto_item: number
}

type Props = {
  produtos: Product[]
  onImportar: (itens: ItemForm[]) => void
  disabled?: boolean
}

const MAPEAMENTO: Record<string, string> = {
  'produto': 'nome',
  'nome': 'nome',
  'name': 'nome',
  'descricao': 'nome',
  'descrição': 'nome',
  'description': 'nome',
  'quantidade': 'quantidade',
  'qtd': 'quantidade',
  'qty': 'quantidade',
  'preco': 'preco',
  'preço': 'preco',
  'preco_unitario': 'preco',
  'valor': 'preco',
  'price': 'preco',
  'unidade': 'unidade',
  'un': 'unidade',
  'unit': 'unidade',
  'desconto': 'desconto',
  'discount': 'desconto',
}

function detectarColuna(header: string): string | null {
  const normalizado = header.toLowerCase().trim()
  return MAPEAMENTO[normalizado] ?? null
}

type ItemPreview = {
  nome: string
  quantidade: number
  preco_unitario: number
  unidade: string
  desconto: number
  matched: boolean
  product_id: string | null
}

async function parsearEMapear(data: ArrayBuffer, produtos: Product[]): Promise<ItemPreview[]> {
  // xlsx (SheetJS) é pesado e só é necessário ao importar planilha —
  // carregado sob demanda para não entrar no bundle inicial.
  const { read, utils } = await import('xlsx')
  const wb = read(data, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' })
  const headers = (raw[0] ?? []).map(String)
  const rows = raw.slice(1).map((r) => r.map(String))

  const indices: Record<string, number> = {}
  headers.forEach((h, i) => {
    const campo = detectarColuna(h)
    if (campo && !(campo in indices)) {
      indices[campo] = i
    }
  })

  if (!('nome' in indices)) return []

  const produtoMap = new Map<string, Product>()
  produtos.forEach((p) => produtoMap.set(p.nome.toLowerCase().trim(), p))

  return rows
    .map((row) => {
      const nome = row[indices.nome]?.trim()
      if (!nome) return null

      const quantidade = indices.quantidade !== undefined
        ? parseFloat(row[indices.quantidade]?.replace(',', '.')) || 1
        : 1

      const precoStr = indices.preco !== undefined ? row[indices.preco]?.trim() : '0'
      const precoPlanilha = parseFloat(precoStr.replace(/[^\d.,]/g, '').replace(',', '.')) || 0

      const unidade = indices.unidade !== undefined ? row[indices.unidade]?.trim() || 'un' : 'un'

      const desconto = indices.desconto !== undefined
        ? parseFloat(row[indices.desconto]?.replace(',', '.')) || 0
        : 0

      const produtoMatch = produtoMap.get(nome.toLowerCase())

      return {
        nome: produtoMatch ? produtoMatch.nome : nome,
        quantidade,
        preco_unitario: produtoMatch ? produtoMatch.preco_unitario : precoPlanilha,
        unidade: produtoMatch ? (produtoMatch.unidade ?? 'un') : unidade,
        desconto: Math.min(Math.max(desconto, 0), 100),
        matched: !!produtoMatch,
        product_id: produtoMatch?.id ?? null,
      } as ItemPreview
    })
    .filter((p): p is ItemPreview => p !== null)
}

export function ImportarItensPlanilha({ produtos, onImportar, disabled }: Props) {
  const [aberto, setAberto] = useState(false)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [itensPreview, setItensPreview] = useState<ItemPreview[]>([])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setArquivo(file)
    const buffer = await file.arrayBuffer()
    const mapeados = await parsearEMapear(buffer, produtos)
    if (mapeados.length === 0) {
      toast.error('Nenhum item encontrado. Verifique se a planilha tem uma coluna "Produto" ou "Nome".')
      return
    }
    setItensPreview(mapeados)
  }

  function handleConfirmar() {
    const novosItens: ItemForm[] = itensPreview.map((item) => ({
      key: crypto.randomUUID(),
      product_id: item.product_id,
      descricao: item.nome,
      unidade: item.unidade,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      desconto_item: item.desconto,
    }))
    onImportar(novosItens)
    toast.success(`${novosItens.length} itens importados.`)
    setAberto(false)
    setArquivo(null)
    setItensPreview([])
  }

  function handleFechar() {
    setAberto(false)
    setArquivo(null)
    setItensPreview([])
  }

  const matchedCount = itensPreview.filter((i) => i.matched).length
  const unmatchedCount = itensPreview.length - matchedCount

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="gap-1" disabled={disabled} onClick={() => setAberto(true)}>
        <Upload className="h-3.5 w-3.5" /> Importar planilha
      </Button>
      <Dialog open={aberto} onOpenChange={(open) => { if (!open) handleFechar() }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar itens de planilha</DialogTitle>
          </DialogHeader>

        {itensPreview.length === 0 ? (
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-slate-200 p-8 hover:border-slate-400 transition-colors">
            {arquivo ? (
              <>
                <FileSpreadsheet className="h-10 w-10 text-green-500" />
                <span className="text-sm font-medium text-slate-700">{arquivo.name}</span>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-slate-300" />
                <span className="text-sm text-slate-500">Clique ou arraste um arquivo XLSX ou CSV</span>
                <span className="text-xs text-slate-400">Colunas: Produto, Quantidade, Preço, Unidade, Desconto</span>
              </>
            )}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleUpload}
              onClick={(e) => { (e.target as HTMLInputElement).value = '' }}
              className="hidden"
            />
          </label>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-600">{itensPreview.length} itens encontrados</span>
              {matchedCount > 0 && (
                <span className="flex items-center gap-1 text-green-600">
                  <Check className="h-3.5 w-3.5" /> {matchedCount} vinculados
                </span>
              )}
              {unmatchedCount > 0 && (
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertCircle className="h-3.5 w-3.5" /> {unmatchedCount} como descrição livre
                </span>
              )}
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-slate-500">
                    <th className="px-3 py-2">Produto</th>
                    <th className="px-3 py-2">Qtd</th>
                    <th className="px-3 py-2">Preço</th>
                    <th className="px-3 py-2">Un</th>
                    <th className="px-3 py-2">Desc%</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {itensPreview.slice(0, 50).map((item, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-1.5 text-slate-700 truncate max-w-[200px]">{item.nome}</td>
                      <td className="px-3 py-1.5 text-slate-600">{item.quantidade}</td>
                      <td className="px-3 py-1.5 text-slate-600">
                        {item.preco_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-3 py-1.5 text-slate-500">{item.unidade}</td>
                      <td className="px-3 py-1.5 text-slate-500">{item.desconto}%</td>
                      <td className="px-3 py-1.5">
                        {item.matched ? (
                          <span className="text-green-600 font-medium">Vinculado</span>
                        ) : (
                          <span className="text-amber-600">Livre</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {itensPreview.length > 50 && (
                <p className="px-3 py-2 text-xs text-slate-400">... e mais {itensPreview.length - 50} itens</p>
              )}
            </div>
          </div>
        )}

        {itensPreview.length > 0 && (
          <DialogFooter>
            <Button variant="outline" onClick={handleFechar}>Cancelar</Button>
            <Button onClick={handleConfirmar} className="gap-1">
              <Check className="h-4 w-4" /> Importar {itensPreview.length} itens
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
    </>
  )
}
