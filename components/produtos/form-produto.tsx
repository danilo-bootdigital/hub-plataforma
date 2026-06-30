'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { criarProduto, editarProduto, alternarAtivoProduto } from '@/app/(dashboard)/configuracoes/produtos/actions'
import { ChevronRight } from 'lucide-react'
import type { Product } from '@/types/database'

type Props = {
  produto?: Product
  portfolios: { id: string; nome: string }[]
  categoriasCatalogo: { id: string; nome: string; portfolio_id: string }[]
  subcategorias: { id: string; nome: string; categoria_id: string }[]
}

const LISTA = '/configuracoes/produtos'

export function FormProduto({ produto, portfolios, categoriasCatalogo, subcategorias }: Props) {
  const editando = !!produto
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [portfolioId, setPortfolioId] = useState(produto?.portfolio_id ?? '')
  const [categoriaId, setCategoriaId] = useState(produto?.categoria_id ?? '')
  const [subcategoriaId, setSubcategoriaId] = useState(produto?.subcategoria_id ?? '')
  const [ativo, setAtivo] = useState(produto?.ativo ?? true)

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

  function handleToggleAtivo(next: boolean) {
    if (!produto) return
    setAtivo(next)
    startTransition(async () => {
      try {
        await alternarAtivoProduto(produto.id, next)
        router.refresh()
      } catch {
        setAtivo(!next)
        toast.error('Erro ao alterar status do produto.')
      }
    })
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
        toast.success(editando ? 'Produto atualizado.' : 'Produto criado.')
        router.push(LISTA)
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao salvar produto.')
      }
    })
  }

  const titulo = editando ? 'Editar Produto' : 'Novo Produto'

  return (
    <form action={handleSubmit} className="mx-auto w-full max-w-4xl space-y-6 pb-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-500">
        <Link href="/configuracoes" className="hover:text-slate-700">Configurações</Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
        <Link href={LISTA} className="hover:text-slate-700">Produtos</Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
        <span className="font-medium text-slate-700">{titulo}</span>
      </nav>

      {/* Cabeçalho + ações */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{titulo}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {editando ? 'Atualize as informações do produto.' : 'Cadastre um novo produto no sistema.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => router.push(LISTA)} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Salvando...' : 'Salvar Produto'}
          </Button>
        </div>
      </div>

      {/* CARD 1 — Informações Gerais */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Gerais</CardTitle>
          <CardDescription>Identificação básica do produto.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="nome">Nome do Produto *</Label>
            <Input id="nome" name="nome" defaultValue={produto?.nome ?? ''} required autoFocus />
          </div>
          <div className="space-y-1">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" name="descricao" defaultValue={produto?.descricao ?? ''} rows={3} placeholder="Descrição do produto" />
          </div>
        </CardContent>
      </Card>

      {/* CARD 2 — Classificação */}
      <Card>
        <CardHeader>
          <CardTitle>Classificação</CardTitle>
          <CardDescription>Organização do produto no catálogo.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Portfólio</Label>
              <Select value={portfolioId || '__none__'} onValueChange={handlePortfolioChange}>
                <SelectTrigger className="w-full">
                  <span className="flex-1 truncate text-left">
                    {portfolioId ? portfolios.find((p) => p.id === portfolioId)?.nome ?? 'Selecionar' : 'Sem portfólio'}
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
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={categoriaId || '__none__'} onValueChange={handleCategoriaChange} disabled={!portfolioId}>
                <SelectTrigger className="w-full">
                  <span className="flex-1 truncate text-left">
                    {categoriaId ? catCatalogoFiltradas.find((c) => c.id === categoriaId)?.nome ?? 'Selecionar' : (portfolioId ? 'Sem categoria' : '—')}
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
                    {subcategoriaId ? subsFiltradas.find((s) => s.id === subcategoriaId)?.nome ?? 'Selecionar' : (categoriaId ? 'Sem subcategoria' : '—')}
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
        </CardContent>
      </Card>

      {/* CARD 3 — Informações do Produto */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Produto</CardTitle>
          <CardDescription>Características comerciais e de apresentação.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="volume">Volume</Label>
              <Input id="volume" name="volume" defaultValue={produto?.volume ?? ''} placeholder="10 ml, 60 mg, 1 frasco..." />
            </div>
            <div className="space-y-1">
              <Label htmlFor="apresentacao">Apresentação</Label>
              <Input id="apresentacao" name="apresentacao" defaultValue={produto?.apresentacao ?? ''} placeholder="ex: frasco-ampola" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="via_administracao">Via de Administração</Label>
              <Input id="via_administracao" name="via_administracao" defaultValue={produto?.via_administracao ?? ''} placeholder="ex: intramuscular" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="via_apresentacao">Via de Apresentação</Label>
              <Input id="via_apresentacao" name="via_apresentacao" defaultValue={produto?.via_apresentacao ?? ''} placeholder="ex: subcutânea" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="quantidade_por_caixa">Quantidade por Caixa</Label>
              <Input id="quantidade_por_caixa" name="quantidade_por_caixa" type="number" min="0" step="1" defaultValue={produto?.quantidade_por_caixa ?? ''} placeholder="ex: 10" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="valor_caixa">Valor da Caixa (R$)</Label>
              <Input id="valor_caixa" name="valor_caixa" type="number" step="0.01" min="0" defaultValue={produto?.valor_caixa ?? ''} placeholder="ex: 250.00" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="preco_unitario">Valor Unitário (R$) *</Label>
              <Input id="preco_unitario" name="preco_unitario" type="number" step="0.01" min="0" defaultValue={produto?.preco_unitario ?? ''} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="aplicadores">Aplicadores</Label>
              <Input id="aplicadores" name="aplicadores" defaultValue={produto?.aplicadores ?? ''} placeholder="número, texto ou descrição" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="unidade">Unidade</Label>
              <Input id="unidade" name="unidade" defaultValue={produto?.unidade ?? 'un'} placeholder="un, cx..." />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD 4 — Receita */}
      <Card>
        <CardHeader>
          <CardTitle>Receita</CardTitle>
          <CardDescription>Informações de prescrição, quando aplicável.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              name="exige_receita"
              defaultChecked={!!produto?.exige_receita}
              className="rounded border-slate-300"
            />
            Exige Receita
          </label>
          <div className="space-y-1">
            <Label htmlFor="observacoes_receita">Observações da Receita</Label>
            <Textarea id="observacoes_receita" name="observacoes_receita" defaultValue={produto?.observacoes_receita ?? ''} rows={3} placeholder="Tipo de receita, tarja, restrições..." />
          </div>
        </CardContent>
      </Card>

      {/* CARD 5 — Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>Disponibilidade do produto no sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-700">Produto Ativo</p>
              <p className="text-xs text-slate-500">
                {editando ? 'Produtos inativos não aparecem para seleção em orçamentos.' : 'Novos produtos são criados como ativos.'}
              </p>
            </div>
            {editando ? (
              <Switch checked={ativo} onCheckedChange={handleToggleAtivo} disabled={isPending} />
            ) : (
              <Switch checked disabled />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ações (rodapé) */}
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push(LISTA)} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Salvando...' : 'Salvar Produto'}
        </Button>
      </div>
    </form>
  )
}
