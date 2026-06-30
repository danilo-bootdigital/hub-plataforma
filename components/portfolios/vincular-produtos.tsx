'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, PackagePlus } from 'lucide-react'
import { formatarMoeda } from '@/lib/utils'
import { vincularProdutosAoPortfolio } from '@/app/(dashboard)/configuracoes/portfolios/actions'
import type { CategoriaComSubs } from '@/components/portfolios/gerenciar-categorias'

type ProdutoLite = { id: string; nome: string; preco_unitario: number }

type Props = {
  portfolioId: string
  produtos: ProdutoLite[]
  vinculadosIds: string[]
  categorias: CategoriaComSubs[]
}

export function VincularProdutos({ portfolioId, produtos, vinculadosIds, categorias }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [categoriaId, setCategoriaId] = useState('')
  const [subcategoriaId, setSubcategoriaId] = useState('')

  const vinculados = useMemo(() => new Set(vinculadosIds), [vinculadosIds])
  const subsFiltradas = categoriaId ? (categorias.find((c) => c.id === categoriaId)?.subcategorias ?? []) : []

  // Disponíveis = produtos ainda não vinculados a este portfólio.
  const disponiveis = useMemo(
    () => produtos.filter((p) => !vinculados.has(p.id)),
    [produtos, vinculados]
  )
  const filtrados = useMemo(
    () => disponiveis.filter((p) => !busca || p.nome.toLowerCase().includes(busca.toLowerCase())),
    [disponiveis, busca]
  )
  const produtosVinculados = produtos.filter((p) => vinculados.has(p.id))

  function toggle(id: string) {
    setSel((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleTodos() {
    setSel((prev) => prev.size === filtrados.length ? new Set() : new Set(filtrados.map((p) => p.id)))
  }
  function fechar() {
    setAberto(false); setSel(new Set()); setBusca(''); setCategoriaId(''); setSubcategoriaId('')
  }

  function confirmar() {
    if (sel.size === 0) { toast.error('Selecione ao menos um produto.'); return }
    startTransition(async () => {
      try {
        const r = await vincularProdutosAoPortfolio(
          portfolioId, Array.from(sel), categoriaId || null, subcategoriaId || null
        ) as { vinculados: number; ignorados: number }
        toast.success(`${r.vinculados} vinculado(s)${r.ignorados ? ` · ${r.ignorados} já existia(m)` : ''}.`)
        fechar()
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao vincular.')
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {produtosVinculados.length} produto(s) neste portfólio.
        </p>
        <Button size="sm" className="gap-1.5" onClick={() => setAberto(true)}>
          <Plus className="h-4 w-4" /> Adicionar produtos
        </Button>
      </div>

      {produtosVinculados.length > 0 ? (
        <div className="rounded-lg border bg-white divide-y">
          {produtosVinculados.slice(0, 50).map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-slate-700">{p.nome}</span>
              <span className="text-slate-400">{formatarMoeda(p.preco_unitario)}</span>
            </div>
          ))}
          {produtosVinculados.length > 50 && (
            <div className="px-4 py-2 text-xs text-slate-400">... e mais {produtosVinculados.length - 50}</div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border bg-white px-4 py-10 text-center text-slate-400">
          <PackagePlus className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          Nenhum produto vinculado. Use “Adicionar produtos”.
        </div>
      )}

      <Dialog open={aberto} onOpenChange={(o) => { if (!o) fechar() }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar produtos ao portfólio</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              O preço do vínculo herda o valor unitário de cada produto (ajustável por portfólio depois). Classificação opcional, aplicada a todos os selecionados.
            </p>

            {/* Classificação opcional */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Categoria (opcional)</Label>
                <Select value={categoriaId || '__none__'} onValueChange={(v: string | null) => { const val = v === '__none__' ? '' : (v ?? ''); setCategoriaId(val); setSubcategoriaId('') }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Sem categoria" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem categoria</SelectItem>
                    {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Subcategoria (opcional)</Label>
                <Select value={subcategoriaId || '__none__'} onValueChange={(v: string | null) => setSubcategoriaId(v === '__none__' ? '' : (v ?? ''))} disabled={!categoriaId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder={categoriaId ? 'Sem subcategoria' : '—'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem subcategoria</SelectItem>
                    {subsFiltradas.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Busca + seleção */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Buscar produto..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={filtrados.length > 0 && sel.size === filtrados.length}
                  onChange={toggleTodos} className="rounded border-slate-300" />
                Selecionar todos os {filtrados.length} filtrados
              </label>
              <span>{sel.size} selecionado(s)</span>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-lg border divide-y">
              {filtrados.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-slate-400">
                  {disponiveis.length === 0 ? 'Todos os produtos já estão neste portfólio.' : 'Nenhum produto encontrado.'}
                </div>
              )}
              {filtrados.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50">
                  <span className="flex items-center gap-2">
                    <input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} className="rounded border-slate-300" />
                    <span className="text-slate-700">{p.nome}</span>
                  </span>
                  <span className="text-slate-400">{formatarMoeda(p.preco_unitario)}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={fechar} disabled={isPending}>Cancelar</Button>
              <Button type="button" onClick={confirmar} disabled={isPending || sel.size === 0}>
                {isPending ? 'Vinculando...' : `Vincular ${sel.size || ''}`.trim()}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
