'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, FileSpreadsheet, Check, Download, AlertTriangle, XCircle } from 'lucide-react'
import {
  previewImportacaoPortfolio,
  importarProdutosParaPortfolio,
  criarCategoria,
  criarSubcategoria,
  type LinhaImportacaoPortfolio,
  type ModoImportacao,
} from '@/app/(dashboard)/configuracoes/portfolios/actions'
import type { CategoriaComSubs } from '@/components/portfolios/gerenciar-categorias'

type Props = {
  portfolioId: string
  portfolioNome: string
  categorias: CategoriaComSubs[]
}

type Pendencia =
  | { tipo: 'categoria'; nome: string }
  | { tipo: 'subcategoria'; categoria: string; nome: string }

type Item = { linha: number; nome: string; status: string }

type Resultado = {
  aplicado: boolean
  dry_run: boolean
  modo: ModoImportacao
  bloqueado: boolean
  total: number
  criados: number
  vinculados: number
  atualizados: number
  ignorados: number
  erros: { linha: number; motivo: string }[]
  pendencias: Pendencia[]
  itens: Item[]
}

// Colunas oficiais (DEC-013/014) — sem Fornecedor.
const COLUNAS: { campo: keyof LinhaImportacaoPortfolio; chaves: string[] }[] = [
  { campo: 'nome', chaves: ['produto', 'nome', 'name'] },
  { campo: 'preco', chaves: ['preco', 'preco_unitario', 'valor', 'valor_unitario', 'price'] },
  { campo: 'descricao', chaves: ['descricao', 'description'] },
  { campo: 'categoria', chaves: ['categoria', 'category'] },
  { campo: 'subcategoria', chaves: ['subcategoria', 'subcategory'] },
  { campo: 'valor_caixa', chaves: ['valor_caixa', 'valor_da_caixa', 'valor_caixa_rs'] },
  { campo: 'unidade', chaves: ['unidade', 'un', 'unit'] },
  { campo: 'volume', chaves: ['volume'] },
  { campo: 'quantidade_por_caixa', chaves: ['quantidade_por_caixa', 'qtd_por_caixa', 'qtd_caixa', 'quantidade'] },
  { campo: 'apresentacao', chaves: ['apresentacao'] },
  { campo: 'via_administracao', chaves: ['via_administracao', 'via_de_administracao'] },
  { campo: 'via_apresentacao', chaves: ['via_apresentacao', 'via_de_apresentacao'] },
  { campo: 'aplicadores', chaves: ['aplicadores'] },
  { campo: 'exige_receita', chaves: ['exige_receita', 'receita'] },
  { campo: 'observacoes_receita', chaves: ['observacoes_receita', 'observacoes_da_receita', 'obs_receita'] },
]

function normalizarChave(h: string): string {
  return h.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, '_')
}

function normalizarNumero(v: string): string {
  const limpo = v.replace(/[^\d.,-]/g, '')
  if (!limpo) return ''
  if (limpo.includes('.') && limpo.includes(',')) return limpo.replace(/\./g, '').replace(',', '.') // 1.234,56
  if (limpo.includes(',')) return limpo.replace(',', '.')
  return limpo
}

function normalizarReceita(v: string): string {
  const s = v.toLowerCase().trim()
  return ['sim', 's', 'true', '1', 'x', 'verdadeiro'].includes(s) ? 'true' : ''
}

const STATUS_BADGE: Record<string, string> = {
  novo: 'bg-emerald-100 text-emerald-700',
  vincular: 'bg-blue-100 text-blue-700',
  atualizar: 'bg-amber-100 text-amber-700',
  ignorado: 'bg-slate-100 text-slate-500',
  erro: 'bg-red-100 text-red-700',
}

export function FormImportacaoPortfolio({ portfolioId, portfolioNome, categorias }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [linhas, setLinhas] = useState<LinhaImportacaoPortfolio[]>([])
  const [modo, setModo] = useState<ModoImportacao>('atualizar')
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [mapaCategorias, setMapaCategorias] = useState<Record<string, string>>({})
  const [mapaSubcategorias, setMapaSubcategorias] = useState<Record<string, string>>({})

  const todasSubs = categorias.flatMap((c) => c.subcategorias.map((s) => ({ ...s, catNome: c.nome })))

  const rodarPreview = useCallback(
    (
      ls: LinhaImportacaoPortfolio[],
      m: ModoImportacao,
      mapaC: Record<string, string>,
      mapaS: Record<string, string>
    ) => {
      if (ls.length === 0) return
      startTransition(async () => {
        try {
          const r = (await previewImportacaoPortfolio(portfolioId, ls, m, mapaC, mapaS)) as Resultado
          setResultado(r)
        } catch (e: unknown) {
          toast.error(e instanceof Error ? e.message : 'Erro ao gerar preview.')
        }
      })
    },
    [portfolioId]
  )

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setArquivo(file)
    setMapaCategorias({})
    setMapaSubcategorias({})

    const { read, utils } = await import('xlsx')
    const wb = read(await file.arrayBuffer(), { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const raw = utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' })
    const headers = (raw[0] ?? []).map((h) => normalizarChave(String(h)))

    const indices: Partial<Record<keyof LinhaImportacaoPortfolio, number>> = {}
    headers.forEach((h, i) => {
      for (const col of COLUNAS) {
        if (col.chaves.includes(h) && indices[col.campo] === undefined) indices[col.campo] = i
      }
    })

    const ls: LinhaImportacaoPortfolio[] = raw.slice(1)
      .filter((row) => row.some((c) => String(c).trim() !== ''))
      .map((row) => {
        const get = (campo: keyof LinhaImportacaoPortfolio) => {
          const idx = indices[campo]
          return idx === undefined ? '' : String(row[idx] ?? '').trim()
        }
        return {
          nome: get('nome'),
          preco: normalizarNumero(get('preco')),
          descricao: get('descricao'),
          categoria: get('categoria'),
          subcategoria: get('subcategoria'),
          valor_caixa: normalizarNumero(get('valor_caixa')),
          unidade: get('unidade'),
          volume: get('volume'),
          quantidade_por_caixa: get('quantidade_por_caixa').replace(/[^\d]/g, ''),
          apresentacao: get('apresentacao'),
          via_administracao: get('via_administracao'),
          via_apresentacao: get('via_apresentacao'),
          aplicadores: get('aplicadores'),
          exige_receita: normalizarReceita(get('exige_receita')),
          observacoes_receita: get('observacoes_receita'),
        }
      })

    setLinhas(ls)
    rodarPreview(ls, modo, {}, {})
  }

  function trocarModo(m: ModoImportacao) {
    setModo(m)
    rodarPreview(linhas, m, mapaCategorias, mapaSubcategorias)
  }

  function mapearCategoria(nome: string, categoriaId: string) {
    const mapaC = { ...mapaCategorias, [nome]: categoriaId }
    setMapaCategorias(mapaC)
    rodarPreview(linhas, modo, mapaC, mapaSubcategorias)
  }

  function mapearSubcategoria(categoria: string, nome: string, subId: string) {
    const mapaS = { ...mapaSubcategorias, [`${categoria}::${nome}`]: subId }
    setMapaSubcategorias(mapaS)
    rodarPreview(linhas, modo, mapaCategorias, mapaS)
  }

  function criarManual(pend: Pendencia) {
    startTransition(async () => {
      try {
        if (pend.tipo === 'categoria') {
          await criarCategoria(portfolioId, pend.nome)
        } else {
          const cat = categorias.find((c) => c.nome.trim().toLowerCase() === pend.categoria.trim().toLowerCase())
          if (!cat) { toast.error(`Crie a categoria "${pend.categoria}" antes da subcategoria.`); return }
          await criarSubcategoria(cat.id, portfolioId, pend.nome)
        }
        toast.success('Criado.')
        router.refresh()
        rodarPreview(linhas, modo, mapaCategorias, mapaSubcategorias)
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao criar.')
      }
    })
  }

  function handleConfirmar() {
    startTransition(async () => {
      try {
        const r = (await importarProdutosParaPortfolio(
          portfolioId, linhas, modo, mapaCategorias, mapaSubcategorias
        )) as Resultado
        toast.success(
          `Importação concluída: ${r.criados} novo(s), ${r.vinculados} vínculo(s), ${r.atualizados} atualizado(s), ${r.ignorados} ignorado(s).`
        )
        router.push(`/configuracoes/portfolios/${portfolioId}`)
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao importar.')
      }
    })
  }

  async function baixarModelo() {
    const { utils, writeFile } = await import('xlsx')
    const cabecalhos = [
      'nome', 'preco', 'descricao', 'categoria', 'subcategoria', 'valor_caixa', 'unidade',
      'volume', 'quantidade_por_caixa', 'apresentacao', 'via_administracao', 'via_apresentacao',
      'aplicadores', 'exige_receita', 'observacoes_receita',
    ]
    const exemplo = ['Produto Exemplo', '99,90', 'Descrição opcional', 'Categoria X', 'Subcategoria Y',
      '999,00', 'un', '10 ml', '10', 'frasco-ampola', 'intramuscular', 'subcutânea', '2', 'sim', 'Tarja vermelha']
    const ws = utils.aoa_to_sheet([cabecalhos, exemplo])
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Produtos')
    writeFile(wb, 'modelo-importacao-portfolio.xlsx')
  }

  const bloqueado = !resultado || resultado.bloqueado
  const temErros = (resultado?.erros.length ?? 0) > 0
  const temPendencias = (resultado?.pendencias.length ?? 0) > 0

  return (
    <div className="space-y-6">
      {/* Upload + opções */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Arquivo</CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              Colunas: <span className="font-medium">nome</span> e <span className="font-medium">preco</span> obrigatórias;
              demais opcionais. Categoria/Subcategoria precisam existir no portfólio.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={baixarModelo}>
            <Download className="h-3.5 w-3.5" /> Baixar modelo
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Vínculo já existente:</span>
            <Button type="button" size="sm" variant={modo === 'atualizar' ? 'default' : 'outline'} onClick={() => trocarModo('atualizar')}>
              Atualizar
            </Button>
            <Button type="button" size="sm" variant={modo === 'preservar' ? 'default' : 'outline'} onClick={() => trocarModo('preservar')}>
              Preservar
            </Button>
          </div>

          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-slate-200 p-8 hover:border-slate-400 transition-colors">
            {arquivo ? (
              <>
                <FileSpreadsheet className="h-10 w-10 text-green-500" />
                <span className="text-sm font-medium text-slate-700">{arquivo.name}</span>
                <span className="text-xs text-slate-400">{linhas.length} linha(s) lida(s)</span>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-slate-300" />
                <span className="text-sm text-slate-500">Clique ou arraste um arquivo XLSX ou CSV</span>
              </>
            )}
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleUpload}
              onClick={(e) => { (e.target as HTMLInputElement).value = '' }} className="hidden" />
          </label>
        </CardContent>
      </Card>

      {resultado && (
        <>
          {/* Resumo */}
          <Card>
            <CardHeader><CardTitle className="text-base">Resumo</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{resultado.total} linha(s)</span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">{resultado.criados} novo(s)</span>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">{resultado.vinculados} vínculo(s)</span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">{resultado.atualizados} atualizar</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-500">{resultado.ignorados} ignorar</span>
                {temErros && <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">{resultado.erros.length} erro(s)</span>}
                {temPendencias && <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-700">{resultado.pendencias.length} pendência(s)</span>}
              </div>
            </CardContent>
          </Card>

          {/* Pendências de classificação */}
          {temPendencias && (
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-orange-700">
                  <AlertTriangle className="h-4 w-4" /> Pendências de classificação
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Categorias/Subcategorias não são criadas automaticamente. Selecione uma existente ou crie manualmente. A importação fica bloqueada enquanto houver pendência.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {resultado.pendencias.map((p, i) => (
                  <div key={i} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-orange-50/40 px-3 py-2">
                    <span className="text-sm text-slate-700">
                      {p.tipo === 'categoria'
                        ? <>Categoria <strong>&ldquo;{p.nome}&rdquo;</strong> não existe.</>
                        : <>Subcategoria <strong>&ldquo;{p.nome}&rdquo;</strong> (em &ldquo;{p.categoria}&rdquo;) não existe.</>}
                    </span>
                    <div className="flex items-center gap-2">
                      {p.tipo === 'categoria' ? (
                        <Select onValueChange={(v: string | null) => { if (v) mapearCategoria(p.nome, v) }}>
                          <SelectTrigger className="h-8 w-44"><SelectValue placeholder="Usar existente..." /></SelectTrigger>
                          <SelectContent>
                            {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Select onValueChange={(v: string | null) => { if (v) mapearSubcategoria(p.categoria, p.nome, v) }}>
                          <SelectTrigger className="h-8 w-52"><SelectValue placeholder="Usar existente..." /></SelectTrigger>
                          <SelectContent>
                            {todasSubs.map((s) => <SelectItem key={s.id} value={s.id}>{s.catNome} › {s.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                      <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => criarManual(p)}>
                        Criar
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Erros */}
          {temErros && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-red-700">
                  <XCircle className="h-4 w-4" /> Erros (corrija a planilha e reenvie)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-left text-slate-500"><th className="pb-1 pr-3">Linha</th><th className="pb-1">Motivo</th></tr></thead>
                    <tbody>
                      {resultado.erros.map((e, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-1 pr-3 text-slate-600">{e.linha}</td>
                          <td className="py-1 text-red-700">{e.motivo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview dos itens */}
          {resultado.itens.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Itens</CardTitle></CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-left text-slate-500"><th className="pb-1 pr-3">Linha</th><th className="pb-1 pr-3">Produto</th><th className="pb-1">Situação</th></tr></thead>
                    <tbody>
                      {resultado.itens.map((it, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-1 pr-3 text-slate-500">{it.linha}</td>
                          <td className="py-1 pr-3 text-slate-700">{it.nome}</td>
                          <td className="py-1">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[it.status] ?? 'bg-slate-100 text-slate-500'}`}>
                              {it.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-end gap-3">
            {bloqueado && (
              <span className="text-xs text-slate-500">
                {temErros ? 'Corrija os erros' : temPendencias ? 'Resolva as pendências' : 'Envie uma planilha'} para liberar a importação.
              </span>
            )}
            <Button onClick={handleConfirmar} disabled={bloqueado || isPending} className="gap-1.5">
              <Check className="h-4 w-4" />
              {isPending ? 'Processando...' : 'Importar'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
