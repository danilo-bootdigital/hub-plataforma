import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Edit, User, Building2, Truck, MapPin, Calendar } from 'lucide-react'
import { OrcamentoDetalhe } from '@/components/orcamentos/orcamento-detalhe'
import { BadgeStatusOrcamento } from '@/components/orcamentos/badge-status-orcamento'
import { AcoesOrcamento } from './acoes-orcamento'
import { ExportarPdfButton } from '@/components/orcamentos/exportar-pdf-button'
import { BotaoPreviewPdfNovo } from '@/components/orcamentos/botao-preview-pdf-novo'
import { canEditQuote } from '@/lib/quote-permissions'
import type { QuoteStatus, UserRole } from '@/types/database'

export default async function OrcamentoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Buscar dados do orçamento - NÃO ALTERAR QUERY
  const { data: orcamento, error } = await supabase
    .from('quotes')
    .select(`
      *,
      responsavel:profiles!responsavel_id(nome),
      lead:leads!lead_id(id, nome, telefone, email, endereco, cpf_cnpj),
      contato:contacts!contato_id(
        id,
        nome,
        telefone,
        email,
        cpf_cnpj,
        cargo,
        tipo_pessoa,
        categoria_cliente,
        especialidade,
        tipo_conselho,
        numero_conselho,
        uf_conselho,
        observacoes,
        empresa_id,
        endereco,
        endereco_numero,
        endereco_complemento,
        endereco_bairro,
        endereco_cidade,
        endereco_estado,
        endereco_cep,
        empresa:companies!empresa_id(id, nome)
      ),
      deal:deals!deal_id(id, titulo, contato_id),
      aprovador:profiles!aprovacao_interna_por(nome),
      fornecedor:suppliers!supplier_id(nome),
      carrier:freight_carriers!carrier_id(nome),
      itens:quote_items!quote_id(
        id,
        descricao,
        quantidade,
        preco_unitario,
        desconto_item,
        subtotal,
        product_id
      )
    `)
    .eq('id', id)
    .single()

  if (error || !orcamento) {
    notFound()
  }

  // Buscar pedido existente - NÃO ALTERAR
  const { data: pedidoExistente } = await supabase
    .from('orders')
    .select('id, numero')
    .eq('quote_id', id)
    .maybeSingle()

  // Buscar usuário atual e perfil para verificar permissão de edição
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, cargo')
    .eq('id', user.id)
    .single()

  // Verificar se o usuário pode editar este orçamento
  const podeEditar = perfil ? canEditQuote({
    quoteStatus: orcamento.status as QuoteStatus,
    userRole: perfil.cargo as UserRole,
    quoteOwnerId: orcamento.responsavel_id,
    currentUserId: user.id,
    hasOrder: !!pedidoExistente,
  }) : false

  // Dados do cliente para exibir no header
  const cliente = orcamento.lead ?? orcamento.contato
  const nomeCliente = cliente?.nome ?? 'Cliente não vinculado'
  const telefoneCliente = (orcamento.lead as any)?.telefone ?? orcamento.contato?.telefone
  const emailCliente = (orcamento.lead as any)?.email ?? orcamento.contato?.email

  return (
    <div className="space-y-5">
      {/* Header Premium */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        {/* Left: Back + Title */}
        <div className="space-y-1">
          <Link href="/orcamentos" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600 transition-colors">
            <ChevronLeft className="h-4 w-4" />
            Voltar para Orçamentos
          </Link>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900">
              Orçamento #{orcamento.numero}
            </h1>
            <BadgeStatusOrcamento status={orcamento.status} />
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

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <AcoesOrcamento
            orcamentoId={id}
            status={orcamento.status}
            pedidoExistente={pedidoExistente}
          />
          <ExportarPdfButton orcamentoId={id} numero={orcamento.numero} />
          <BotaoPreviewPdfNovo orcamentoId={id} />
          {podeEditar && (
            <Link href={`/orcamentos/${id}/editar`}>
              <Button variant="default" size="sm" className="gap-1.5 h-9">
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Editar</span>
              </Button>
            </Link>
          )}
        </div>
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
            {Number(orcamento.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })}
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
            {new Date(orcamento.criado_em).toLocaleDateString('pt-BR')}
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
            {orcamento.responsavel?.nome ?? '—'}
          </p>
        </div>

        {/* Fornecedor */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
              <Building2 className="h-4 w-4 text-amber-600" />
            </div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Fornecedor</span>
          </div>
          <p className="text-base font-semibold text-slate-700 truncate">
            {orcamento.fornecedor?.nome ?? '—'}
          </p>
        </div>
      </div>

      <OrcamentoDetalhe orcamento={orcamento} />
    </div>
  )
}