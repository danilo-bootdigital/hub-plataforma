'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { ModalNovoProduto } from './modal-novo-produto'
import { alternarAtivoProduto, excluirProduto, excluirProdutosEmLote } from '@/app/(dashboard)/configuracoes/produtos/actions'
import { formatarMoeda } from '@/lib/utils'
import { Trash2, Search } from 'lucide-react'
import type { Product } from '@/types/database'

type Props = {
  produtos: Product[]
  fornecedores: { id: string; nome: string }[]
  categorias: { id: string; nome: string; supplier_id: string }[]
}

export function TabelaProdutos({ produtos, fornecedores, categorias }: Props) {
  const [isPending, startTransition] = useTransition()
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [busca, setBusca] = useState('')
  const [filtroFornecedor, setFiltroFornecedor] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const router = useRouter()

  const categoriasFiltradas = useMemo(() => {
    if (!filtroFornecedor) return categorias
    return categorias.filter((c) => c.supplier_id === filtroFornecedor)
  }, [categorias, filtroFornecedor])

  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => {
      if (busca) {
        const termo = busca.toLowerCase()
        if (!p.nome.toLowerCase().includes(termo)) return false
      }
      if (filtroFornecedor && p.supplier_id !== filtroFornecedor) return false
      if (filtroCategoria && p.category_id !== filtroCategoria) return false
      return true
    })
  }, [produtos, busca, filtroFornecedor, filtroCategoria])

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
        <Select value={filtroFornecedor || '__all__'} onValueChange={(v) => { setFiltroFornecedor(v === '__all__' ? '' : (v ?? '')); setFiltroCategoria('') }}>
          <SelectTrigger className="w-48">
            <span className="truncate">{filtroFornecedor ? fornecedores.find(f => f.id === filtroFornecedor)?.nome : 'Todos fornecedores'}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos fornecedores</SelectItem>
            {fornecedores.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {categoriasFiltradas.length > 0 && (
          <Select value={filtroCategoria || '__all__'} onValueChange={(v) => setFiltroCategoria(v === '__all__' ? '' : (v ?? ''))}>
            <SelectTrigger className="w-48">
              <span className="truncate">{filtroCategoria ? categoriasFiltradas.find(c => c.id === filtroCategoria)?.nome : 'Todas categorias'}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas categorias</SelectItem>
              {categoriasFiltradas.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selecionados.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2">
          <span className="text-sm text-red-700 font-medium">{selecionados.size} selecionado(s)</span>
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
            className="text-xs text-red-500 hover:text-red-700 ml-auto"
          >
            Limpar seleção
          </button>
        </div>
      )}

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
              <th className="px-4 py-3 font-medium text-slate-600">Descrição</th>
              <th className="px-4 py-3 font-medium text-slate-600">Preço</th>
              <th className="px-4 py-3 font-medium text-slate-600">Unidade</th>
              <th className="px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 font-medium text-slate-600">Ações</th>
            </tr>
          </thead>
          <tbody>
            {produtosFiltrados.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
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
                <td className="px-4 py-3 font-medium text-slate-900">{p.nome}</td>
                <td className="px-4 py-3 text-slate-600">{p.descricao ?? '—'}</td>
                <td className="px-4 py-3 text-slate-700">{formatarMoeda(p.preco_unitario)}</td>
                <td className="px-4 py-3 text-slate-600">{p.unidade}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <ModalNovoProduto produto={p} fornecedores={fornecedores} categorias={categorias} />
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
