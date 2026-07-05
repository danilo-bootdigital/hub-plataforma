'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ArrowUpDown, Columns3, Download, Check } from 'lucide-react'
import { formatarMoeda } from '@/lib/utils'
import {
  listarProdutosHub, detalheProdutoHub,
  type LinhaProdutoHub,
} from '@/app/(dashboard)/hub/produtos/actions'

type Opcao = { id: string; nome: string }
type Props = {
  pagina: number
  inicial: { total: number; rows: LinhaProdutoHub[] }
  portfolios: Opcao[]
  categorias: Opcao[]
}

type Coluna = { chave: string; label: string; ordenavel?: boolean; fixa?: boolean; className?: string; alinhar?: 'right' }
// A ordem aqui define a ordem visual das colunas (Produto e Ações são fixas).
const COLUNAS: Coluna[] = [
  { chave: 'nome', label: 'Produto', ordenavel: true, fixa: true, className: 'min-w-[260px]' },
  { chave: 'categoria', label: 'Categoria', ordenavel: true, className: 'min-w-[140px]' },
  { chave: 'portfolio', label: 'Portfólio', ordenavel: true, className: 'w-[200px] max-w-[220px]' },
  { chave: 'apresentacao', label: 'Apresentação', ordenavel: true, className: 'min-w-[130px]' },
  { chave: 'via_administracao', label: 'Via', ordenavel: true, className: 'min-w-[90px]' },
  { chave: 'volume', label: 'Volume', ordenavel: true, className: 'min-w-[80px]' },
  { chave: 'unidade', label: 'Unid.', ordenavel: true, className: 'min-w-[70px]' },
  { chave: 'preco', label: 'Preço', ordenavel: true, className: 'min-w-[100px]', alinhar: 'right' },
  { chave: 'status', label: 'Status', ordenavel: true, className: 'min-w-[90px]' },
]
const COL_STORAGE = 'hub.produtos.colunas.v1'

const val = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== ''
const rotulo = (k: string) => k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
const iniciais = (nome: string) => (nome || '?').replace(/[^\p{L}\p{N} ]/gu, '').trim().slice(0, 2).toUpperCase() || '?'

export function ProdutosConsulta({ pagina, inicial, portfolios, categorias }: Props) {
  const [busca, setBusca] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [portfolioId, setPortfolioId] = useState('')
  const [status, setStatus] = useState<'' | 'ativo' | 'inativo'>('')
  const [orderBy, setOrderBy] = useState('nome')
  const [orderDir, setOrderDir] = useState<'asc' | 'desc'>('asc')
  const [offset, setOffset] = useState(0)

  const [rows, setRows] = useState<LinhaProdutoHub[]>(inicial.rows)
  const [total, setTotal] = useState(inicial.total)
  const [carregando, setCarregando] = useState(false)

  const [drawerId, setDrawerId] = useState<string | null>(null)
  const [detalhe, setDetalhe] = useState<Record<string, unknown> | null>(null)
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false)

  // Colunas visíveis (persistência por usuário via localStorage).
  const [colunas, setColunas] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(COLUNAS.map((c) => [c.chave, true]))
  )
  const [menuColunas, setMenuColunas] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const montado = useRef(false)

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(COL_STORAGE)
      if (salvo) {
        const parsed = JSON.parse(salvo) as Record<string, boolean>
        // Sincroniza a preferência persistida (sistema externo) uma única vez no mount.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setColunas((prev) => ({ ...prev, ...parsed, nome: true }))
      }
    } catch { /* ignora */ }
  }, [])
  function alternarColuna(chave: string) {
    setColunas((prev) => {
      const next = { ...prev, [chave]: !prev[chave] }
      try { localStorage.setItem(COL_STORAGE, JSON.stringify(next)) } catch { /* ignora */ }
      return next
    })
  }
  useEffect(() => {
    function fora(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuColunas(false) }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [])

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const r = await listarProdutosHub({
        busca, categoriaId: categoriaId || null, portfolioId: portfolioId || null,
        status: status || null, orderBy, orderDir, limit: pagina, offset,
      })
      setRows(r.rows); setTotal(r.total)
    } catch {
      setRows([]); setTotal(0)
    } finally {
      setCarregando(false)
    }
  }, [busca, categoriaId, portfolioId, status, orderBy, orderDir, offset, pagina])

  // Server-side com debounce (evita disparo na montagem: já temos a carga inicial).
  useEffect(() => {
    if (!montado.current) { montado.current = true; return }
    const t = setTimeout(carregar, 300)
    return () => clearTimeout(t)
  }, [carregar])

  function resetPagina() { setOffset(0) }
  function mudarBusca(v: string) { setBusca(v); resetPagina() }
  function mudarFiltro(setter: (v: string) => void, v: string) { setter(v); resetPagina() }
  function ordenarPor(chave: string) {
    if (orderBy === chave) setOrderDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setOrderBy(chave); setOrderDir('asc') }
    resetPagina()
  }
  function limparFiltros() {
    setBusca(''); setCategoriaId(''); setPortfolioId(''); setStatus(''); resetPagina()
  }

  const temFiltro = !!(busca || categoriaId || portfolioId || status)
  const paginaAtual = Math.floor(offset / pagina) + 1
  const totalPaginas = Math.max(1, Math.ceil(total / pagina))
  const colunasAtivas = COLUNAS.filter((c) => colunas[c.chave])

  // Exporta a PÁGINA atual (respeita a paginação; não altera consultas).
  function exportarCsv() {
    const cols = colunasAtivas
    const cabec = cols.map((c) => c.label)
    const linhas = rows.map((r) => cols.map((c) => textoCelula(r, c.chave)))
    const csv = [cabec, ...linhas]
      .map((l) => l.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `produtos-pagina-${paginaAtual}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function abrirDrawer(vinculoId: string) {
    setDrawerId(vinculoId); setDetalhe(null); setCarregandoDetalhe(true)
    try { setDetalhe(await detalheProdutoHub(vinculoId)) }
    catch { setDetalhe({ erro: 'Não foi possível carregar o detalhe.' }) }
    finally { setCarregandoDetalhe(false) }
  }
  const fecharDrawer = useCallback(() => { setDrawerId(null); setDetalhe(null) }, [])

  useEffect(() => {
    if (!drawerId) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') fecharDrawer() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerId, fecharDrawer])

  return (
    <div className="flex h-full flex-col bg-slate-50/60">
      {/* Cabeçalho compacto: título + busca + colunas + exportar na mesma linha */}
      <div className="flex flex-wrap items-center gap-3 px-6 pt-4 pb-3">
        <div className="mr-1 shrink-0">
          <h1 className="text-lg font-semibold leading-tight text-slate-900">Produtos</h1>
          <p className="text-xs text-slate-500">Consulte os produtos dos Portfólios autorizados.</p>
        </div>

        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={busca}
            onChange={(e) => mudarBusca(e.target.value)}
            placeholder="Pesquisar por nome, apresentação, princípio ativo, categoria…"
            className="h-9 pl-9 text-sm"
          />
        </div>

        {/* Colunas */}
        <div className="relative" ref={menuRef}>
          <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setMenuColunas((v) => !v)}>
            <Columns3 className="h-4 w-4" /> Colunas
          </Button>
          {menuColunas && (
            <div className="absolute right-0 top-10 z-30 w-56 overflow-hidden rounded-lg border bg-white shadow-lg">
              <p className="border-b px-3 py-2 text-xs font-medium text-slate-500">Exibir colunas</p>
              <ul className="max-h-72 overflow-y-auto py-1">
                {COLUNAS.map((c) => (
                  <li key={c.chave}>
                    <button
                      type="button"
                      disabled={c.fixa}
                      onClick={() => alternarColuna(c.chave)}
                      className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm ${c.fixa ? 'cursor-default text-slate-400' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      {c.label}
                      {colunas[c.chave] && <Check className="h-4 w-4 text-emerald-600" />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={exportarCsv} disabled={rows.length === 0}>
          <Download className="h-4 w-4" /> Exportar
        </Button>
      </div>

      {/* Barra de filtros horizontal única */}
      <div className="flex flex-wrap items-center gap-2 px-6 pb-2">
        <Select value={categoriaId || '__all__'} onValueChange={(v: string | null) => mudarFiltro(setCategoriaId, v === '__all__' ? '' : (v ?? ''))}>
          <SelectTrigger className="h-8 w-44 text-sm"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas as categorias</SelectItem>
            {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={portfolioId || '__all__'} onValueChange={(v: string | null) => mudarFiltro(setPortfolioId, v === '__all__' ? '' : (v ?? ''))}>
          <SelectTrigger className="h-8 w-44 text-sm"><SelectValue placeholder="Portfólio" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os portfólios</SelectItem>
            {portfolios.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={status || '__all__'} onValueChange={(v: string | null) => { setStatus((v === '__all__' || !v) ? '' : (v as 'ativo' | 'inativo')); resetPagina() }}>
          <SelectTrigger className="h-8 w-36 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>

        {temFiltro && (
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-slate-500" onClick={limparFiltros}>
            <X className="h-3.5 w-3.5" /> Limpar
          </Button>
        )}

        {/* Resumo compacto em badges */}
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Badge>{carregando ? '…' : total} {total === 1 ? 'produto' : 'produtos'}</Badge>
          <Badge>{portfolios.length} portfólios</Badge>
          <Badge>{categorias.length} categorias</Badge>
        </div>
      </div>

      {/* Área rolável: SÓ a tabela rola; cabeçalho/filtros ficam fixos */}
      <div className="min-h-0 flex-1 px-6 pb-4">
        <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-white">
          {/* Tabela desktop */}
          <div className="hidden h-full overflow-auto md:block">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="text-left">
                  {colunasAtivas.map((col) => (
                    <th
                      key={col.chave}
                      className={`sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 font-medium text-slate-500 ${col.alinhar === 'right' ? 'text-right' : ''} ${col.className ?? ''}`}
                    >
                      {col.ordenavel ? (
                        <button type="button" onClick={() => ordenarPor(col.chave)} className={`inline-flex items-center gap-1 hover:text-slate-900 ${col.alinhar === 'right' ? 'flex-row-reverse' : ''}`}>
                          {col.label}
                          {orderBy === col.chave
                            ? (orderDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)
                            : <ArrowUpDown className="h-3 w-3 text-slate-300" />}
                        </button>
                      ) : col.label}
                    </th>
                  ))}
                  {/* Ações — coluna sticky à direita */}
                  <th className="sticky right-0 top-0 z-20 border-b border-l border-slate-200 bg-slate-50 px-3 py-2 text-right font-medium text-slate-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !carregando && (
                  <tr><td colSpan={colunasAtivas.length + 1} className="px-4 py-16 text-center text-slate-400">Nenhum produto encontrado.</td></tr>
                )}
                {rows.map((r) => (
                  <tr key={r.vinculo_id} onClick={() => abrirDrawer(r.vinculo_id)} className="group cursor-pointer border-b border-slate-100 last:border-0 hover:bg-emerald-50/40">
                    {colunasAtivas.map((col) => (
                      <td key={col.chave} className={`px-3 py-2 align-middle ${col.alinhar === 'right' ? 'text-right tabular-nums' : ''} ${col.className ?? ''}`}>
                        {renderCell(r, col.chave)}
                      </td>
                    ))}
                    <td className="sticky right-0 z-10 border-l border-slate-100 bg-white px-3 py-2 text-right group-hover:bg-emerald-50/40">
                      <span className="inline-flex items-center rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 group-hover:border-emerald-300 group-hover:text-emerald-700">
                        Detalhes
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Lista mobile */}
          <div className="h-full space-y-2 overflow-auto p-2 md:hidden">
            {rows.length === 0 && !carregando && (
              <div className="px-4 py-16 text-center text-slate-400">Nenhum produto encontrado.</div>
            )}
            {rows.map((r) => (
              <button key={r.vinculo_id} type="button" onClick={() => abrirDrawer(r.vinculo_id)} className="w-full rounded-lg border p-3 text-left">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-slate-900">{r.nome}</span>
                  <span className="shrink-0 tabular-nums text-slate-700">{r.preco != null ? formatarMoeda(r.preco) : '—'}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {[r.portfolio, r.categoria, r.apresentacao].filter(Boolean).join(' · ')}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Paginação (fixa no rodapé) */}
      <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-2.5 text-sm">
        <span className="text-slate-500">
          {carregando ? 'Carregando…' : `${total} ${total === 1 ? 'produto' : 'produtos'}`} · Página {paginaAtual} de {totalPaginas}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1" disabled={offset === 0 || carregando} onClick={() => setOffset(Math.max(0, offset - pagina))}>
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1" disabled={paginaAtual >= totalPaginas || carregando} onClick={() => setOffset(offset + pagina)}>
            Próxima <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Drawer */}
      {drawerId && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/30" onClick={fecharDrawer} />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-[500px] flex-col border-l bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">Detalhes do produto</h2>
              <button type="button" onClick={fecharDrawer} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {carregandoDetalhe && <p className="text-sm text-slate-400">Carregando...</p>}
              {detalhe && <DrawerConteudo d={detalhe} />}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600 tabular-nums">
      {children}
    </span>
  )
}

// Texto puro de uma célula (usado no CSV).
function textoCelula(r: LinhaProdutoHub, chave: string): string {
  switch (chave) {
    case 'nome': return r.nome
    case 'categoria': return r.categoria ?? ''
    case 'portfolio': return r.portfolio
    case 'apresentacao': return r.apresentacao ?? ''
    case 'via_administracao': return r.via_administracao ?? ''
    case 'volume': return r.volume ?? ''
    case 'unidade': return r.unidade ?? ''
    case 'preco': return r.preco != null ? formatarMoeda(r.preco) : ''
    case 'status': return r.ativo ? 'Ativo' : 'Inativo'
    default: return ''
  }
}

// Renderização visual de uma célula da tabela.
function renderCell(r: LinhaProdutoHub, chave: string) {
  switch (chave) {
    case 'nome':
      return (
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-semibold text-slate-500">
            {iniciais(r.nome)}
          </span>
          <span className="font-medium text-slate-900">{r.nome}</span>
        </div>
      )
    case 'categoria': return <span className="text-slate-600">{r.categoria ?? '—'}</span>
    case 'portfolio': return <span className="block whitespace-normal break-words text-slate-600">{r.portfolio}</span>
    case 'apresentacao': return <span className="text-slate-600">{r.apresentacao ?? '—'}</span>
    case 'via_administracao': return <span className="text-slate-600">{r.via_administracao ?? '—'}</span>
    case 'volume': return <span className="text-slate-600">{r.volume ?? '—'}</span>
    case 'unidade': return <span className="text-slate-600">{r.unidade ?? '—'}</span>
    case 'preco': return <span className="font-medium text-slate-800">{r.preco != null ? formatarMoeda(r.preco) : '—'}</span>
    case 'status':
      return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${r.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {r.ativo ? 'Ativo' : 'Inativo'}
        </span>
      )
    default: return null
  }
}

// ── Conteúdo do drawer: seções dinâmicas, só campos preenchidos ───────────
function Campo({ label, valor }: { label: string; valor: unknown }) {
  if (!val(valor)) return null
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="text-right text-slate-800">{String(valor)}</span>
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const arr = Array.isArray(children) ? children.flat() : [children]
  const temConteudo = arr.some((c) => c !== null && c !== false && c !== undefined)
  if (!temConteudo) return null
  return (
    <section className="border-b py-4 last:border-0">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{titulo}</h3>
      <div className="divide-y divide-slate-50">{children}</div>
    </section>
  )
}

function MetaCampos({ meta }: { meta: unknown }) {
  if (!meta || typeof meta !== 'object') return null
  const entries = Object.entries(meta as Record<string, unknown>).filter(([, v]) => val(v))
  if (entries.length === 0) return null
  return <>{entries.map(([k, v]) => (
    <Campo key={k} label={rotulo(k)} valor={typeof v === 'object' ? JSON.stringify(v) : v} />
  ))}</>
}

function moeda(v: unknown) { return val(v) ? formatarMoeda(Number(v)) : null }

function DrawerConteudo({ d }: { d: Record<string, unknown> }) {
  if (d.erro) return <p className="text-sm text-red-600">{String(d.erro)}</p>
  return (
    <div>
      <div className="pb-2">
        <div className="text-lg font-semibold text-slate-900">{String(d.nome ?? '')}</div>
        {val(d.portfolio) && <div className="text-sm text-slate-500">{String(d.portfolio)}</div>}
      </div>

      <Secao titulo="Informações gerais">
        <Campo label="Produto" valor={d.nome} />
        <Campo label="Categoria" valor={d.categoria} />
        <Campo label="Subcategoria" valor={d.subcategoria} />
        <Campo label="Portfólio" valor={d.portfolio} />
        <Campo label="Apresentação" valor={d.apresentacao} />
        <Campo label="Via de administração" valor={d.via_administracao} />
        <Campo label="Via de apresentação" valor={d.via_apresentacao} />
        <Campo label="Volume" valor={d.volume} />
        <Campo label="Quantidade por caixa" valor={d.quantidade_por_caixa} />
        <Campo label="Aplicadores" valor={d.aplicadores} />
        <Campo label="Unidade" valor={d.unidade} />
        <Campo label="Descrição" valor={d.descricao} />
      </Secao>

      <Secao titulo="Composição">
        <Campo label="Composição" valor={d.composicao} />
      </Secao>

      <Secao titulo="Informações comerciais">
        <Campo label="Preço" valor={moeda(d.preco)} />
        <Campo label="Valor da caixa" valor={moeda(d.valor_caixa)} />
      </Secao>

      <Secao titulo="Receita">
        <Campo label="Exige receita" valor={d.exige_receita === true ? 'Sim' : null} />
        <Campo label="Observações da receita" valor={d.observacoes_receita} />
      </Secao>

      <Secao titulo="Informações técnicas / Outros dados">
        <MetaCampos meta={d.produto_metadata} />
        <MetaCampos meta={d.oferta_metadata} />
      </Secao>
    </div>
  )
}
