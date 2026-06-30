'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { alternarAtivoProduto, excluirProduto, excluirProdutosEmLote } from '@/app/(dashboard)/configuracoes/produtos/actions'
import { vincularProdutosAoPortfolio } from '@/app/(dashboard)/configuracoes/portfolios/actions'
import { cn, formatarMoeda } from '@/lib/utils'
import { Trash2, Search, Pencil, FolderPlus } from 'lucide-react'
import type { Product } from '@/types/database'

type Props = {
  produtos: Product[]
  portfolios: { id: string; nome: string }[]
  // Vínculo N:N Produto↔Portfólio (DEC-013/014). products.portfolio_id não é usado.
  vinculosPorProduto: Record<string, { id: string; nome: string }[]>
}

export function TabelaProdutos({ produtos, portfolios, vinculosPorProduto }: Props) {
  const [isPending, startTransition] = useTransition()
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [busca, setBusca] = useState('')
  const [filtroPortfolio, setFiltroPortfolio] = useState('')
  const [vincularAberto, setVincularAberto] = useState(false)
  const [pfAlvo, setPfAlvo] = useState('')
  const router = useRouter()

  const portfoliosDoProduto = (id: string) => vinculosPorProduto[id] ?? []

  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => {
      if (busca && !p.nome.toLowerCase().includes(busca.toLowerCase())) return false
      if (filtroPortfolio && !(vinculosPorProduto[p.id] ?? []).some((v) => v.id === filtroPortfolio)) return false
      return true
    })
  }, [produtos, busca, filtroPortfolio, vinculosPorProduto])

  function handleAlternarAtivo(id: string, ativoAtual: boolean) {
    startTransition(async () => {
      try {
        await alternarAtivoProduto(id, !ativoAtual)
        router.refresh()
      } catch {
        toast.error('Erro ao alterar status do produto.')
      }
    })
  }

  function handleExcluir(id: string, nome: string) {
    if (!window.confirm(`Excluir "${nome}"? Esta ação não pode ser desfeita.`)) return
    startTransition(async () => {
      try {
        await excluirProduto(id)
        setSelecionados((prev) => { const n = new Set(prev); n.delete(id); return n })
        toast.success('Produto excluído.')
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao excluir.')
      }
    })
  }

  function handleExcluirSelecionados() {
    const ids = Array.from(selecionados)
    if (ids.length === 0) return
    if (!window.confirm(`Excluir ${ids.length} produto(s) selecionado(s)? Esta ação não pode ser desfeita.`)) return
    startTransition(async () => {
      try {
        await excluirProdutosEmLote(ids)
        setSelecionados(new Set())
        toast.success(`${ids.length} produto(s) excluído(s).`)
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao excluir.')
      }
    })
  }

  function handleVincular() {
    const ids = Array.from(selecionados)
    if (ids.length === 0 || !pfAlvo) return
    startTransition(async () => {
      try {
        const r = await vincularProdutosAoPortfolio(pfAlvo, ids) as { vinculados: number; ignorados: number }
        toast.success(`${r.vinculados} vinculado(s)${r.ignorados ? ` · ${r.ignorados} já existia(m)` : ''}.`)
        setVincularAberto(false)
        setPfAlvo('')
        setSelecionados(new Set())
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao vincular.')
      }
    })
  }

  function toggleSelecionado(id: string) {
    setSelecionados((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function toggleTodos() {
    if (selecionados.size === produtosFiltrados.length) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(produtosFiltrados.map((p) => p.id)))
    }
  }

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroPortfolio || '__all__'} onValueChange={(v) => setFiltroPortfolio(v === '__all__' ? '' : (v ?? ''))}>
          <SelectTrigger className="w-56">
            <span className="truncate">{filtroPortfolio ? portfolios.find(p => p.id === filtroPortfolio)?.nome : 'Todos os portfólios'}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os portfólios</SelectItem>
            {portfolios.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selecionados.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2">
          <span className="text-sm font-medium text-slate-700">{selecionados.size} selecionado(s)</span>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setVincularAberto(true)}
            disabled={isPending || portfolios.length === 0}
          >
            <FolderPlus className="h-3.5 w-3.5" />
            Vincular ao portfólio
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={handleExcluirSelecionados}
            disabled={isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Excluir selecionados
          </Button>
          <button
            type="button"
            onClick={() => setSelecionados(new Set())}
            className="text-xs text-slate-500 hover:text-slate-700 ml-auto"
          >
            Limpar seleção
          </button>
        </div>
      )}

      <Dialog open={vincularAberto} onOpenChange={(o) => { if (!o) { setVincularAberto(false); setPfAlvo('') } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular {selecionados.size} produto(s) a um portfólio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              O preço do vínculo herda o valor unitário de cada produto. Produtos já vinculados são ignorados.
            </p>
            <div className="space-y-1">
              <Label>Portfólio de destino</Label>
              <Select value={pfAlvo || '__none__'} onValueChange={(v: string | null) => setPfAlvo(v === '__none__' ? '' : (v ?? ''))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Selecionar portfólio..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" disabled>Selecionar...</SelectItem>
                  {portfolios.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setVincularAberto(false); setPfAlvo('') }} disabled={isPending}>Cancelar</Button>
              <Button type="button" onClick={handleVincular} disabled={isPending || !pfAlvo}>
                {isPending ? 'Vinculando...' : 'Vincular'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={produtosFiltrados.length > 0 && selecionados.size === produtosFiltrados.length}
                  onChange={toggleTodos}
                  className="rounded border-slate-300"
                />
              </th>
              <th className="px-4 py-3 font-medium text-slate-600">Nome</th>
              <th className="px-4 py-3 font-medium text-slate-600">Portfólio</th>
              <th className="px-4 py-3 font-medium text-slate-600">Volume</th>
              <th className="px-4 py-3 font-medium text-slate-600">Apresentação</th>
              <th className="px-4 py-3 font-medium text-slate-600">Preço</th>
              <th className="px-4 py-3 font-medium text-slate-600">Unidade</th>
              <th className="px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 font-medium text-slate-600">Ações</th>
            </tr>
          </thead>
          <tbody>
            {produtosFiltrados.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
            {produtosFiltrados.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selecionados.has(p.id)}
                    onChange={() => toggleSelecionado(p.id)}
                    className="rounded border-slate-300"
                  />
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  <span className="flex items-center gap-2">
                    {p.nome}
                    {p.exige_receita && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">Receita</span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {portfoliosDoProduto(p.id).length === 0
                    ? '—'
                    : portfoliosDoProduto(p.id).map((v) => v.nome).join(', ')}
                </td>
                <td className="px-4 py-3 text-slate-600">{p.volume ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{p.apresentacao ?? '—'}</td>
                <td className="px-4 py-3 text-slate-700">{formatarMoeda(p.preco_unitario)}</td>
                <td className="px-4 py-3 text-slate-600">{p.unidade}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/configuracoes/produtos/${p.id}/editar`}
                      className={cn(buttonVariants({ variant: 'ghost', size: 'icon-xs' }))}
                      aria-label={`Editar ${p.nome}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleAlternarAtivo(p.id, p.ativo)}
                      disabled={isPending}
                    >
                      {p.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-400 hover:text-red-600"
                      onClick={() => handleExcluir(p.id, p.nome)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
