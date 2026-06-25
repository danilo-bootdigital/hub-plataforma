import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BadgeStatusOrcamento } from '@/components/orcamentos/badge-status-orcamento'
import { formatarMoeda } from '@/lib/utils'
import type { QuoteStatus, QuoteItem } from '@/types/database'

export default async function OrcamentoPublicoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: orcamento } = await supabase
    .from('quotes')
    .select(`
      id, numero, status, valor_subtotal, desconto_geral, valor_total, observacoes, forma_pagamento, criado_em,
      responsavel:profiles!responsavel_id(nome),
      lead:leads!lead_id(nome),
      org:organizations!organization_id(nome)
    `)
    .eq('id', id)
    .in('status', ['enviado_ao_cliente', 'aprovado_pelo_cliente', 'recusado_pelo_cliente'])
    .single()

  if (!orcamento) notFound()

  const { data: itens } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', id)
    .order('id') as { data: QuoteItem[] | null }

  const responsavel = Array.isArray(orcamento.responsavel) ? orcamento.responsavel[0] : orcamento.responsavel
  const org = Array.isArray(orcamento.org) ? orcamento.org[0] : orcamento.org
  const lead = Array.isArray(orcamento.lead) ? orcamento.lead[0] : orcamento.lead

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">{org?.nome ?? 'Empresa'}</h1>
          <p className="text-sm text-slate-500">Orçamento #{orcamento.numero}</p>
          <BadgeStatusOrcamento status={orcamento.status as QuoteStatus} />
        </div>

        {lead?.nome && (
          <p className="text-center text-sm text-slate-600">
            Para: <span className="font-medium">{lead.nome}</span>
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Itens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-slate-500">
                    <th className="pb-2 pr-4">Descrição</th>
                    <th className="pb-2 pr-4 text-right">Qtd</th>
                    <th className="pb-2 pr-4 text-right">Preço unit.</th>
                    <th className="pb-2 pr-4 text-right">Desc.</th>
                    <th className="pb-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(itens ?? []).map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium text-slate-900">{item.descricao}</td>
                      <td className="py-2 pr-4 text-right text-slate-700">{item.quantidade}</td>
                      <td className="py-2 pr-4 text-right text-slate-700">{formatarMoeda(item.preco_unitario)}</td>
                      <td className="py-2 pr-4 text-right text-slate-600">{item.desconto_item > 0 ? `${item.desconto_item}%` : '—'}</td>
                      <td className="py-2 text-right font-medium text-slate-900">{formatarMoeda(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 border-t pt-3 space-y-1">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>{formatarMoeda(orcamento.valor_subtotal)}</span>
              </div>
              {orcamento.desconto_geral > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Desconto ({orcamento.desconto_geral}%)</span>
                  <span>-{formatarMoeda(orcamento.valor_subtotal - orcamento.valor_total)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-slate-900 border-t pt-2">
                <span>Total</span>
                <span>{formatarMoeda(orcamento.valor_total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {orcamento.forma_pagamento && (
          <Card>
            <CardHeader><CardTitle className="text-base">Forma de Pagamento</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-slate-900">
                {orcamento.forma_pagamento === 'pix' ? 'PIX'
                  : orcamento.forma_pagamento === 'credito_1x' ? 'Cartão de Crédito - 1x'
                  : orcamento.forma_pagamento === 'credito_2x' ? 'Cartão de Crédito - 2x'
                  : orcamento.forma_pagamento === 'credito_3x' ? 'Cartão de Crédito - 3x'
                  : orcamento.forma_pagamento === 'credito_4x' ? 'Cartão de Crédito - 4x'
                  : orcamento.forma_pagamento === 'credito_5x' ? 'Cartão de Crédito - 5x'
                  : orcamento.forma_pagamento}
              </p>
            </CardContent>
          </Card>
        )}

        {orcamento.observacoes && (
          <Card>
            <CardHeader><CardTitle className="text-base">Observações</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{orcamento.observacoes}</p>
            </CardContent>
          </Card>
        )}

        {responsavel && (
          <div className="text-center text-sm text-slate-500 space-y-0.5">
            <p>Responsável: {responsavel.nome}</p>
          </div>
        )}
      </div>
    </div>
  )
}
