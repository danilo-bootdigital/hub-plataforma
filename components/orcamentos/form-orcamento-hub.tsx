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

// Linha de detalhes do produto para a tabela de itens (campos definidos pela regra:
// via de administração, volume, unidade, qtd por caixa, valor da caixa, exige receita).
function detalhesProduto(p: LinhaProdutoHub): string {
  return [
    p.via_administracao,
    p.volume,
    p.unidade,
    p.quantidade_por_caixa != null ? `${p.quantidade_por_caixa}/cx` : null,
    p.valor_caixa != null ? `cx ${formatarMoeda(p.valor_caixa)}` : null,
    p.exige_receita ? 'Exige receita' : null,
  ].filter(Boolean).join('  ·  ')
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
  orcamentoId,
  inicial,
  contatoInicial,
  dealId,
}: {
  clientes: ClienteOpc[]
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
      {/* Linha 1 — Cliente (40%) + Dados comerciais (60%), mesma altura */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
        {/* 1. Cliente */}
        <Card className="flex h-full flex-col lg:col-span-5">
          <CardHeader><CardTitle>1. Cliente</CardTitle></CardHeader>
          <CardContent className="flex-1 space-y-3">
            {cliente ? (
              <div className="flex items-start justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-slate-200 p-2 text-slate-600"><User className="size-4" /></div>
                  <div className="text-sm">
                    <p className="font-semibold text-slate-900">{cliente.nome}</p>
                    <p className="text-slate-500">{cliente.telefone ?? 'sem telefone'}</p>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setClienteId(null); setBuscaCli('') }}>Trocar</Button>
              </div>
            ) : (
              <>
                <Label htmlFor="busca-cli">Buscar cliente (nome, telefone ou CPF/CNPJ)</Label>
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
                    </button>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 2. Dados comerciais */}
        <Card className="flex h-full flex-col lg:col-span-7">
          <CardHeader><CardTitle>2. Dados comerciais</CardTitle></CardHeader>
          <CardContent className="flex-1">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="forma">Forma de pagamento</Label><Input id="forma" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="prazo">Prazo de entrega</Label><Input id="prazo" value={prazoEntrega} onChange={(e) => setPrazoEntrega(e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="transp">Transportadora</Label><Input id="transp" value={transportadora} onChange={(e) => setTransportadora(e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="frete">Frete (R$)</Label><Input id="frete" inputMode="decimal" value={frete} onChange={(e) => setFrete(e.target.value)} placeholder="0,00" /></div>
              <div className="space-y-1.5"><Label htmlFor="desc-geral">Desconto geral (%)</Label><Input id="desc-geral" inputMode="decimal" value={descontoGeral} onChange={(e) => setDescontoGeral(e.target.value)} placeholder="0" /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="endereco">Endereço de entrega</Label><Input id="endereco" value={enderecoEntrega} onChange={(e) => setEnderecoEntrega(e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linha 2 — Adicionar produtos (largura total) */}
      <Card>
        <CardHeader>
          <CardTitle>3. Adicionar produtos</CardTitle>
          <p className="text-sm text-slate-500">Busque em todos os produtos autorizados ao seu Hub — o portfólio de cada item é preenchido automaticamente.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Buscar produto autorizado…"
              value={buscaProd}
              onChange={(e) => setBuscaProd(e.target.value)}
              autoComplete="off"
            />
          </div>
          {carregandoCat ? (
            <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> Carregando catálogo do Hub…</p>
          ) : (
            <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
              {resultados.length === 0 ? (
                <p className="p-3 text-sm text-slate-500">{buscaProd.trim() ? 'Nenhum produto encontrado.' : 'Nenhum produto disponível.'}</p>
              ) : resultados.map((p) => (
                <div key={`${p.product_id}::${p.portfolio_id}`} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{p.nome}</p>
                    <p className="truncate text-xs text-slate-500">
                      {[p.apresentacao, p.via_administracao, p.volume, p.unidade].filter(Boolean).join(' · ')}
                    </p>
                    {p.portfolio && <p className="truncate text-[11px] text-slate-400">{p.portfolio}</p>}
                  </div>
                  <span className="shrink-0 tabular-nums text-slate-700">{p.preco != null ? formatarMoeda(p.preco) : '—'}</span>
                  <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1" onClick={() => adicionarItem(p)}>
                    <Plus className="size-4" /> Adicionar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linha 3 — Produtos adicionados (tabela, largura total) */}
      <Card>
        <CardHeader>
          <CardTitle>4. Produtos adicionados</CardTitle>
          <p className="text-sm text-slate-500">{itens.length} {itens.length === 1 ? 'item' : 'itens'}</p>
        </CardHeader>
        <CardContent className="p-0">
          {itens.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-slate-500">Nenhum produto adicionado ao orçamento.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2 text-left font-semibold">Produto</th>
                    <th className="px-3 py-2 text-center font-semibold w-24">Qtd</th>
                    <th className="px-3 py-2 text-right font-semibold w-28">Unitário</th>
                    <th className="px-3 py-2 text-center font-semibold w-24">Desc. %</th>
                    <th className="px-3 py-2 text-right font-semibold w-32">Subtotal</th>
                    <th className="px-3 py-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((i) => {
                    const p = catalogo.find((r) => r.product_id === i.product_id)
                    const sub = i.quantidade * i.preco_unitario * (1 - i.desconto_item / 100)
                    const det = p ? detalhesProduto(p) : ''
                    return (
                      <tr key={i.product_id} className="border-b border-slate-100 align-top last:border-0 hover:bg-slate-50/50">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-slate-900">{p?.nome ?? i.nome}</p>
                          {det && <p className="mt-0.5 text-xs text-slate-500">{det}</p>}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Input type="number" min={1} step={1} value={i.quantidade} onChange={(e) => atualizarItem(i.product_id, { quantidade: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} className="mx-auto h-8 w-20 text-center" />
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{formatarMoeda(i.preco_unitario)}</td>
                        <td className="px-3 py-2.5 text-center">
                          <Input type="number" min={0} max={100} step={1} value={i.desconto_item} onChange={(e) => atualizarItem(i.product_id, { desconto_item: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} className="mx-auto h-8 w-20 text-center" />
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">{formatarMoeda(sub)}</td>
                        <td className="px-3 py-2.5 text-center">
                          <Button type="button" variant="ghost" size="sm" onClick={() => removerItem(i.product_id)}><Trash2 className="size-4 text-slate-400" /></Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linha 4 — Observações (esq) + Resumo financeiro e ações (dir) */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
        {/* 5. Observações */}
        <Card className="flex h-full flex-col lg:col-span-7">
          <CardHeader><CardTitle>5. Observações</CardTitle></CardHeader>
          <CardContent className="flex-1 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="obs-cli">Observações para o cliente</Label><Textarea id="obs-cli" rows={4} value={observacoesCliente} onChange={(e) => setObservacoesCliente(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="obs">Observações internas</Label><Textarea id="obs" rows={4} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} /></div>
          </CardContent>
        </Card>

        {/* 6. Resumo financeiro + ações */}
        <Card className="flex h-full flex-col lg:col-span-5">
          <CardHeader><CardTitle>6. Resumo financeiro</CardTitle></CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Itens</span><span className="text-slate-800">{itens.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="tabular-nums text-slate-800">{formatarMoeda(subtotalItens)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Desconto{descGeralNum > 0 ? ` (${descGeralNum}%)` : ''}</span><span className="tabular-nums text-slate-800">{descGeralNum > 0 ? `− ${formatarMoeda(subtotalItens * (descGeralNum / 100))}` : formatarMoeda(0)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Frete</span><span className="tabular-nums text-slate-800">{formatarMoeda(freteNum)}</span></div>
              <div className="mt-1 flex justify-between border-t border-slate-100 pt-2 text-base font-semibold"><span className="text-slate-900">Valor final</span><span className="tabular-nums text-slate-900">{formatarMoeda(valorFinal)}</span></div>
            </div>
            <p className="text-xs text-slate-400">Os valores são recalculados no servidor a partir do preço do vínculo produto↔portfólio.</p>
            <div className="mt-auto flex flex-col gap-2 border-t border-slate-100 pt-3">
              <Button type="button" disabled={saving} onClick={() => salvar(true)}><Check className="size-4" /> Gerar orçamento</Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" disabled={saving} onClick={() => salvar(false)}>{editando ? 'Salvar alterações' : 'Salvar rascunho'}</Button>
                <Button type="button" variant="ghost" disabled={saving} onClick={() => router.push(editando ? `/orcamentos/${orcamentoId}` : '/hub/orcamentos')}>Cancelar</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
