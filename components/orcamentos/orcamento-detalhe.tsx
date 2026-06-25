'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BadgeStatusOrcamento } from './badge-status-orcamento'
import { formatarMoeda } from '@/lib/utils'
import { User, Building2, Truck, MapPin, Package, FileText, ChevronRight } from 'lucide-react'
import type { Quote, QuoteItem } from '@/types/database'

type OrcamentoDetalheProps = {
  orcamento: Quote & {
    responsavel: { nome: string } | null
    lead: { id: string; nome: string; telefone: string; email: string; endereco: string; cpf_cnpj: string } | null
    contato: { id: string; nome: string; telefone: string; email: string } | null
    deal: { id: string; titulo: string; contato_id: string } | null
    fornecedor: { nome: string } | null
    carrier: { nome: string } | null
    itens: QuoteItem[]
  }
}

export function OrcamentoDetalhe({ orcamento }: OrcamentoDetalheProps) {
  return (
    <div className="space-y-5">
      {/* Endereços e Logística Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Endereço do Cliente */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3 bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                <MapPin className="h-4 w-4 text-emerald-600" />
              </div>
              <CardTitle className="text-sm font-semibold text-slate-700">Endereço do Cliente</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {orcamento.lead?.endereco ? (
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{orcamento.lead.endereco}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">Não informado</p>
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
            {orcamento.endereco_entrega ? (
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{orcamento.endereco_entrega}</p>
            ) : orcamento.lead?.endereco ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Mesmo do cliente</span>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap mt-2">{orcamento.lead.endereco}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">Não informado</p>
            )}
          </CardContent>
        </Card>

        {/* Logística */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3 bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                <Truck className="h-4 w-4 text-purple-600" />
              </div>
              <CardTitle className="text-sm font-semibold text-slate-700">Transportadora</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {orcamento.carrier?.nome ? (
              <p className="text-sm font-medium text-slate-700">{orcamento.carrier.nome}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">Não informada</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Itens do Orçamento - Tabela Premium */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                <Package className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-slate-700">Itens do Orçamento</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">{orcamento.itens?.length ?? 0} item(s)</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {orcamento.itens && orcamento.itens.length > 0 ? (
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
                  {orcamento.itens.map((item, index) => (
                    <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-slate-400 text-xs">{index + 1}</td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-800">{item.descricao}</p>
                      </td>
                      <td className="px-5 py-3.5 text-center text-slate-600">{item.quantidade}</td>
                      <td className="px-5 py-3.5 text-right text-slate-600">
                        {formatarMoeda(item.preco_unitario)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {item.desconto_item > 0 ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                            {item.desconto_item}%
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="font-semibold text-slate-800">{formatarMoeda(item.subtotal)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-400">Nenhum item encontrado neste orçamento</p>
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
                <span className="font-medium text-slate-700">{formatarMoeda(orcamento.valor_subtotal)}</span>
              </div>

              {orcamento.desconto_geral > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Desconto ({orcamento.desconto_geral}%)</span>
                  <span className="font-medium text-red-600">
                    -{formatarMoeda(orcamento.valor_subtotal * orcamento.desconto_geral / 100)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Frete</span>
                <span className={orcamento.frete > 0 ? 'font-medium text-slate-700' : 'text-slate-400'}>
                  {orcamento.frete > 0 ? formatarMoeda(orcamento.frete) : 'R$ 0,00'}
                </span>
              </div>
            </div>

            {/* Separador */}
            <div className="hidden sm:block w-px bg-slate-200" />

            {/* Coluna direita: total */}
            <div className="sm:w-48 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Valor Total</span>
              <span className="text-2xl font-bold text-emerald-600">
                {formatarMoeda(orcamento.valor_total)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Observações - Apenas se tiver conteúdo */}
      {orcamento.observacoes && (
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
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{orcamento.observacoes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}