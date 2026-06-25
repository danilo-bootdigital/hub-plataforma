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
  fornecedores: { id: string; nome: string }[]
  categorias: { id: string; nome: string; supplier_id: string }[]
}

export function ModalNovoProduto({ produto, fornecedores, categorias }: Props) {
  const [aberto, setAberto] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [supplierId, setSupplierId] = useState(produto?.supplier_id ?? '')
  const [categoryId, setCategoryId] = useState(produto?.category_id ?? '')
  const router = useRouter()
  const editando = !!produto

  const categoriasFiltradas = supplierId
    ? categorias.filter(c => c.supplier_id === supplierId)
    : categorias

  function handleFornecedorChange(v: string | null) {
    const val = v === '__none__' ? '' : (v ?? '')
    setSupplierId(val)
    setCategoryId('')
  }

  function handleSubmit(formData: FormData) {
    formData.set('supplier_id', supplierId)
    formData.set('category_id', categoryId || '__none__')
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Fornecedor</Label>
                <Select value={supplierId || '__none__'} onValueChange={handleFornecedorChange}>
                  <SelectTrigger>
                    <span className="flex flex-1 text-left truncate">
                      {supplierId ? fornecedores.find(f => f.id === supplierId)?.nome ?? 'Selecionar' : 'Selecionar fornecedor'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem fornecedor</SelectItem>
                    {fornecedores.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Categoria</Label>
                <Select value={categoryId || '__none__'} onValueChange={(v) => setCategoryId(v === '__none__' ? '' : (v ?? ''))}>
                  <SelectTrigger>
                    <span className="flex flex-1 text-left truncate">
                      {categoryId ? categoriasFiltradas.find(c => c.id === categoryId)?.nome ?? 'Selecionar' : 'Selecionar categoria'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem categoria</SelectItem>
                    {categoriasFiltradas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="nome">Nome do produto *</Label>
              <Input id="nome" name="nome" defaultValue={produto?.nome ?? ''} required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" name="descricao" defaultValue={produto?.descricao ?? ''} rows={2} placeholder="Descrição ou composição do produto" />
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label htmlFor="mg">MG</Label>
                <Input id="mg" name="mg" defaultValue={produto?.composicao ?? ''} placeholder="ex: 500" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ml">ML</Label>
                <Input id="ml" name="ml" defaultValue={produto?.apresentacao ?? ''} placeholder="ex: 30" />
              </div>
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
