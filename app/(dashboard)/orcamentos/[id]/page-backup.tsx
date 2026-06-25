import { createAdminClient } from '@/lib/supabase/admin'
import { AcoesOrcamentoDetalhe } from '@/components/orcamentos/acoes-orcamento-detalhe'
import { BotaoExportarPdf } from '@/components/orcamentos/botao-exportar-pdf'
import { BadgeStatusOrcamento } from '@/components/orcamentos/badge-status-orcamento'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatarMoeda } from '@/lib/utils'
import { ChevronLeft } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { QuoteStatus, QuoteItem, Organization, UserRole } from '@/types/database'

export default async function OrcamentoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  // Buscar dados do orçamento
  const { data: orcamento } = await supabase
    .from('quotes')
    .select(`
      *,
      responsavel:profiles!responsavel_id(nome, cargo),
      lead:leads!lead_id(id, nome, telefone, email, endereco, cpf_cnpj),
      deal:deals!deal_id(id, titulo, contato_id),
      aprovador:profiles!aprovacao_interna_por(nome),
      fornecedor:suppliers!supplier_id(nome),
      itens:quote_items(
        id, descricao, quantidade, preco_unitario, desconto_item, subtotal
      ),
      contato:contacts!contato_id(id, nome, telefone, email, endereco, cpf_cnpj)
    `)
    .eq('id', id)
    .single()

  if (!orcamento) {
    notFound()
  }

  // Buscar dados da empresa
  const { data: empresa } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orcamento.organization_id)
    .single()

  // Extrair dados
  const itens = orcamento.itens || []
  const responsavel = Array.isArray(orcamento.responsavel) ? orcamento.responsavel[0] : orcamento.responsavel
  const lead = Array.isArray(orcamento.lead) ? orcamento.lead[0] : orcamento.lead
  const deal = Array.isArray(orcamento.deal) ? orcamento.deal[0] : orcamento.deal
  const aprovador = Array.isArray(orcamento.aprovador) ? orcamento.aprovador[0] : orcamento.aprovador
  const fornecedor = Array.isArray(orcamento.fornecedor) ? orcamento.fornecedor[0] : orcamento.fornecedor
  const contato = Array.isArray(orcamento.contato) ? orcamento.contato[0] : orcamento.contato

  // Determinar cargo do usuário (simulado - ajustar conforme necessário)
  const userCargo: UserRole = 'admin' // Este valor deve vir da sessão real

  const podeEditar = (orcamento.status === 'rascunho' || orcamento.status === 'rejeitado_internamente')

  // Debug: verificar valores
  console.log('Status do orçamento:', orcamento.status)
  console.log('Pode editar:', podeEditar)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/orcamentos">
          <Button variant="ghost" size="sm" className="gap-1 pl-0 text-slate-600">
            <ChevronLeft className="h-4 w-4" />
            Orçamentos
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Orçamento #{orcamento.numero}</h1>
          <BadgeStatusOrcamento status={orcamento.status as QuoteStatus} />
        </div>
        <div className="flex gap-2">
          <BotaoExportarPdf
            numero={orcamento.numero}
            responsavel={responsavel?.nome ?? '—'}
            lead={lead?.nome ?? null}
            fornecedor={fornecedor?.nome ?? null}
            cliente={(() => {
              const nome = contato?.nome ?? lead?.nome ?? ''
              const cpf_cnpj = contato?.cpf_cnpj ?? lead?.cpf_cnpj ?? null
              const telefone = contato?.telefone ?? lead?.telefone ?? null
              const email = contato?.email ?? lead?.email ?? null
              const endereco = orcamento.endereco_entrega ?? contato?.endereco ?? lead?.endereco ?? null
              return nome ? { nome, cpf_cnpj, telefone, email, endereco } : null
            })()}
            empresa={empresa ? {
              nome_fantasia: empresa.nome_fantasia,
              cnpj: empresa.cnpj,
              telefone: empresa.telefone,
              email: empresa.email,
              endereco: empresa.endereco,
              logo_url: empresa.logo_url,
              site: null,
              instagram: null,
            } : null}
            itens={(itens ?? []).map((item: any) => ({
              descricao: item.descricao,
              quantidade: item.quantidade,
              preco_unitario: item.preco_unitario,
              desconto_item: item.desconto_item,
              subtotal: item.subtotal,
            }))}
            valorSubtotal={orcamento.valor_subtotal}
            descontoGeral={orcamento.desconto_geral}
            frete={orcamento.frete ?? 0}
            transportadora={orcamento.carrier?.nome || null}
            freteRegiao={orcamento.frete_regiao ?? null}
            valorTotal={orcamento.valor_total}
            formaPagamento={orcamento.forma_pagamento ?? null}
            observacoes={orcamento.observacoes}
            criadoEm={format(new Date(orcamento.criado_em), "dd/MM/yyyy", { locale: ptBR })}
          />
          {podeEditar && (
            <Link href={`/orcamentos/${id}/editar`}>
              <Button variant="outline" size="sm">Editar</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Itens do orçamento</CardTitle>
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
                    {(itens ?? []).map((item: any) => (
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
                    <span>Desconto geral ({orcamento.desconto_geral}%)</span>
                    <span>-{formatarMoeda(orcamento.valor_subtotal * orcamento.desconto_geral / 100)}</span>
                  </div>
                )}
                {orcamento.frete > 0 && (
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Frete</span>
                    <span>+{formatarMoeda(orcamento.frete)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-slate-900 border-t pt-2">
                  <span>Total</span>
                  <span>{formatarMoeda(orcamento.valor_total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {orcamento.observacoes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Observações</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{orcamento.observacoes}</p>
              </CardContent>
            </Card>
          )}

          {/* Seção de Ações */}
          <AcoesOrcamentoDetalhe
            orcamentoId={id}
            status={orcamento.status}
            cargo={userCargo}
          />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Informações</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-slate-500">Responsável</p>
                <p className="font-medium">{responsavel?.nome ?? '—'}</p>
              </div>
              {lead && (
                <div>
                  <p className="text-xs text-slate-500">Lead</p>
                  <Link href={`/leads/${lead.id}`} className="font-medium text-blue-600 hover:underline">
                    {lead.nome ?? 'Sem nome'}
                  </Link>
                </div>
              )}
              {deal && (
                <div>
                  <p className="text-xs text-slate-500">Negociação</p>
                  <p className="font-medium">{deal.titulo}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500">Criado em</p>
                <p className="font-medium">{format(new Date(orcamento.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              </div>
              {orcamento.forma_pagamento && (
                <div>
                  <p className="text-xs text-slate-500">Forma de pagamento</p>
                  <p className="font-medium">
                    {orcamento.forma_pagamento === 'pix' ? 'PIX'
                      : orcamento.forma_pagamento === 'credito_1x' ? 'Cartão de Crédito - 1x'
                      : orcamento.forma_pagamento === 'credito_2x' ? 'Cartão de Crédito - 2x'
                      : orcamento.forma_pagamento === 'credito_3x' ? 'Cartão de Crédito - 3x'
                      : orcamento.forma_pagamento === 'credito_4x' ? 'Cartão de Crédito - 4x'
                      : orcamento.forma_pagamento === 'credito_5x' ? 'Cartão de Crédito - 5x'
                      : orcamento.forma_pagamento}
                  </p>
                </div>
              )}
              {aprovador && (
                <div>
                  <p className="text-xs text-slate-500">Aprovação interna</p>
                  <p className="font-medium">{aprovador.nome}</p>
                  {orcamento.aprovacao_interna_comentario && (
                    <p className="text-xs text-slate-500 mt-1">{orcamento.aprovacao_interna_comentario}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}