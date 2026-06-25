'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { importarProdutosComFornecedor } from '@/app/(dashboard)/configuracoes/fornecedores/actions'
import { Upload, FileSpreadsheet, Check, Layers } from 'lucide-react'

type Fornecedor = { id: string; nome: string }

type Props = {
  fornecedores: Fornecedor[]
}

type ProdutoImportado = {
  fornecedor: string
  nome: string
  descricao: string | null
  preco_unitario: number
  unidade: string
  categoria?: string
}

const MAPEAMENTO: Record<string, 'fornecedor' | 'nome' | 'descricao' | 'preco' | 'unidade'> = {
  'fornecedor': 'fornecedor',
  'supplier': 'fornecedor',
  'fabricante': 'fornecedor',
  'marca': 'fornecedor',
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

function detectarColuna(header: string): string | null {
  const normalizado = header.toLowerCase().trim()
  return MAPEAMENTO[normalizado] ?? null
}

async function parsearPlanilha(data: ArrayBuffer): Promise<{ headers: string[]; rows: string[][] }> {
  // xlsx (SheetJS) é pesado (~centenas de KB) e só é necessário ao importar
  // planilha — carregado sob demanda para não entrar no bundle inicial.
  const { read, utils } = await import('xlsx')
  const wb = read(data, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' })
  const headers = (raw[0] ?? []).map(String)
  const rows = raw.slice(1).map((r) => r.map(String))
  return { headers, rows }
}

async function parsearPlanilhaCompleta(data: ArrayBuffer): Promise<{ abas: { nome: string; headers: string[]; rows: string[][] }[] }> {
  const { read, utils } = await import('xlsx')
  const wb = read(data, { type: 'array' })
  const abas = wb.SheetNames.map((sheetName) => {
    const ws = wb.Sheets[sheetName]
    const raw = utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' })
    const headers = (raw[0] ?? []).map(String)
    const rows = raw.slice(1).map((r) => r.map(String))
    return { nome: sheetName, headers, rows }
  })
  return { abas }
}

function mapearProdutos(headers: string[], rows: string[][]): ProdutoImportado[] {
  const indices: Record<string, number> = {}
  headers.forEach((h, i) => {
    const campo = detectarColuna(h)
    if (campo && !(campo in indices)) {
      indices[campo] = i
    }
  })

  if (!('fornecedor' in indices) || !('nome' in indices)) return []

  return rows
    .map((row) => {
      const fornecedor = row[indices.fornecedor]?.trim()
      const nome = row[indices.nome]?.trim()
      if (!fornecedor || !nome) return null

      const precoStr = indices.preco !== undefined ? row[indices.preco]?.trim() : '0'
      const preco = parseFloat(precoStr.replace(/[^\d.,]/g, '').replace(',', '.')) || 0

      const descricao = indices.descricao !== undefined ? row[indices.descricao]?.trim() || null : null
      const unidade = indices.unidade !== undefined ? row[indices.unidade]?.trim() || 'un' : 'un'

      return { fornecedor, nome, descricao, preco_unitario: preco, unidade } as ProdutoImportado
    })
    .filter((p): p is ProdutoImportado => p !== null)
}

function mapearProdutosAba(headers: string[], rows: string[][], fornecedor: string, categoria: string): ProdutoImportado[] {
  const indices: Record<string, number> = {}
  headers.forEach((h, i) => {
    const campo = detectarColuna(h)
    if (campo && !(campo in indices)) {
      indices[campo] = i
    }
  })

  // Na importação por abas, o nome do produto pode estar em 'nome' ou 'fornecedor' não é necessário
  const nomeIdx = indices.nome ?? indices.fornecedor
  if (nomeIdx === undefined) {
    // Tenta usar a primeira coluna como nome
    if (headers.length === 0) return []
  }

  const usarPrimeiraColuna = nomeIdx === undefined

  return rows
    .map((row) => {
      const nome = usarPrimeiraColuna ? row[0]?.trim() : row[nomeIdx]?.trim()
      if (!nome) return null

      const precoStr = indices.preco !== undefined ? row[indices.preco]?.trim() : '0'
      const preco = parseFloat(precoStr.replace(/[^\d.,]/g, '').replace(',', '.')) || 0

      const descricao = indices.descricao !== undefined ? row[indices.descricao]?.trim() || null : null
      const unidade = indices.unidade !== undefined ? row[indices.unidade]?.trim() || 'un' : 'un'

      return { fornecedor, nome, descricao, preco_unitario: preco, unidade, categoria } as ProdutoImportado
    })
    .filter((p): p is ProdutoImportado => p !== null)
}

export function FormImportacaoProdutos({ fornecedores }: Props) {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [produtos, setProdutos] = useState<ProdutoImportado[]>([])
  const [totalLinhas, setTotalLinhas] = useState(0)
  const [modo, setModo] = useState<'simples' | 'abas'>('simples')
  const [abasInfo, setAbasInfo] = useState<{ nome: string; qtd: number }[]>([])
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState('')
  const [novoFornecedor, setNovoFornecedor] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setArquivo(file)
    const buffer = await file.arrayBuffer()

    if (modo === 'simples') {
      const { headers, rows } = await parsearPlanilha(buffer)
      const mapeados = mapearProdutos(headers, rows)
      setProdutos(mapeados)
      setTotalLinhas(rows.length)
      setAbasInfo([])
    } else {
      const fornecedorNome = getFornecedorNome()
      if (!fornecedorNome) {
        toast.error('Selecione ou informe um fornecedor antes de fazer upload.')
        setArquivo(null)
        return
      }

      const { abas } = await parsearPlanilhaCompleta(buffer)
      const todosProdutos: ProdutoImportado[] = []
      const infos: { nome: string; qtd: number }[] = []

      for (const aba of abas) {
        const produtosAba = mapearProdutosAba(aba.headers, aba.rows, fornecedorNome, aba.nome)
        if (produtosAba.length === 0) continue
        todosProdutos.push(...produtosAba)
        infos.push({ nome: aba.nome, qtd: produtosAba.length })
      }

      setProdutos(todosProdutos)
      setTotalLinhas(todosProdutos.length)
      setAbasInfo(infos)
    }
  }

  function getFornecedorNome(): string {
    if (fornecedorSelecionado === '__novo__') return novoFornecedor.trim()
    if (fornecedorSelecionado) {
      const f = fornecedores.find((f) => f.id === fornecedorSelecionado)
      return f?.nome ?? ''
    }
    return ''
  }

  function handleConfirmar() {
    if (produtos.length === 0) return

    startTransition(async () => {
      try {
        const resultado = await importarProdutosComFornecedor(produtos)
        toast.success(`${resultado.importados} produtos importados de ${resultado.fornecedoresCriados} fornecedor(es).`)
        router.push('/configuracoes/fornecedores')
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao importar.')
      }
    })
  }

  function resetUpload() {
    setArquivo(null)
    setProdutos([])
    setTotalLinhas(0)
    setAbasInfo([])
    setFornecedorSelecionado('')
    setNovoFornecedor('')
  }

  // Agrupar por fornecedor para preview
  const porFornecedor = produtos.reduce<Record<string, ProdutoImportado[]>>((acc, p) => {
    if (!acc[p.fornecedor]) acc[p.fornecedor] = []
    acc[p.fornecedor].push(p)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Seleção de modo */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={modo === 'simples' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setModo('simples'); resetUpload() }}
          className="gap-1.5"
        >
          <Upload className="h-3.5 w-3.5" /> Importação simples
        </Button>
        <Button
          type="button"
          variant={modo === 'abas' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setModo('abas'); resetUpload() }}
          className="gap-1.5"
        >
          <Layers className="h-3.5 w-3.5" /> Importar completo (abas = categorias)
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload do arquivo</CardTitle>
          {modo === 'abas' && (
            <p className="text-xs text-slate-500 mt-1">
              Cada aba da planilha será criada como uma categoria. Colunas: Produto, Preço, Unidade (opcional), Descrição (opcional).
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {modo === 'abas' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Fornecedor *</Label>
                <Select value={fornecedorSelecionado || '__none__'} onValueChange={(v) => { setFornecedorSelecionado(v === '__none__' ? '' : (v ?? '')); setProdutos([]); setArquivo(null); setAbasInfo([]) }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar fornecedor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" disabled>Selecionar...</SelectItem>
                    {fornecedores.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                    <SelectItem value="__novo__">+ Novo fornecedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {fornecedorSelecionado === '__novo__' && (
                <div className="space-y-1">
                  <Label>Nome do novo fornecedor *</Label>
                  <Input
                    value={novoFornecedor}
                    onChange={(e) => setNovoFornecedor(e.target.value)}
                    placeholder="Nome do fornecedor..."
                  />
                </div>
              )}
            </div>
          )}

          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-slate-200 p-8 hover:border-slate-400 transition-colors">
            {arquivo ? (
              <>
                <FileSpreadsheet className="h-10 w-10 text-green-500" />
                <span className="text-sm font-medium text-slate-700">{arquivo.name}</span>
                <span className="text-xs text-slate-400">
                  {totalLinhas} produtos · {Object.keys(porFornecedor).length} fornecedor(es)
                  {abasInfo.length > 0 && ` · ${abasInfo.length} categoria(s)`}
                </span>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-slate-300" />
                <span className="text-sm text-slate-500">Clique ou arraste um arquivo XLSX ou CSV</span>
                <span className="text-xs text-slate-400">
                  {modo === 'simples'
                    ? 'Colunas: Fornecedor, Produto, Preço, Unidade, Descrição'
                    : 'Cada aba = categoria. Colunas: Produto, Preço, Unidade, Descrição'}
                </span>
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
        </CardContent>
      </Card>

      {produtos.length > 0 && (
        <>
          {/* Preview por abas/categorias */}
          {modo === 'abas' && abasInfo.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Categorias detectadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {abasInfo.map((aba) => (
                    <div key={aba.nome} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <span className="text-sm font-medium text-slate-700">{aba.nome}</span>
                      <span className="text-xs text-slate-400">{aba.qtd} produtos</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview por fornecedor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview por fornecedor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(porFornecedor).slice(0, 5).map(([fornecedor, prods]) => (
                <div key={fornecedor}>
                  <h4 className="text-sm font-semibold text-slate-800 mb-1">{fornecedor} ({prods.length} produtos)</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-left text-slate-500">
                          <th className="pb-1 pr-3">Produto</th>
                          <th className="pb-1 pr-3">Preço</th>
                          <th className="pb-1 pr-3">Unidade</th>
                          {modo === 'abas' && <th className="pb-1">Categoria</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {prods.slice(0, 5).map((p, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-1 pr-3 text-slate-700">{p.nome}</td>
                            <td className="py-1 pr-3 text-slate-600">
                              {p.preco_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="py-1 pr-3 text-slate-500">{p.unidade}</td>
                            {modo === 'abas' && <td className="py-1 text-slate-400">{p.categoria}</td>}
                          </tr>
                        ))}
                        {prods.length > 5 && (
                          <tr><td colSpan={modo === 'abas' ? 4 : 3} className="py-1 text-slate-400">... e mais {prods.length - 5}</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {Object.keys(porFornecedor).length > 5 && (
                <p className="text-xs text-slate-400">... e mais {Object.keys(porFornecedor).length - 5} fornecedor(es)</p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleConfirmar} disabled={isPending} className="gap-1.5">
              <Check className="h-4 w-4" />
              {isPending ? 'Importando...' : `Importar ${produtos.length} produtos`}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
