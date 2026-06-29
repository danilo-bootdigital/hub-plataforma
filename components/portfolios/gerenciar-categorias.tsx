'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, FolderTree } from 'lucide-react'
import {
  criarCategoria, editarCategoria, alternarAtivoCategoria, excluirCategoria,
  criarSubcategoria, editarSubcategoria, alternarAtivoSubcategoria, excluirSubcategoria,
} from '@/app/(dashboard)/configuracoes/portfolios/actions'

export type CategoriaComSubs = {
  id: string
  nome: string
  ativo: boolean
  subcategorias: { id: string; nome: string; ativo: boolean; categoria_id: string }[]
}

type Props = {
  portfolioId: string
  categorias: CategoriaComSubs[]
}

type DialogState =
  | { tipo: 'categoria'; modo: 'criar' }
  | { tipo: 'categoria'; modo: 'editar'; id: string; nome: string }
  | { tipo: 'subcategoria'; modo: 'criar'; categoriaId: string }
  | { tipo: 'subcategoria'; modo: 'editar'; id: string; categoriaId: string; nome: string }
  | null

export function GerenciarCategorias({ portfolioId, categorias }: Props) {
  const [isPending, startTransition] = useTransition()
  const [dialog, setDialog] = useState<DialogState>(null)
  const [nome, setNome] = useState('')
  const router = useRouter()

  function abrir(state: DialogState, nomeInicial = '') {
    setNome(nomeInicial)
    setDialog(state)
  }

  function handleSalvar() {
    if (!dialog) return
    if (!nome.trim()) { toast.error('Informe um nome.'); return }
    startTransition(async () => {
      try {
        if (dialog.tipo === 'categoria' && dialog.modo === 'criar') {
          await criarCategoria(portfolioId, nome)
        } else if (dialog.tipo === 'categoria' && dialog.modo === 'editar') {
          await editarCategoria(dialog.id, portfolioId, nome)
        } else if (dialog.tipo === 'subcategoria' && dialog.modo === 'criar') {
          await criarSubcategoria(dialog.categoriaId, portfolioId, nome)
        } else if (dialog.tipo === 'subcategoria' && dialog.modo === 'editar') {
          await editarSubcategoria(dialog.id, portfolioId, nome)
        }
        setDialog(null)
        router.refresh()
        toast.success('Salvo.')
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao salvar.')
      }
    })
  }

  function run(fn: () => Promise<void>, okMsg?: string) {
    startTransition(async () => {
      try {
        await fn()
        router.refresh()
        if (okMsg) toast.success(okMsg)
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro na operação.')
      }
    })
  }

  const tituloDialog =
    dialog?.tipo === 'categoria'
      ? dialog.modo === 'criar' ? 'Nova categoria' : 'Editar categoria'
      : dialog?.modo === 'criar' ? 'Nova subcategoria' : 'Editar subcategoria'

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => abrir({ tipo: 'categoria', modo: 'criar' })}>
          <Plus className="h-4 w-4" />
          Nova categoria
        </Button>
      </div>

      {categorias.length === 0 && (
        <div className="rounded-lg border bg-white px-4 py-10 text-center text-slate-400">
          <FolderTree className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          Nenhuma categoria neste portfólio.
        </div>
      )}

      <div className="space-y-3">
        {categorias.map((cat) => (
          <div key={cat.id} className="rounded-lg border bg-white">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900">{cat.nome}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cat.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {cat.ativo ? 'Ativa' : 'Inativa'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="gap-1 text-xs"
                  onClick={() => abrir({ tipo: 'subcategoria', modo: 'criar', categoriaId: cat.id })} disabled={isPending}>
                  <Plus className="h-3.5 w-3.5" /> Subcategoria
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => abrir({ tipo: 'categoria', modo: 'editar', id: cat.id, nome: cat.nome }, cat.nome)} disabled={isPending}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="text-xs"
                  onClick={() => run(() => alternarAtivoCategoria(cat.id, portfolioId, !cat.ativo))} disabled={isPending}>
                  {cat.ativo ? 'Desativar' : 'Ativar'}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600"
                  onClick={() => { if (window.confirm(`Excluir categoria "${cat.nome}"?`)) run(() => excluirCategoria(cat.id, portfolioId), 'Categoria excluída.') }} disabled={isPending}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="divide-y">
              {cat.subcategorias.length === 0 && (
                <div className="px-6 py-3 text-sm text-slate-400">Sem subcategorias.</div>
              )}
              {cat.subcategorias.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between px-6 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-700">{sub.nome}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sub.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {sub.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => abrir({ tipo: 'subcategoria', modo: 'editar', id: sub.id, categoriaId: cat.id, nome: sub.nome }, sub.nome)} disabled={isPending}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs"
                      onClick={() => run(() => alternarAtivoSubcategoria(sub.id, portfolioId, !sub.ativo))} disabled={isPending}>
                      {sub.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600"
                      onClick={() => { if (window.confirm(`Excluir subcategoria "${sub.nome}"?`)) run(() => excluirSubcategoria(sub.id, portfolioId), 'Subcategoria excluída.') }} disabled={isPending}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialog !== null} onOpenChange={(o) => { if (!o) setDialog(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tituloDialog}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSalvar() }} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="nome-cat">Nome *</Label>
              <Input id="nome-cat" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus required />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
