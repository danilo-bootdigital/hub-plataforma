'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { criarProduto, editarProduto } from '@/app/(dashboard)/configuracoes/produtos/actions'
import { Plus, Pencil } from 'lucide-react'
import type { Product } from '@/types/database'

type Props = {
  produto?: Product
  portfolios: { id: string; nome: string }[]
  categoriasCatalogo: { id: string; nome: string; portfolio_id: string }[]
  subcategorias: { id: string; nome: string; categoria_id: string }[]
}

export function ModalNovoProduto({ produto, portfolios, categoriasCatalogo, subcategorias }: Props) {
  const [aberto, setAberto] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [portfolioId, setPortfolioId] = useState(produto?.portfolio_id ?? '')
  const [categoriaId, setCategoriaId] = useState(produto?.categoria_id ?? '')
  const [subcategoriaId, setSubcategoriaId] = useState(produto?.subcategoria_id ?? '')
  const router = useRouter()
  const editando = !!produto

  const catCatalogoFiltradas = portfolioId
    ? categoriasCatalogo.filter((c) => c.portfolio_id === portfolioId)
    : []
  const subsFiltradas = categoriaId
    ? subcategorias.filter((s) => s.categoria_id === categoriaId)
    : []

  function handlePortfolioChange(v: string | null) {
    const val = v === '__none__' ? '' : (v ?? '')
    setPortfolioId(val)
    setCategoriaId('')
    setSubcategoriaId('')
  }

  function handleCategoriaChange(v: string | null) {
    const val = v === '__none__' ? '' : (v ?? '')
    setCategoriaId(val)
    setSubcategoriaId('')
  }

  function handleSubmit(formData: FormData) {
    formData.set('portfolio_id', portfolioId || '__none__')
    formData.set('categoria_id', categoriaId || '__none__')
    formData.set('subcategoria_id', subcategoriaId || '__none__')
    startTransition(async () => {
      try {
        if (editando) {
          await editarProduto(produto.id, formData)
        } else {
          await criarProduto(formData)
        }
        setAberto(false)
        router.refresh()
        toast.success(editando ? 'Produto atualizado.' : 'Produto criado.')
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao salvar produto.')
      }
    })
  }

  return (
    <>
      {editando ? (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAberto(true)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <Button size="sm" className="gap-1.5" onClick={() => setAberto(true)}>
          <Plus className="h-4 w-4" />
          Novo produto
        </Button>
      )}
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar produto' : 'Novo produto'}</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="nome">Nome do produto *</Label>
              <Input id="nome" name="nome" defaultValue={produto?.nome ?? ''} required autoFocus />
            </div>

            {/* Catálogo (DEC-012): Portfólio → Categoria → Subcategoria */}
            <div className="space-y-3 rounded-md border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Catálogo</p>

              <div className="space-y-1">
                <Label>Portfólio</Label>
                <Select value={portfolioId || '__none__'} onValueChange={handlePortfolioChange}>
                  <SelectTrigger className="w-full">
                    <span className="flex-1 truncate text-left">
                      {portfolioId ? portfolios.find(p => p.id === portfolioId)?.nome ?? 'Selecionar' : 'Sem portfólio'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem portfólio</SelectItem>
                    {portfolios.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Categoria</Label>
                  <Select value={categoriaId || '__none__'} onValueChange={handleCategoriaChange} disabled={!portfolioId}>
                    <SelectTrigger className="w-full">
                      <span className="flex-1 truncate text-left">
                        {categoriaId ? catCatalogoFiltradas.find(c => c.id === categoriaId)?.nome ?? 'Selecionar' : (portfolioId ? 'Sem categoria' : '—')}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem categoria</SelectItem>
                      {catCatalogoFiltradas.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Subcategoria</Label>
                  <Select value={subcategoriaId || '__none__'} onValueChange={(v) => setSubcategoriaId(v === '__none__' ? '' : (v ?? ''))} disabled={!categoriaId}>
                    <SelectTrigger className="w-full">
                      <span className="flex-1 truncate text-left">
                        {subcategoriaId ? subsFiltradas.find(s => s.id === subcategoriaId)?.nome ?? 'Selecionar' : (categoriaId ? 'Sem subcategoria' : '—')}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem subcategoria</SelectItem>
                      {subsFiltradas.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" name="descricao" defaultValue={produto?.descricao ?? ''} rows={2} placeholder="Descrição ou composição do produto" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="preco_unitario">Preço (R$)</Label>
                <Input
                  id="preco_unitario"
                  name="preco_unitario"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={produto?.preco_unitario ?? ''}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="unidade">Unidade</Label>
                <Input id="unidade" name="unidade" defaultValue={produto?.unidade ?? 'un'} placeholder="un, cx..." />
              </div>
              <div className="space-y-1">
                <Label htmlFor="mg">MG</Label>
                <Input id="mg" name="mg" defaultValue={produto?.composicao ?? ''} placeholder="ex: 500" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ml">ML</Label>
                <Input id="ml" name="ml" defaultValue={produto?.apresentacao ?? ''} placeholder="ex: 30" />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Salvando...' : editando ? 'Salvar alterações' : 'Criar produto'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
