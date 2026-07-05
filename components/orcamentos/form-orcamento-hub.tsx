'use client'

import { useState, useMemo, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { formatarMoeda } from '@/lib/utils'
import { listarProdutosHub, type LinhaProdutoHub } from '@/app/(dashboard)/hub/produtos/actions'
import { criarOrcamentoHub, editarOrcamentoHub, type DadosOrcamentoHub } from '@/app/(dashboard)/orcamentos/actions-hub'
import { Search, Plus, Trash2, User, Check, Loader2 } from 'lucide-react'

export type ClienteOpc = {
  id: string
  nome: string
  telefone: string | null
  cpf_cnpj: string | null
  carteira_nome: string | null
  responsavel_nome: string | null
}

// Valores iniciais para o modo edição. Cada item carrega seu portfólio (DEC-013/017).
export type InicialOrcamentoHub = {
  contato_id: string | null
  itens: {
    product_id: string
    portfolio_id: string
    portfolio_nome: string | null
    nome: string
    apresentacao: string | null
    preco_unitario: number
    quantidade: number
    desconto_item: number
  }[]
  forma_pagamento: string
  prazo_entrega: string
  transportadora: string
  frete: string
  endereco_entrega: string
  observacoes: string
  observacoes_cliente: string
  desconto_geral: string
}

type ItemState = {
  product_id: string
  portfolio_id: string
  portfolio_nome: string | null
  nome: string
  apresentacao: string | null
  preco_unitario: number // do vínculo (product_portfolios) — apenas exibição; backend recalcula
  quantidade: number
  desconto_item: number
}

function normalizar(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// Ficha read-only com os campos que compõem o produto (do vínculo/portfólio).
function FichaProduto({ p }: { p: LinhaProdutoHub }) {
  const campos: [string, string | null][] = [
    ['Categoria', p.categoria],
    ['Subcategoria', p.subcategoria],
    ['Apresentação', p.apresentacao],
    ['Composição', p.composicao],
    ['Via de administração', p.via_administracao],
    ['Via de apresentação', p.via_apresentacao],
    ['Volume', p.volume],
    ['Unidade', p.unidade],
    ['Qtd por caixa', p.quantidade_por_caixa != null ? String(p.quantidade_por_caixa) : null],
    ['Aplicadores', p.aplicadores],
    ['Valor da caixa', p.valor_caixa != null ? formatarMoeda(p.valor_caixa) : null],
    ['Exige receita', p.exige_receita == null ? null : p.exige_receita ? 'Sim' : 'Não'],
    ['Descrição', p.descricao],
    ['Observações da receita', p.observacoes_receita],
  ]
  const preenchidos = campos.filter(([, v]) => v != null && String(v).trim() !== '')
  if (!preenchidos.length) return null
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3 lg:grid-cols-4">
      {preenchidos.map(([k, v]) => (
        <div key={k}>
          <p className="text-slate-400">{k}</p>
          <p className="text-slate-700">{v}</p>
        </div>
      ))}
    </div>
  )
}

// Casa o texto da busca com vários campos do produto (nome, apresentação, princípio
// ativo/composição, categoria, subcategoria, portfólio, via, volume, unidade).
function casa(p: LinhaProdutoHub, q: string) {
  const alvo = [
    p.nome, p.apresentacao, p.composicao, p.categoria, p.subcategoria,
    p.portfolio, p.via_administracao, p.via_apresentacao, p.volume, p.unidade,
  ].filter(Boolean).join(' ')
  return normalizar(alvo).includes(q)
}

export function FormOrcamentoHub({
  clientes,
  hubNome,
  orcamentoId,
  inicial,
  contatoInicial,
  dealId,
}: {
  clientes: ClienteOpc[]
  hubNome: string
  orcamentoId?: string
  inicial?: InicialOrcamentoHub
  contatoInicial?: string | null
  dealId?: string | null
}) {
  const router = useRouter()
  const [saving, startSaving] = useTransition()
  const editando = !!orcamentoId

  // Bloco 1 — Cliente
  const [buscaCli, setBuscaCli] = useState('')
  const [clienteId, setClienteId] = useState<string | null>(
    inicial?.contato_id ??
    (contatoInicial && clientes.some((c) => c.id === contatoInicial) ? contatoInicial : null)
  )
  const cliente = clientes.find((c) => c.id === clienteId) ?? null
  const clientesFiltrados = useMemo(() => {
    const q = normalizar(buscaCli.trim())
    if (!q) return clientes.slice(0, 30)
    return clientes
      .filter((c) => normalizar([c.nome, c.telefone, c.cpf_cnpj, c.carteira_nome].filter(Boolean).join(' ')).includes(q))
      .slice(0, 30)
  }, [buscaCli, clientes])

  // Catálogo autorizado do Hub (todos os portfólios) — carregado uma vez; busca client-side.
  const [catalogo, setCatalogo] = useState<LinhaProdutoHub[]>([])
  const [carregandoCat, setCarregandoCat] = useState(true)
  const [buscaProd, setBuscaProd] = useState('')

  useEffect(() => {
    // Carga única do catálogo autorizado (montagem). `carregandoCat` já inicia true.
    let vivo = true
    listarProdutosHub({ status: 'ativo', limit: 1000, orderBy: 'nome', orderDir: 'asc' })
      .then((r) => { if (vivo) setCatalogo(r.rows) })
      .catch(() => { if (vivo) setCatalogo([]) })
      .finally(() => { if (vivo) setCarregandoCat(false) })
    return () => { vivo = false }
  }, [])

  // Bloco 2 — Itens
  const [itens, setItens] = useState<ItemState[]>(
    inicial?.itens.map((i) => ({
      product_id: i.product_id,
      portfolio_id: i.portfolio_id,
      portfolio_nome: i.portfolio_nome,
      nome: i.nome,
      apresentacao: i.apresentacao,
      preco_unitario: i.preco_unitario,
      quantidade: i.quantidade,
      desconto_item: i.desconto_item,
    })) ?? []
  )

  const resultados = useMemo(() => {
    const q = normalizar(buscaProd.trim())
    const jaAdicionado = new Set(itens.map((i) => i.product_id))
    const base = catalogo.filter((p) => !jaAdicionado.has(p.product_id))
    if (!q) return base.slice(0, 25)
    return base.filter((p) => casa(p, q)).slice(0, 25)
  }, [buscaProd, catalogo, itens])

  // Bloco 4 — Dados comerciais
  const [formaPagamento, setFormaPagamento] = useState(inicial?.forma_pagamento ?? '')
  const [prazoEntrega, setPrazoEntrega] = useState(inicial?.prazo_entrega ?? '')
  const [transportadora, setTransportadora] = useState(inicial?.transportadora ?? '')
  const [frete, setFrete] = useState(inicial?.frete ?? '')
  const [enderecoEntrega, setEnderecoEntrega] = useState(inicial?.endereco_entrega ?? '')
  const [observacoes, setObservacoes] = useState(inicial?.observacoes ?? '')
  const [observacoesCliente, setObservacoesCliente] = useState(inicial?.observacoes_cliente ?? '')
  const [descontoGeral, setDescontoGeral] = useState(inicial?.desconto_geral ?? '')

  function adicionarItem(p: LinhaProdutoHub) {
    if (itens.some((i) => i.product_id === p.product_id)) {
      toast.info('Produto já adicionado. Ajuste a quantidade na lista.')
      return
    }
    setItens((prev) => [
      ...prev,
      {
        product_id: p.product_id,
        portfolio_id: p.portfolio_id,
        portfolio_nome: p.portfolio,
        nome: p.nome,
        apresentacao: p.apresentacao,
        preco_unitario: Number(p.preco ?? 0),
        quantidade: 1,
        desconto_item: 0,
      },
    ])
  }
  function atualizarItem(id: string, patch: Partial<ItemState>) {
    setItens((prev) => prev.map((i) => (i.product_id === id ? { ...i, ...patch } : i)))
  }
  function removerItem(id: string) {
    setItens((prev) => prev.filter((i) => i.product_id !== id))
  }

  // Bloco 5 — Resumo (cálculo espelha o backend; backend é a fonte de verdade)
  const descGeralNum = Math.min(100, Math.max(0, Number(descontoGeral.replace(',', '.')) || 0))
  const freteNum = Math.max(0, Number(frete.replace(',', '.')) || 0)
  const subtotalItens = itens.reduce((s, i) => s + i.quantidade * i.preco_unitario * (1 - i.desconto_item / 100), 0)
  const valorFinal = Math.max(0, subtotalItens * (1 - descGeralNum / 100) + freteNum)
  const portfoliosDistintos = [...new Set(itens.map((i) => i.portfolio_nome).filter(Boolean))]
  const resumoPortfolios = portfoliosDistintos.length === 0 ? '—' : portfoliosDistintos.length === 1 ? portfoliosDistintos[0]! : 'Múltiplos Portfólios'

  function montarDados(finalizar: boolean): DadosOrcamentoHub | null {
    if (!clienteId) { toast.error('Selecione o Cliente.'); return null }
    if (itens.length === 0) { toast.error('Adicione ao menos um produto.'); return null }
    return {
      contato_id: clienteId,
      deal_id: dealId ?? null,
      // Envia id/portfólio/quantidade/desconto — o backend recalcula o preço pelo vínculo.
      itens: itens.map((i) => ({
        product_id: i.product_id,
        portfolio_id: i.portfolio_id,
        quantidade: i.quantidade,
        desconto_item: i.desconto_item,
      })),
      forma_pagamento: formaPagamento || null,
      prazo_entrega: prazoEntrega || null,
      transportadora: transportadora || null,
      frete: freteNum,
      endereco_entrega: enderecoEntrega || null,
      observacoes: observacoes || null,
      observacoes_cliente: observacoesCliente || null,
      desconto_geral: descGeralNum,
      finalizar,
    }
  }

  function salvar(finalizar: boolean) {
    const dados = montarDados(finalizar)
    if (!dados) return
    startSaving(async () => {
      try {
        const id = editando ? await editarOrcamentoHub(orcamentoId!, dados) : await criarOrcamentoHub(dados)
        toast.success(editando ? (finalizar ? 'Orçamento atualizado e enviado.' : 'Alterações salvas.') : (finalizar ? 'Orçamento gerado.' : 'Rascunho salvo.'))
        router.push(`/orcamentos/${id}`)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao salvar o orçamento.')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        {/* Bloco 1 — Cliente */}
        <Card className="lg:col-span-4">
          <CardHeader><CardTitle>1. Cliente</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {cliente ? (
              <div className="flex items-start justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-slate-200 p-2 text-slate-600"><User className="size-4" /></div>
                  <div className="text-sm">
                    <p className="font-semibold text-slate-900">{cliente.nome}</p>
                    <p className="text-slate-500">{cliente.telefone ?? 'sem telefone'}</p>
                    <p className="text-slate-500">Carteira: <span className="text-slate-700">{cliente.carteira_nome ?? '—'}</span></p>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setClienteId(null); setBuscaCli('') }}>Trocar</Button>
              </div>
            ) : (
              <>
                <Label htmlFor="busca-cli">Buscar cliente (nome, telefone, CPF/CNPJ ou carteira)</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input id="busca-cli" className="pl-8" placeholder="Digite para buscar…" value={buscaCli} onChange={(e) => setBuscaCli(e.target.value)} autoComplete="off" />
                </div>
                <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                  {clientesFiltrados.length === 0 ? (
                    <p className="p-3 text-sm text-slate-500">Nenhum cliente encontrado no seu Hub.</p>
                  ) : clientesFiltrados.map((c) => (
                    <button key={c.id} type="button" onClick={() => setClienteId(c.id)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50">
                      <span><span className="font-medium text-slate-900">{c.nome}</span><span className="ml-2 text-slate-500">{c.telefone ?? ''}</span></span>
                      <span className="text-xs text-slate-400">{c.carteira_nome ?? ''}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Bloco 2 — Produtos (busca inteligente em toda a base autorizada do Hub) */}
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>2. Produtos</CardTitle>
            <p className="text-sm text-slate-500">Busque em todos os produtos autorizados ao seu Hub — o portfólio de cada item é preenchido automaticamente.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Busca */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Buscar por nome, apresentação, princípio ativo, categoria, portfólio, via, volume…"
                value={buscaProd}
                onChange={(e) => setBuscaProd(e.target.value)}
                autoComplete="off"
              />
            </div>

            {/* Resultados (autocomplete em tempo real) */}
            {carregandoCat ? (
              <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> Carregando catálogo do Hub…</p>
            ) : (
              <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                {resultados.length === 0 ? (
                  <p className="p-3 text-sm text-slate-500">{buscaProd.trim() ? 'Nenhum produto encontrado.' : 'Nenhum produto disponível.'}</p>
                ) : resultados.map((p) => (
                  <div key={`${p.product_id}::${p.portfolio_id}`} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{p.nome}</p>
                      <p className="truncate text-xs text-slate-500">
                        {[p.apresentacao, p.portfolio, p.via_administracao, p.volume, p.unidade].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <span className="shrink-0 tabular-nums text-slate-700">{p.preco != null ? formatarMoeda(p.preco) : '—'}</span>
                    <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1" onClick={() => adicionarItem(p)}>
                      <Plus className="size-4" /> Adicionar
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Itens adicionados */}
            {itens.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum produto adicionado ao orçamento.</p>
            ) : (
              <div className="space-y-3">
                {itens.map((i) => {
                  const p = catalogo.find((r) => r.product_id === i.product_id)
                  const sub = i.quantidade * i.preco_unitario * (1 - i.desconto_item / 100)
                  return (
                    <div key={i.product_id} className="space-y-3 rounded-lg border border-slate-200 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{p?.nome ?? i.nome}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                            {(p?.apresentacao ?? i.apresentacao) && <span>{p?.apresentacao ?? i.apresentacao}</span>}
                            {i.portfolio_nome && (
                              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">{i.portfolio_nome}</span>
                            )}
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removerItem(i.product_id)}><Trash2 className="size-4 text-slate-400" /></Button>
                      </div>
                      {p && <FichaProduto p={p} />}
                      <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-4">
                        <div className="space-y-1">
                          <Label className="text-xs">Quantidade</Label>
                          <Input type="number" min={1} step={1} value={i.quantidade} onChange={(e) => atualizarItem(i.product_id, { quantidade: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} className="h-8" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Unitário</Label>
                          <p className="flex h-8 items-center text-sm text-slate-600">{formatarMoeda(i.preco_unitario)}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Desconto %</Label>
                          <Input type="number" min={0} max={100} step={1} value={i.desconto_item} onChange={(e) => atualizarItem(i.product_id, { desconto_item: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} className="h-8" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Subtotal</Label>
                          <p className="flex h-8 items-center text-sm font-medium text-slate-900">{formatarMoeda(sub)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bloco 3 — Dados comerciais */}
        <Card className="lg:col-span-12">
          <CardHeader><CardTitle>3. Dados comerciais</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5"><Label htmlFor="forma">Forma de pagamento</Label><Input id="forma" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="prazo">Prazo de entrega</Label><Input id="prazo" value={prazoEntrega} onChange={(e) => setPrazoEntrega(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="transp">Transportadora</Label><Input id="transp" value={transportadora} onChange={(e) => setTransportadora(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="frete">Frete (R$)</Label><Input id="frete" inputMode="decimal" value={frete} onChange={(e) => setFrete(e.target.value)} placeholder="0,00" /></div>
            <div className="space-y-1.5"><Label htmlFor="desc-geral">Desconto geral (%)</Label><Input id="desc-geral" inputMode="decimal" value={descontoGeral} onChange={(e) => setDescontoGeral(e.target.value)} placeholder="0" /></div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3"><Label htmlFor="endereco">Endereço de entrega</Label><Input id="endereco" value={enderecoEntrega} onChange={(e) => setEnderecoEntrega(e.target.value)} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="obs-cli">Observações para o cliente</Label><Textarea id="obs-cli" rows={2} value={observacoesCliente} onChange={(e) => setObservacoesCliente(e.target.value)} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="obs">Observações internas</Label><Textarea id="obs" rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} /></div>
          </CardContent>
        </Card>

        {/* Bloco 4 — Resumo */}
        <Card className="lg:col-span-12">
          <CardHeader><CardTitle>4. Resumo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 text-sm sm:grid-cols-4">
              <p className="text-slate-500">Cliente: <span className="text-slate-800">{cliente?.nome ?? '—'}</span></p>
              <p className="text-slate-500">Portfólio: <span className="text-slate-800">{resumoPortfolios}</span></p>
              <p className="text-slate-500">Hub: <span className="text-slate-800">{hubNome || '—'}</span></p>
              <p className="text-slate-500">Itens: <span className="text-slate-800">{itens.length}</span></p>
            </div>
            <div className="space-y-1 border-t border-slate-100 pt-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal dos itens</span><span className="text-slate-800">{formatarMoeda(subtotalItens)}</span></div>
              {descGeralNum > 0 && <div className="flex justify-between"><span className="text-slate-500">Desconto geral ({descGeralNum}%)</span><span className="text-slate-800">− {formatarMoeda(subtotalItens * (descGeralNum / 100))}</span></div>}
              {freteNum > 0 && <div className="flex justify-between"><span className="text-slate-500">Frete</span><span className="text-slate-800">{formatarMoeda(freteNum)}</span></div>}
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-semibold"><span className="text-slate-900">Valor final</span><span className="text-slate-900">{formatarMoeda(valorFinal)}</span></div>
            </div>
            <p className="text-xs text-slate-400">Os valores são recalculados no servidor a partir do preço do vínculo produto↔portfólio.</p>
          </CardContent>
        </Card>
      </div>

      {/* Ações */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="ghost" disabled={saving} onClick={() => router.push(editando ? `/orcamentos/${orcamentoId}` : '/hub/orcamentos')}>Cancelar</Button>
        <Button type="button" variant="outline" disabled={saving} onClick={() => salvar(false)}>{editando ? 'Salvar alterações' : 'Salvar rascunho'}</Button>
        <Button type="button" disabled={saving} onClick={() => salvar(true)}><Check className="size-4" /> Gerar orçamento</Button>
      </div>
    </div>
  )
}
