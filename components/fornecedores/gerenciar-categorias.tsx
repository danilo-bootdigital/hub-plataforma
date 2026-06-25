'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { criarCategoria, excluirCategoria, importarProdutosParaCategoria } from '@/app/(dashboard)/configuracoes/fornecedores/actions'
import { editarProduto, excluirProduto, excluirProdutosEmLote } from '@/app/(dashboard)/configuracoes/produtos/actions'
import { Plus, Trash2, Upload, FileSpreadsheet, Check, FolderOpen, Pencil, X } from 'lucide-react'
import type { SupplierCategory, Product } from '@/types/database'

type Props = {
  fornecedorId: string
  categorias: SupplierCategory[]
  produtos: Product[]
}

type ProdutoImportado = {
  nome: string
  descricao: string | null
  preco_unitario: number
  unidade: string
}

const MAPEAMENTO: Record<string, 'nome' | 'descricao' | 'preco' | 'unidade'> = {
  'produto': 'nome',
  'nome': 'nome',
  'name': 'nome',
  'descricao': 'descricao',
  'descrição': 'descricao',
  'description': 'descricao',
  'preco': 'preco',
  'preço': 'preco',
  'preco_unitario': 'preco',
  'valor': 'preco',
  'price': 'preco',
  'unidade': 'unidade',
  'un': 'unidade',
  'unit': 'unidade',
}

async function parsearPlanilha(data: ArrayBuffer): Promise<{ headers: string[]; rows: string[][] }> {
  // xlsx (SheetJS) é pesado e só é necessário ao importar planilha —
  // carregado sob demanda para não entrar no bundle inicial.
  const { read, utils } = await import('xlsx')
  const wb = read(data, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' })
  const headers = (raw[0] ?? []).map(String)
  const rows = raw.slice(1).map((r) => r.map(String))
  return { headers, rows }
}

function mapearProdutos(headers: string[], rows: string[][]): ProdutoImportado[] {
  const indices: Record<string, number> = {}
  headers.forEach((h, i) => {
    const campo = MAPEAMENTO[h.toLowerCase().trim()]
    if (campo && !(campo in indices)) indices[campo] = i
  })

  if (!('nome' in indices)) return []

  return rows
    .map((row) => {
      const nome = row[indices.nome]?.trim()
      if (!nome) return null
      const precoStr = indices.preco !== undefined ? row[indices.preco]?.trim() : '0'
      const preco = parseFloat(precoStr.replace(/[^\d.,]/g, '').replace(',', '.')) || 0
      const descricao = indices.descricao !== undefined ? row[indices.descricao]?.trim() || null : null
      const unidade = indices.unidade !== undefined ? row[indices.unidade]?.trim() || 'un' : 'un'
      return { nome, descricao, preco_unitario: preco, unidade } as ProdutoImportado
    })
    .filter((p): p is ProdutoImportado => p !== null)
}

export function GerenciarCategorias({ fornecedorId, categorias, produtos }: Props) {
  const [novaCategoria, setNovaCategoria] = useState('')
  const [isPending, startTransition] = useTransition()
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [produtosImport, setProdutosImport] = useState<ProdutoImportado[]>([])
  const [categoriaImport, setCategoriaImport] = useState('')
  const router = useRouter()

  function handleCriarCategoria() {
    if (!novaCategoria.trim()) return
    startTransition(async () => {
      try {
        await criarCategoria(fornecedorId, novaCategoria.trim())
        toast.success('Categoria criada.')
        setNovaCategoria('')
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao criar.')
      }
    })
  }

  function handleExcluirCategoria(id: string) {
    startTransition(async () => {
      try {
        await excluirCategoria(id, fornecedorId)
        toast.success('Categoria excluída.')
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao excluir.')
      }
    })
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setArquivo(file)
    const buffer = await file.arrayBuffer()
    const { headers, rows } = await parsearPlanilha(buffer)
    const mapeados = mapearProdutos(headers, rows)
    setProdutosImport(mapeados)
  }

  function handleImportar() {
    if (!categoriaImport || produtosImport.length === 0) return
    startTransition(async () => {
      try {
        const resultado = await importarProdutosParaCategoria(fornecedorId, categoriaImport, produtosImport)
        toast.success(`${resultado.importados} produtos importados.`)
        setArquivo(null)
        setProdutosImport([])
        setCategoriaImport('')
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao importar.')
      }
    })
  }

  // Agrupar produtos por categoria
  const produtosPorCategoria = categorias.map((cat) => ({
    ...cat,
    produtos: produtos.filter((p) => p.category_id === cat.id),
  }))
  const semCategoria = produtos.filter((p) => !p.category_id)

  return (
    <div className="space-y-6">
      {/* Criar categoria */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Categorias</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nome da nova categoria..."
              value={novaCategoria}
              onChange={(e) => setNovaCategoria(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCriarCategoria()}
              className="max-w-xs"
            />
            <Button size="sm" onClick={handleCriarCategoria} disabled={isPending} className="gap-1">
              <Plus className="h-4 w-4" />
              Criar
            </Button>
          </div>

          {categorias.length === 0 && (
            <p className="text-sm text-slate-400">Nenhuma categoria criada.</p>
          )}

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {categorias.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">{cat.nome}</span>
                  <span className="text-xs text-slate-400">
                    ({produtos.filter((p) => p.category_id === cat.id).length})
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-red-400 hover:text-red-600"
                  onClick={() => handleExcluirCategoria(cat.id)}
                  disabled={isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Importar produtos para categoria */}
      {categorias.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Importar Produtos para Categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Categoria *</label>
                <Select value={categoriaImport || '__none__'} onValueChange={(v) => setCategoriaImport(v === '__none__' ? '' : (v ?? ''))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar categoria..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" disabled>Selecionar...</SelectItem>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Arquivo</label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 hover:bg-slate-50 transition-colors">
                  {arquivo ? (
                    <>
                      <FileSpreadsheet className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-slate-700 truncate">{arquivo.name}</span>
                      <span className="text-xs text-slate-400">({produtosImport.length} produtos)</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-500">Selecionar planilha...</span>
                    </>
                  )}
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleUpload} onClick={(e) => { (e.target as HTMLInputElement).value = '' }} className="hidden" />
                </label>
              </div>
            </div>

            {produtosImport.length > 0 && (
              <div className="overflow-x-auto rounded border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-slate-500">
                      <th className="px-3 py-2">Produto</th>
                      <th className="px-3 py-2">Preço</th>
                      <th className="px-3 py-2">Unidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produtosImport.slice(0, 5).map((p, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-1.5 text-slate-700">{p.nome}</td>
                        <td className="px-3 py-1.5 text-slate-600">
                          {p.preco_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="px-3 py-1.5 text-slate-500">{p.unidade}</td>
                      </tr>
                    ))}
                    {produtosImport.length > 5 && (
                      <tr><td colSpan={3} className="px-3 py-1.5 text-slate-400">... e mais {produtosImport.length - 5}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <Button
              onClick={handleImportar}
              disabled={isPending || !categoriaImport || produtosImport.length === 0}
              className="gap-1.5"
            >
              <Check className="h-4 w-4" />
              {isPending ? 'Importando...' : `Importar ${produtosImport.length} produtos`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Produtos por categoria */}
      {produtosPorCategoria.map((cat) => cat.produtos.length > 0 && (
        <Card key={cat.id}>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-slate-400" />
              {cat.nome}
              <span className="text-xs font-normal text-slate-400">({cat.produtos.length} produtos)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TabelaProdutosFornecedor produtos={cat.produtos} />
          </CardContent>
        </Card>
      ))}

      {semCategoria.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-500">Sem categoria ({semCategoria.length} produtos)</CardTitle>
          </CardHeader>
          <CardContent>
            <TabelaProdutosFornecedor produtos={semCategoria} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function TabelaProdutosFornecedor({ produtos }: { produtos: Product[] }) {
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editPreco, setEditPreco] = useState('')
  const [editUnidade, setEditUnidade] = useState('')
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function toggleSelecionado(id: string) {
    setSelecionados((prev) => {
      const novo = new Set(prev)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  function toggleTodos() {
    if (selecionados.size === produtos.length) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(produtos.map((p) => p.id)))
    }
  }

  function iniciarEdicao(p: Product) {
    setEditandoId(p.id)
    setEditNome(p.nome)
    setEditPreco(String(p.preco_unitario))
    setEditUnidade(p.unidade ?? 'un')
  }

  function cancelarEdicao() {
    setEditandoId(null)
  }

  function salvarEdicao(produtoId: string) {
    const produto = produtos.find((p) => p.id === produtoId)
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.set('nome', editNome)
        formData.set('preco_unitario', editPreco)
        formData.set('unidade', editUnidade)
        formData.set('descricao', produto?.descricao ?? '')
        formData.set('supplier_id', produto?.supplier_id ?? '')
        formData.set('category_id', produto?.category_id ?? '')
        formData.set('mg', produto?.composicao ?? '')
        formData.set('ml', produto?.apresentacao ?? '')
        await editarProduto(produtoId, formData)
        toast.success('Produto atualizado.')
        setEditandoId(null)
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao editar.')
      }
    })
  }

  function handleExcluir(produtoId: string, nome: string) {
    if (!window.confirm(`Excluir "${nome}"? Esta ação não pode ser desfeita.`)) return
    startTransition(async () => {
      try {
        await excluirProduto(produtoId)
        toast.success('Produto excluído.')
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao excluir.')
      }
    })
  }

  function handleExcluirSelecionados() {
    if (selecionados.size === 0) return
    if (!window.confirm(`Excluir ${selecionados.size} produto(s)? Esta ação não pode ser desfeita.`)) return
    startTransition(async () => {
      try {
        await excluirProdutosEmLote([...selecionados])
        toast.success(`${selecionados.size} produto(s) excluído(s).`)
        setSelecionados(new Set())
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao excluir.')
      }
    })
  }

  return (
    <div className="space-y-2">
      {selecionados.size > 0 && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1 text-red-600 border-red-200 hover:bg-red-50" onClick={handleExcluirSelecionados} disabled={isPending}>
            <Trash2 className="h-3.5 w-3.5" /> Excluir {selecionados.size} selecionado(s)
          </Button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="pb-1.5 pr-2 w-8">
                <input
                  type="checkbox"
                  checked={selecionados.size === produtos.length && produtos.length > 0}
                  onChange={toggleTodos}
                  className="rounded border-slate-300"
                />
              </th>
              <th className="pb-1.5 pr-3">Produto</th>
              <th className="pb-1.5 pr-3">Preço</th>
              <th className="pb-1.5 pr-3">Unidade</th>
              <th className="pb-1.5 w-20">Ações</th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="py-1.5 pr-2">
                  <input
                    type="checkbox"
                    checked={selecionados.has(p.id)}
                    onChange={() => toggleSelecionado(p.id)}
                    className="rounded border-slate-300"
                  />
                </td>
                {editandoId === p.id ? (
                  <>
                    <td className="py-1 pr-2">
                      <Input className="h-7 text-xs" value={editNome} onChange={(e) => setEditNome(e.target.value)} />
                    </td>
                    <td className="py-1 pr-2">
                      <Input className="h-7 text-xs w-24" type="number" step="0.01" value={editPreco} onChange={(e) => setEditPreco(e.target.value)} />
                    </td>
                    <td className="py-1 pr-2">
                      <Input className="h-7 text-xs w-16" value={editUnidade} onChange={(e) => setEditUnidade(e.target.value)} />
                    </td>
                    <td className="py-1">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600" onClick={() => salvarEdicao(p.id)} disabled={isPending}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400" onClick={cancelarEdicao}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-1.5 pr-3 text-slate-700">{p.nome}</td>
                    <td className="py-1.5 pr-3 text-slate-600">
                      {p.preco_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="py-1.5 pr-3 text-slate-500">{p.unidade}</td>
                    <td className="py-1.5">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-blue-600" onClick={() => iniciarEdicao(p)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-600" onClick={() => handleExcluir(p.id, p.nome)} disabled={isPending}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
