'use client'

import { useState, useMemo, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatarMoeda } from '@/lib/utils'
import { listarProdutosHub, type LinhaProdutoHub } from '@/app/(dashboard)/hub/produtos/actions'
import { criarOrcamentoHub, editarOrcamentoHub, type DadosOrcamentoHub } from '@/app/(dashboard)/orcamentos/actions-hub'
import { Search, Plus, Trash2, User, Check } from 'lucide-react'

export type ClienteOpc = {
  id: string
  nome: string
  telefone: string | null
  cpf_cnpj: string | null
  carteira_nome: string | null
  responsavel_nome: string | null
}
export type PortfolioOpc = { id: string; nome: string }

// Valores iniciais para o modo edição.
export type InicialOrcamentoHub = {
  contato_id: string | null
  portfolio_id: string | null
  itens: {
    product_id: string
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
  nome: string
  apresentacao: string | null
  preco_unitario: number // do vínculo (product_portfolios) — apenas exibição
  quantidade: number
  desconto_item: number
}

function normalizar(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function FormOrcamentoHub({
  clientes,
  portfolios,
  hubNome,
  orcamentoId,
  inicial,
}: {
  clientes: ClienteOpc[]
  portfolios: PortfolioOpc[]
  hubNome: string
  orcamentoId?: string
  inicial?: InicialOrcamentoHub
}) {
  const router = useRouter()
  const [saving, startSaving] = useTransition()
  const editando = !!orcamentoId

  // Bloco 1 — Cliente
  const [buscaCli, setBuscaCli] = useState('')
  const [clienteId, setClienteId] = useState<string | null>(inicial?.contato_id ?? null)
  const cliente = clientes.find((c) => c.id === clienteId) ?? null
  const clientesFiltrados = useMemo(() => {
    const q = normalizar(buscaCli.trim())
    if (!q) return clientes.slice(0, 30)
    return clientes
      .filter((c) =>
        normalizar(
          [c.nome, c.telefone, c.cpf_cnpj, c.carteira_nome].filter(Boolean).join(' ')
        ).includes(q)
      )
      .slice(0, 30)
  }, [buscaCli, clientes])

  // Bloco 2 — Portfólio
  const [portfolioId, setPortfolioId] = useState<string | null>(inicial?.portfolio_id ?? null)
  const portfolio = portfolios.find((p) => p.id === portfolioId) ?? null
  const [produtosPf, setProdutosPf] = useState<LinhaProdutoHub[]>([])
  const [carregandoPf, setCarregandoPf] = useState(false)

  // Bloco 3 — Itens
  const [itens, setItens] = useState<ItemState[]>(
    inicial?.itens.map((i) => ({
      product_id: i.product_id,
      nome: i.nome,
      apresentacao: i.apresentacao,
      preco_unitario: i.preco_unitario,
      quantidade: i.quantidade,
      desconto_item: i.desconto_item,
    })) ?? []
  )
  const [addProdId, setAddProdId] = useState<string | null>(null)

  // Bloco 4 — Dados comerciais
  const [formaPagamento, setFormaPagamento] = useState(inicial?.forma_pagamento ?? '')
  const [prazoEntrega, setPrazoEntrega] = useState(inicial?.prazo_entrega ?? '')
  const [transportadora, setTransportadora] = useState(inicial?.transportadora ?? '')
  const [frete, setFrete] = useState(inicial?.frete ?? '')
  const [enderecoEntrega, setEnderecoEntrega] = useState(inicial?.endereco_entrega ?? '')
  const [observacoes, setObservacoes] = useState(inicial?.observacoes ?? '')
  const [observacoesCliente, setObservacoesCliente] = useState(inicial?.observacoes_cliente ?? '')
  const [descontoGeral, setDescontoGeral] = useState(inicial?.desconto_geral ?? '')

  async function carregarProdutos(portfolioIdArg: string) {
    setCarregandoPf(true)
    try {
      const { rows } = await listarProdutosHub({ portfolioId: portfolioIdArg, status: 'ativo', limit: 1000 })
      setProdutosPf(rows)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar produtos do portfólio.')
    } finally {
      setCarregandoPf(false)
    }
  }

  // Modo edição: carrega os produtos do portfólio já selecionado (sem limpar itens).
  useEffect(() => {
    if (inicial?.portfolio_id) carregarProdutos(inicial.portfolio_id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onPortfolioChange(v: string | null) {
    setPortfolioId(v)
    setItens([])
    setAddProdId(null)
    setProdutosPf([])
    if (v) await carregarProdutos(v)
  }

  function adicionarItem() {
    if (!addProdId) return
    if (itens.some((i) => i.product_id === addProdId)) {
      toast.info('Produto já adicionado. Ajuste a quantidade na lista.')
      return
    }
    const p = produtosPf.find((r) => r.product_id === addProdId)
    if (!p) return
    setItens((prev) => [
      ...prev,
      {
        product_id: p.product_id,
        nome: p.nome,
        apresentacao: p.apresentacao,
        preco_unitario: Number(p.preco ?? 0),
        quantidade: 1,
        desconto_item: 0,
      },
    ])
    setAddProdId(null)
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
  const subtotalItens = itens.reduce(
    (s, i) => s + i.quantidade * i.preco_unitario * (1 - i.desconto_item / 100),
    0
  )
  const valorFinal = Math.max(0, subtotalItens * (1 - descGeralNum / 100) + freteNum)

  function montarDados(finalizar: boolean): DadosOrcamentoHub | null {
    if (!clienteId) {
      toast.error('Selecione o Cliente.')
      return null
    }
    if (!portfolioId) {
      toast.error('Selecione o Portfólio.')
      return null
    }
    if (itens.length === 0) {
      toast.error('Adicione ao menos um produto.')
      return null
    }
    return {
      contato_id: clienteId,
      portfolio_id: portfolioId,
      // Envia SÓ id/quantidade/desconto — o backend recalcula o preço pelo vínculo.
      itens: itens.map((i) => ({
        product_id: i.product_id,
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
        const id = editando
          ? await editarOrcamentoHub(orcamentoId!, dados)
          : await criarOrcamentoHub(dados)
        toast.success(
          editando
            ? finalizar
              ? 'Orçamento atualizado e enviado para aprovação.'
              : 'Alterações salvas.'
            : finalizar
              ? 'Orçamento gerado.'
              : 'Rascunho salvo.'
        )
        router.push(`/orcamentos/${id}`)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao salvar o orçamento.')
      }
    })
  }

  const produtosDisponiveis = produtosPf.filter(
    (p) => !itens.some((i) => i.product_id === p.product_id)
  )

  return (
    <div className="space-y-6">
      {/* Bloco 1 — Cliente */}
      <Card>
        <CardHeader>
          <CardTitle>1. Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {cliente ? (
            <div className="flex items-start justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-slate-200 p-2 text-slate-600">
                  <User className="size-4" />
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-slate-900">{cliente.nome}</p>
                  <p className="text-slate-500">{cliente.telefone ?? 'sem telefone'}</p>
                  <p className="text-slate-500">
                    Carteira: <span className="text-slate-700">{cliente.carteira_nome ?? '—'}</span>
                    {' · '}Responsável:{' '}
                    <span className="text-slate-700">{cliente.responsavel_nome ?? '—'}</span>
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setClienteId(null)
                  setBuscaCli('')
                }}
              >
                Trocar
              </Button>
            </div>
          ) : (
            <>
              <Label htmlFor="busca-cli">Buscar cliente (nome, telefone, CPF/CNPJ ou carteira)</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="busca-cli"
                  className="pl-8"
                  placeholder="Digite para buscar…"
                  value={buscaCli}
                  onChange={(e) => setBuscaCli(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                {clientesFiltrados.length === 0 ? (
                  <p className="p-3 text-sm text-slate-500">Nenhum cliente encontrado no seu Hub.</p>
                ) : (
                  clientesFiltrados.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setClienteId(c.id)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      <span>
                        <span className="font-medium text-slate-900">{c.nome}</span>
                        <span className="ml-2 text-slate-500">{c.telefone ?? ''}</span>
                      </span>
                      <span className="text-xs text-slate-400">{c.carteira_nome ?? ''}</span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Bloco 2 — Portfólio */}
      <Card>
        <CardHeader>
          <CardTitle>2. Portfólio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>Portfólio autorizado ao Hub (1 orçamento = 1 portfólio)</Label>
          <Select value={portfolioId ?? ''} onValueChange={onPortfolioChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione o portfólio…" />
            </SelectTrigger>
            <SelectContent>
              {portfolios.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {portfolios.length === 0 && (
            <p className="text-sm text-slate-500">Nenhum portfólio autorizado ao seu Hub.</p>
          )}
          {editando && (
            <p className="text-xs text-slate-400">
              Trocar o portfólio limpa os produtos já adicionados.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Bloco 3 — Produtos */}
      <Card>
        <CardHeader>
          <CardTitle>3. Produtos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!portfolioId ? (
            <p className="text-sm text-slate-500">Selecione um portfólio para listar os produtos.</p>
          ) : carregandoPf ? (
            <p className="text-sm text-slate-500">Carregando produtos…</p>
          ) : (
            <>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label>Adicionar produto do portfólio</Label>
                  <Select value={addProdId ?? ''} onValueChange={(v: string | null) => setAddProdId(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione um produto…" />
                    </SelectTrigger>
                    <SelectContent>
                      {produtosDisponiveis.map((p) => (
                        <SelectItem key={p.product_id} value={p.product_id}>
                          {p.nome}
                          {p.apresentacao ? ` — ${p.apresentacao}` : ''} · {formatarMoeda(p.preco)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" variant="outline" onClick={adicionarItem} disabled={!addProdId}>
                  <Plus className="size-4" /> Adicionar
                </Button>
              </div>

              {itens.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum produto adicionado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                        <th className="py-2 pr-2 font-medium">Produto</th>
                        <th className="w-20 py-2 px-2 font-medium">Qtd</th>
                        <th className="w-28 py-2 px-2 font-medium">Unitário</th>
                        <th className="w-24 py-2 px-2 font-medium">Desc. %</th>
                        <th className="w-28 py-2 px-2 text-right font-medium">Subtotal</th>
                        <th className="w-10 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {itens.map((i) => {
                        const sub = i.quantidade * i.preco_unitario * (1 - i.desconto_item / 100)
                        return (
                          <tr key={i.product_id}>
                            <td className="py-2 pr-2">
                              <p className="font-medium text-slate-900">{i.nome}</p>
                              {i.apresentacao && (
                                <p className="text-xs text-slate-500">{i.apresentacao}</p>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              <Input
                                type="number"
                                min={1}
                                step={1}
                                value={i.quantidade}
                                onChange={(e) =>
                                  atualizarItem(i.product_id, {
                                    quantidade: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                                  })
                                }
                                className="h-8"
                              />
                            </td>
                            <td className="px-2 py-2 text-slate-600">
                              {formatarMoeda(i.preco_unitario)}
                            </td>
                            <td className="px-2 py-2">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                value={i.desconto_item}
                                onChange={(e) =>
                                  atualizarItem(i.product_id, {
                                    desconto_item: Math.min(
                                      100,
                                      Math.max(0, Number(e.target.value) || 0)
                                    ),
                                  })
                                }
                                className="h-8"
                              />
                            </td>
                            <td className="px-2 py-2 text-right font-medium text-slate-900">
                              {formatarMoeda(sub)}
                            </td>
                            <td className="py-2 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removerItem(i.product_id)}
                              >
                                <Trash2 className="size-4 text-slate-400" />
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Bloco 4 — Dados comerciais */}
      <Card>
        <CardHeader>
          <CardTitle>4. Dados comerciais</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="forma">Forma de pagamento</Label>
            <Input id="forma" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prazo">Prazo de entrega</Label>
            <Input id="prazo" value={prazoEntrega} onChange={(e) => setPrazoEntrega(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="transp">Transportadora</Label>
            <Input id="transp" value={transportadora} onChange={(e) => setTransportadora(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="frete">Frete (R$)</Label>
            <Input id="frete" inputMode="decimal" value={frete} onChange={(e) => setFrete(e.target.value)} placeholder="0,00" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc-geral">Desconto geral (%)</Label>
            <Input id="desc-geral" inputMode="decimal" value={descontoGeral} onChange={(e) => setDescontoGeral(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="endereco">Endereço de entrega</Label>
            <Input id="endereco" value={enderecoEntrega} onChange={(e) => setEnderecoEntrega(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="obs-cli">Observações para o cliente</Label>
            <Textarea id="obs-cli" rows={2} value={observacoesCliente} onChange={(e) => setObservacoesCliente(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="obs">Observações internas</Label>
            <Textarea id="obs" rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Bloco 5 — Resumo */}
      <Card>
        <CardHeader>
          <CardTitle>5. Resumo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p className="text-slate-500">Cliente: <span className="text-slate-800">{cliente?.nome ?? '—'}</span></p>
            <p className="text-slate-500">Portfólio: <span className="text-slate-800">{portfolio?.nome ?? '—'}</span></p>
            <p className="text-slate-500">Hub: <span className="text-slate-800">{hubNome || '—'}</span></p>
            <p className="text-slate-500">Itens: <span className="text-slate-800">{itens.length}</span></p>
          </div>
          <div className="space-y-1 border-t border-slate-100 pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal dos itens</span>
              <span className="text-slate-800">{formatarMoeda(subtotalItens)}</span>
            </div>
            {descGeralNum > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Desconto geral ({descGeralNum}%)</span>
                <span className="text-slate-800">− {formatarMoeda(subtotalItens * (descGeralNum / 100))}</span>
              </div>
            )}
            {freteNum > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Frete</span>
                <span className="text-slate-800">{formatarMoeda(freteNum)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-semibold">
              <span className="text-slate-900">Valor final</span>
              <span className="text-slate-900">{formatarMoeda(valorFinal)}</span>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Os valores são recalculados no servidor a partir do preço do vínculo produto↔portfólio.
          </p>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          disabled={saving}
          onClick={() => router.push(editando ? `/orcamentos/${orcamentoId}` : '/hub/orcamentos')}
        >
          Cancelar
        </Button>
        <Button type="button" variant="outline" disabled={saving} onClick={() => salvar(false)}>
          {editando ? 'Salvar alterações' : 'Salvar rascunho'}
        </Button>
        <Button type="button" disabled={saving} onClick={() => salvar(true)}>
          <Check className="size-4" /> Gerar orçamento
        </Button>
      </div>
    </div>
  )
}
