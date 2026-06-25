import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BadgeStatusPedido } from '@/components/pedidos/badge-status-pedido'
import { TimelineStatus } from '@/components/pedidos/timeline-status'
import { BotoesPedido } from '@/components/pedidos/botoes-pedido'
import { ChevronLeft, FileText, Package, CreditCard, User, MapPin, Calendar } from 'lucide-react'

export default async function PedidoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  // NÃO ALTERAR QUERY - Apenas visual premium
  const { data: pedido } = await supabase
    .from('orders')
    .select(`
      id, numero, status, valor_total, desconto_geral, frete, observacoes,
      endereco_entrega, forma_pagamento, motivo_cancelamento,
      criado_em, concluido_em, cancelado_em,
      quote_id,
      responsavel:profiles!responsavel_id(nome),
      lead:leads!lead_id(id, nome, telefone, email),
      contato:contacts!contato_id(id, nome, telefone, email)
    `)
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!pedido) notFound()

  // Fallback: buscar contato via orçamento - NÃO ALTERAR LÓGICA
  let contatoFallback: { id: string; nome: string; telefone: string | null; email: string | null } | null = null
  const contatoDireto = Array.isArray(pedido.contato) ? pedido.contato[0] : pedido.contato
  const leadDireto = Array.isArray(pedido.lead) ? pedido.lead[0] : pedido.lead

  if (!contatoDireto && !leadDireto && pedido.quote_id) {
    const { data: quote } = await supabase
      .from('quotes')
      .select('contato_id, lead_id')
      .eq('id', pedido.quote_id)
      .single()

    if (quote?.contato_id) {
      const { data: c } = await supabase
        .from('contacts')
        .select('id, nome, telefone, email')
        .eq('id', quote.contato_id)
        .single()
      contatoFallback = c
    } else if (quote?.lead_id) {
      const { data: l } = await supabase
        .from('leads')
        .select('id, nome, telefone, email')
        .eq('id', quote.lead_id)
        .single()
      if (l) contatoFallback = l
    }
  }

  const { data: itens } = await supabase
    .from('order_items')
    .select('id, descricao, quantidade, preco_unitario, desconto_item, subtotal')
    .eq('order_id', id)

  const { data: historico } = await supabase
    .from('order_status_history')
    .select('id, status_anterior, status_novo, observacao, criado_em, autor:profiles!autor_id(nome)')
    .eq('order_id', id)
    .order('criado_em', { ascending: false })

  const responsavel = Array.isArray(pedido.responsavel) ? pedido.responsavel[0] : pedido.responsavel
  const lead = Array.isArray(pedido.lead) ? pedido.lead[0] : pedido.lead
  const contato = Array.isArray(pedido.contato) ? pedido.contato[0] : pedido.contato
  const cliente = contato || lead || contatoFallback

  // Dados do cliente para header
  const nomeCliente = cliente?.nome ?? 'Cliente não vinculado'
  const telefoneCliente = cliente?.telefone
  const emailCliente = cliente?.email

  return (
    <div className="space-y-5">
      {/* Header Premium */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        {/* Left: Back + Title */}
        <div className="space-y-1">
          <Link href="/pedidos" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600 transition-colors">
            <ChevronLeft className="h-4 w-4" />
            Voltar para Pedidos
          </Link>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900">
              Pedido #{pedido.numero}
            </h1>
            <BadgeStatusPedido status={pedido.status} />
          </div>

          {/* Cliente Info Row */}
          {cliente && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-semibold text-emerald-700">
                {nomeCliente.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium text-slate-700">{nomeCliente}</span>
              {emailCliente && (
                <>
                  <span className="text-slate-300">•</span>
                  <span>{emailCliente}</span>
                </>
              )}
              {telefoneCliente && (
                <>
                  <span className="text-slate-300">•</span>
                  <span>{telefoneCliente}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions - NÃO ALTERAR FUNCIONALIDADE */}
        <BotoesPedido
          pedidoId={id}
          status={pedido.status}
          numero={pedido.numero}
          itens={itens ?? []}
          valor_total={pedido.valor_total}
          desconto_geral={pedido.desconto_geral}
          frete={pedido.frete}
          observacoes={pedido.observacoes}
          endereco_entrega={pedido.endereco_entrega}
          forma_pagamento={pedido.forma_pagamento}
          lead_id={(pedido as any).lead_id}
          deal_id={(pedido as any).deal_id}
          contato_id={(pedido as any).contato_id}
        />
      </div>

      {/* Timeline de Status - Premium */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <TimelineStatus statusAtual={pedido.status} />
      </div>

      {/* Info Cards Row - Dados rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Valor Total */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
              <span className="text-base font-bold text-emerald-600">R$</span>
            </div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Valor Total</span>
          </div>
          <p className="text-xl font-bold text-slate-900">
            {Number(pedido.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Data de Criação */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Criado em</span>
          </div>
          <p className="text-base font-semibold text-slate-700">
            {new Date(pedido.criado_em).toLocaleDateString('pt-BR')}
          </p>
        </div>

        {/* Responsável */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
              <User className="h-4 w-4 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Responsável</span>
          </div>
          <p className="text-base font-semibold text-slate-700 truncate">
            {responsavel?.nome ?? '—'}
          </p>
        </div>

        {/* Forma de Pagamento */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
              <CreditCard className="h-4 w-4 text-amber-600" />
            </div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pagamento</span>
          </div>
          <p className="text-base font-semibold text-slate-700 truncate">
            {pedido.forma_pagamento ?? '—'}
          </p>
        </div>
      </div>

      {/* Main Content - Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Coluna Principal - Itens + Histórico */}
        <div className="lg:col-span-2 space-y-5">
          {/* Itens do Pedido - Tabela Premium */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                  <Package className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-700">Itens do Pedido</CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">{itens?.length ?? 0} item(s)</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {itens && itens.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-white">
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-12">#</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Descrição</th>
                        <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">Qtd</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">Preço Unit.</th>
                        <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">Desc.</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((item, index) => (
                        <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5 text-slate-400 text-xs">{index + 1}</td>
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-slate-800">{item.descricao}</p>
                          </td>
                          <td className="px-5 py-3.5 text-center text-slate-600">{Number(item.quantidade)}</td>
                          <td className="px-5 py-3.5 text-right text-slate-600">
                            {Number(item.preco_unitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {Number(item.desconto_item) > 0 ? (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                {Number(item.desconto_item)}%
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className="font-semibold text-slate-800">
                              {Number(item.subtotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-400">Nenhum item encontrado neste pedido</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resumo Financeiro - Card com destaque */}
          <Card className="overflow-hidden border-2 border-emerald-100">
            <CardHeader className="pb-3 bg-emerald-50/30">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                  <FileText className="h-4 w-4 text-emerald-600" />
                </div>
                <CardTitle className="text-sm font-semibold text-slate-700">Resumo Financeiro</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Coluna esquerda: detalhamento */}
                <div className="flex-1 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-medium text-slate-700">
                      {Number(pedido.valor_total + (pedido.desconto_geral * pedido.valor_total / 100) - Number(pedido.frete)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>

                  {Number(pedido.desconto_geral) > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Desconto ({pedido.desconto_geral}%)</span>
                      <span className="font-medium text-red-600">
                        -{Number(pedido.valor_total * pedido.desconto_geral / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Frete</span>
                    <span className={Number(pedido.frete) > 0 ? 'font-medium text-slate-700' : 'text-slate-400'}>
                      {Number(pedido.frete) > 0 ? Number(pedido.frete).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                    </span>
                  </div>
                </div>

                {/* Separador */}
                <div className="hidden sm:block w-px bg-slate-200" />

                {/* Coluna direita: total */}
                <div className="sm:w-48 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Valor Total</span>
                  <span className="text-2xl font-bold text-emerald-600">
                    {Number(pedido.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Histórico de Status */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200">
                  <FileText className="h-4 w-4 text-slate-600" />
                </div>
                <CardTitle className="text-sm font-semibold text-slate-700">Histórico de Status</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {(!historico || historico.length === 0) ? (
                <p className="text-sm text-slate-400 italic">Nenhum registro.</p>
              ) : (
                <div className="space-y-4">
                  {historico.map((h) => {
                    const autor = Array.isArray(h.autor) ? h.autor[0] : h.autor
                    return (
                      <div key={h.id} className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                          {historico.indexOf(h) < historico.length - 1 && (
                            <div className="w-px h-8 bg-slate-200 mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="text-sm text-slate-700">
                            {h.status_anterior && (
                              <span className="text-slate-500">{h.status_anterior} → </span>
                            )}
                            <span className="font-medium text-slate-800">{h.status_novo}</span>
                          </p>
                          {h.observacao && (
                            <p className="text-xs text-slate-500 mt-1 bg-slate-50 px-2 py-1 rounded">{h.observacao}</p>
                          )}
                          <p className="text-xs text-slate-400 mt-1">
                            {autor?.nome ?? 'Sistema'} · {new Date(h.criado_em).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Informações */}
        <div className="space-y-4">
          {/* Cliente */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                  <User className="h-4 w-4 text-emerald-600" />
                </div>
                <CardTitle className="text-sm font-semibold text-slate-700">Cliente</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {cliente ? (
                <div className="space-y-2">
                  <p className="font-medium text-slate-800">{cliente.nome}</p>
                  {cliente.telefone && <p className="text-sm text-slate-500">{cliente.telefone}</p>}
                  {cliente.email && <p className="text-sm text-slate-500">{cliente.email}</p>}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">Sem cliente vinculado</p>
              )}
            </CardContent>
          </Card>

          {/* Endereço de Entrega */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                  <MapPin className="h-4 w-4 text-blue-600" />
                </div>
                <CardTitle className="text-sm font-semibold text-slate-700">Endereço de Entrega</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {pedido.endereco_entrega ? (
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{pedido.endereco_entrega}</p>
              ) : (
                <p className="text-sm text-slate-400 italic">Não informado</p>
              )}
            </CardContent>
          </Card>

          {/* Observações */}
          {pedido.observacoes && (
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200">
                    <FileText className="h-4 w-4 text-slate-600" />
                  </div>
                  <CardTitle className="text-sm font-semibold text-slate-700">Observações</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{pedido.observacoes}</p>
              </CardContent>
            </Card>
          )}

          {/* Motivo Cancelamento */}
          {pedido.motivo_cancelamento && (
            <Card className="overflow-hidden border-red-200">
              <CardHeader className="pb-3 bg-red-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  </div>
                  <CardTitle className="text-sm font-semibold text-red-700">Motivo Cancelamento</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-red-600">{pedido.motivo_cancelamento}</p>
              </CardContent>
            </Card>
          )}

          {/* Orçamento Original */}
          {pedido.quote_id && (
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                    <FileText className="h-4 w-4 text-purple-600" />
                  </div>
                  <CardTitle className="text-sm font-semibold text-slate-700">Orçamento Original</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <Link href={`/orcamentos/${pedido.quote_id}`} className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                  <FileText className="h-4 w-4" />
                  Ver orçamento
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}