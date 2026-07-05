import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Edit, Calendar } from 'lucide-react'
import { OrcamentoTabs } from '@/components/orcamentos/orcamento-tabs'
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
        product_id,
        produto:products!product_id(apresentacao)
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
    .select('id, cargo, hub_id, organization_id')
    .eq('id', user.id)
    .single()

  // Segurança de escopo (não confiar nos botões): isola por organização e, para os
  // perfis do Hub (proprietario_hub/assistente), exige o MESMO hub_id do orçamento.
  // Orçamentos legados sem hub_id ficam invisíveis ao Hub (visíveis só à Indústria).
  if (!perfil || orcamento.organization_id !== perfil.organization_id) {
    notFound()
  }
  if (
    (perfil.cargo === 'proprietario_hub' || perfil.cargo === 'assistente') &&
    orcamento.hub_id !== perfil.hub_id
  ) {
    notFound()
  }

  // Verificar se o usuário pode editar este orçamento
  const podeEditar = perfil ? canEditQuote({
    quoteStatus: orcamento.status as QuoteStatus,
    userRole: perfil.cargo as UserRole,
    quoteOwnerId: orcamento.responsavel_id,
    currentUserId: user.id,
    hasOrder: !!pedidoExistente,
  }) : false

  // Edição pelo fluxo do HUB (DEC-017): proprietario_hub/assistente do MESMO Hub,
  // enquanto o orçamento estiver em rascunho/rejeitado_internamente e sem pedido.
  // Aponta para a rota da área do Hub (não para o editor legado de Fornecedor).
  const podeEditarHub = !!(
    perfil &&
    (perfil.cargo === 'proprietario_hub' || perfil.cargo === 'assistente') &&
    orcamento.hub_id &&
    perfil.hub_id === orcamento.hub_id &&
    !pedidoExistente &&
    (orcamento.status === 'rascunho' ||
      orcamento.status === 'rejeitado_internamente' ||
      orcamento.status === 'aguardando_aprovacao_interna')
  )

  // Dados do cliente para exibir no header
  const cliente = orcamento.lead ?? orcamento.contato
  const nomeCliente = cliente?.nome ?? 'Cliente não vinculado'

  return (
    <div className="space-y-4">
      {/* Header compacto */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        {/* Left: Back + Title + Cliente */}
        <div className="space-y-1">
          <Link href="/orcamentos" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" />
            Voltar para Orçamentos
          </Link>

          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg font-bold text-slate-900">
              Orçamento #{orcamento.numero}
            </h1>
            <BadgeStatusOrcamento status={orcamento.status} />
            {cliente && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-sm font-medium text-slate-700">{nomeCliente}</span>
              </>
            )}
          </div>
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
          {podeEditarHub && !podeEditar && (
            <Link href={`/hub/orcamentos/${id}/editar`}>
              <Button variant="default" size="sm" className="gap-1.5 h-9">
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Editar</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Metadados compactos: Criado em + Status */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-slate-200/80 bg-white px-4 py-2.5 text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span className="text-slate-500">Criado em</span>
          <span className="font-medium text-slate-700">
            {new Date(orcamento.criado_em).toLocaleDateString('pt-BR')}
          </span>
        </div>
        <span className="hidden sm:block h-4 w-px bg-slate-200" />
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Status</span>
          <BadgeStatusOrcamento status={orcamento.status} />
        </div>
      </div>

      <OrcamentoTabs orcamento={orcamento} quoteId={id} />
    </div>
  )
}