'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react'
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

type Coluna = { chave: string; label: string; ordenavel?: boolean; className?: string }
const COLUNAS: Coluna[] = [
  { chave: 'nome', label: 'Produto', ordenavel: true, className: 'min-w-[220px]' },
  { chave: 'categoria', label: 'Categoria', ordenavel: true, className: 'min-w-[160px]' },
  { chave: 'portfolio', label: 'Portfólio', ordenavel: true, className: 'min-w-[180px]' },
  { chave: 'apresentacao', label: 'Apresentação', ordenavel: true, className: 'min-w-[150px]' },
  { chave: 'via_administracao', label: 'Via de administração', ordenavel: true, className: 'min-w-[160px]' },
  { chave: 'volume', label: 'Volume', ordenavel: true, className: 'min-w-[90px]' },
  { chave: 'unidade', label: 'Unidade', ordenavel: true, className: 'min-w-[90px]' },
  { chave: 'preco', label: 'Preço', ordenavel: true, className: 'min-w-[110px]' },
  { chave: 'status', label: 'Status', ordenavel: true, className: 'min-w-[90px]' },
]

const val = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== ''
const rotulo = (k: string) => k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

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

  const montado = useRef(false)

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

  // Filtros/busca/ordenação voltam à primeira página.
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

  // Drawer: abrir/fechar + carregar detalhe.
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
    <div className="space-y-4">
      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={busca}
          onChange={(e) => mudarBusca(e.target.value)}
          placeholder="Pesquisar por nome, apresentação, princípio ativo, categoria..."
          className="h-11 pl-10 text-base"
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={categoriaId || '__all__'} onValueChange={(v: string | null) => mudarFiltro(setCategoriaId, v === '__all__' ? '' : (v ?? ''))}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas as categorias</SelectItem>
            {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={portfolioId || '__all__'} onValueChange={(v: string | null) => mudarFiltro(setPortfolioId, v === '__all__' ? '' : (v ?? ''))}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Portfólio" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os portfólios</SelectItem>
            {portfolios.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={status || '__all__'} onValueChange={(v: string | null) => { setStatus((v === '__all__' || !v) ? '' : (v as 'ativo' | 'inativo')); resetPagina() }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>

        {temFiltro && (
          <Button variant="ghost" size="sm" className="gap-1.5 text-slate-500" onClick={limparFiltros}>
            <X className="h-3.5 w-3.5" /> Limpar filtros
          </Button>
        )}
      </div>

      {/* Contagem */}
      <p className="text-sm text-slate-500">
        {carregando ? 'Carregando...' : `${total} produto${total === 1 ? '' : 's'} encontrado${total === 1 ? '' : 's'}`}
      </p>

      {/* Tabela (desktop) */}
      <div className="hidden overflow-x-auto rounded-lg border bg-white md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left">
              {COLUNAS.map((col) => (
                <th key={col.chave} className={`px-4 py-3 font-medium text-slate-600 ${col.className ?? ''}`}>
                  {col.ordenavel ? (
                    <button type="button" onClick={() => ordenarPor(col.chave)} className="inline-flex items-center gap-1 hover:text-slate-900">
                      {col.label}
                      {orderBy === col.chave
                        ? (orderDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)
                        : <ArrowUpDown className="h-3 w-3 text-slate-300" />}
                    </button>
                  ) : col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !carregando && (
              <tr><td colSpan={COLUNAS.length} className="px-4 py-10 text-center text-slate-400">Nenhum produto encontrado.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.vinculo_id} onClick={() => abrirDrawer(r.vinculo_id)} className="cursor-pointer border-b last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{r.nome}</td>
                <td className="px-4 py-3 text-slate-600">{r.categoria ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{r.portfolio}</td>
                <td className="px-4 py-3 text-slate-600">{r.apresentacao ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{r.via_administracao ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{r.volume ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{r.unidade ?? '—'}</td>
                <td className="px-4 py-3 text-slate-700">{r.preco != null ? formatarMoeda(r.preco) : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {r.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lista (mobile) */}
      <div className="space-y-2 md:hidden">
        {rows.length === 0 && !carregando && (
          <div className="rounded-lg border bg-white px-4 py-10 text-center text-slate-400">Nenhum produto encontrado.</div>
        )}
        {rows.map((r) => (
          <button key={r.vinculo_id} type="button" onClick={() => abrirDrawer(r.vinculo_id)} className="w-full rounded-lg border bg-white p-4 text-left">
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-slate-900">{r.nome}</span>
              <span className="shrink-0 text-slate-700">{r.preco != null ? formatarMoeda(r.preco) : '—'}</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {[r.portfolio, r.categoria, r.apresentacao].filter(Boolean).join(' · ')}
            </div>
          </button>
        ))}
      </div>

      {/* Paginação */}
      {total > pagina && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Página {paginaAtual} de {totalPaginas}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1" disabled={offset === 0 || carregando} onClick={() => setOffset(Math.max(0, offset - pagina))}>
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button variant="outline" size="sm" className="gap-1" disabled={paginaAtual >= totalPaginas || carregando} onClick={() => setOffset(offset + pagina)}>
              Próxima <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

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
