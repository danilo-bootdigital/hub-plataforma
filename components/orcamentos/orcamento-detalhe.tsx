'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatarMoeda } from '@/lib/utils'
import { Package, FileText, MapPin, ChevronDown } from 'lucide-react'
import type { Quote, QuoteItem } from '@/types/database'

type ItemComProduto = QuoteItem & {
  produto?: { apresentacao: string | null } | null
  portfolio_id?: string | null
  portfolio_nome?: string | null
}

type OrcamentoDetalheProps = {
  orcamento: Quote & {
    responsavel: { nome: string } | null
    lead: { id: string; nome: string; telefone: string; email: string; endereco: string; cpf_cnpj: string } | null
    contato: { id: string; nome: string; telefone: string; email: string } | null
    deal: { id: string; titulo: string; contato_id: string } | null
    fornecedor: { nome: string } | null
    carrier: { nome: string } | null
    itens: ItemComProduto[]
  }
}

export function OrcamentoDetalhe({ orcamento }: OrcamentoDetalheProps) {
  const itens = orcamento.itens ?? []
  const temApresentacao = itens.some((i) => i.produto?.apresentacao?.trim())
  // Portfólio de origem por item (DEC-013/017): itens podem vir de portfólios
  // diferentes. Mostra a coluna quando há essa informação e resume no cabeçalho.
  const temPortfolio = itens.some((i) => i.portfolio_nome?.trim())
  const portfoliosDistintos = [...new Set(itens.map((i) => i.portfolio_nome?.trim()).filter(Boolean))] as string[]
  const resumoPortfolios =
    portfoliosDistintos.length === 0
      ? null
      : portfoliosDistintos.length === 1
        ? portfoliosDistintos[0]
        : 'Múltiplos Portfólios'
  const enderecoEntrega = orcamento.endereco_entrega?.trim() || null
  const enderecoCliente = orcamento.lead?.endereco?.trim() || null
  const transportadora = orcamento.carrier?.nome?.trim() || null
  const descontoValor = orcamento.valor_subtotal * (orcamento.desconto_geral || 0) / 100

  return (
    <div className="space-y-4">
      {/* ITENS — bloco principal */}
      <Card className="overflow-hidden">
        <CardHeader className="py-2.5 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
              <Package className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-slate-700">Itens do Orçamento</CardTitle>
              <p className="text-xs text-slate-500">
                {itens.length} item(s)
                {resumoPortfolios && <> · <span className="font-medium text-slate-600">{resumoPortfolios}</span></>}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {itens.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-white">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-10">#</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Descrição</th>
                    {temPortfolio && (
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-40">Portfólio</th>
                    )}
                    {temApresentacao && (
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-48">Apresentação</th>
                    )}
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide w-16">Qtd</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Preço Unit.</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide w-16">Desc.</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item, index) => (
                    <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors align-top">
                      <td className="px-3 py-2.5 text-slate-400 text-xs">{index + 1}</td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-slate-800 whitespace-pre-wrap break-words">{item.descricao}</p>
                      </td>
                      {temPortfolio && (
                        <td className="px-3 py-2.5">
                          {item.portfolio_nome?.trim() ? (
                            <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">{item.portfolio_nome}</span>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                      )}
                      {temApresentacao && (
                        <td className="px-3 py-2.5 text-slate-600 whitespace-pre-wrap break-words">
                          {item.produto?.apresentacao?.trim() || <span className="text-slate-300">—</span>}
                        </td>
                      )}
                      <td className="px-3 py-2.5 text-center text-slate-600">{item.quantidade}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{formatarMoeda(item.preco_unitario)}</td>
                      <td className="px-3 py-2.5 text-center">
                        {item.desconto_item > 0 ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">{item.desconto_item}%</span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="font-semibold text-slate-800">{formatarMoeda(item.subtotal)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm text-slate-400">Nenhum item encontrado neste orçamento</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DADOS ADICIONAIS — colapsável, discreto */}
      <details className="group rounded-lg border border-slate-200/80 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-600">
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-400" />
            Dados adicionais
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-slate-100 px-4 py-3">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Endereço do Cliente</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-slate-600">
                {enderecoCliente ?? <span className="italic text-slate-300">Não informado</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Endereço de Entrega</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-slate-600">
                {enderecoEntrega ?? (
                  enderecoCliente
                    ? <span className="text-slate-400">Mesmo do cliente</span>
                    : <span className="italic text-slate-300">Não informado</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Transportadora</dt>
              <dd className="mt-0.5 text-slate-600">
                {transportadora ?? <span className="italic text-slate-300">Não informada</span>}
              </dd>
            </div>
          </dl>
          {orcamento.observacoes?.trim() && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Observações</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-slate-600">{orcamento.observacoes}</dd>
            </div>
          )}
        </div>
      </details>

      {/* RESUMO FINANCEIRO — rodapé, valor total único */}
      <Card className="overflow-hidden border-2 border-emerald-100">
        <CardHeader className="py-2.5 bg-emerald-50/30">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
              <FileText className="h-4 w-4 text-emerald-600" />
            </div>
            <CardTitle className="text-sm font-semibold text-slate-700">Resumo Financeiro</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="py-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-700">{formatarMoeda(orcamento.valor_subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Frete</span>
                <span className={orcamento.frete > 0 ? 'font-medium text-slate-700' : 'text-slate-400'}>
                  {orcamento.frete > 0 ? formatarMoeda(orcamento.frete) : 'R$ 0,00'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Desconto{orcamento.desconto_geral > 0 ? ` (${orcamento.desconto_geral}%)` : ''}</span>
                <span className={descontoValor > 0 ? 'font-medium text-red-600' : 'text-slate-400'}>
                  {descontoValor > 0 ? `-${formatarMoeda(descontoValor)}` : 'R$ 0,00'}
                </span>
              </div>
            </div>
            <div className="hidden sm:block w-px self-stretch bg-slate-200" />
            <div className="flex items-center justify-between gap-3 sm:w-52 sm:flex-col sm:items-end sm:justify-center">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Valor Total</span>
              <span className="text-2xl font-bold text-emerald-600">{formatarMoeda(orcamento.valor_total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
