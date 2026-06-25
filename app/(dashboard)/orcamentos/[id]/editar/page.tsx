import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { FormOrcamento } from '@/components/orcamentos/form-orcamento'
import { canEditQuote } from '@/lib/quote-permissions'
import type { QuoteItem, QuoteStatus, UserRole } from '@/types/database'

export default async function EditarOrcamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const { data: orcamento } = await supabase
    .from('quotes')
    .select('id, numero, lead_id, deal_id, supplier_id, contato_id, frete, endereco_entrega, forma_pagamento, observacoes, desconto_geral, status, responsavel_id, nota_tipo_pessoa, nota_nome, nota_documento, nota_razao_social, nota_nome_fantasia, nota_endereco, nota_ie, nota_im')
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!orcamento) notFound()

  // Buscar pedido existente para verificar se já foi convertido
  const { data: pedidoExistente } = await supabase
    .from('orders')
    .select('id')
    .eq('quote_id', id)
    .maybeSingle()

  // Verificar permissão usando a função centralizada
  const podeEditar = canEditQuote({
    quoteStatus: orcamento.status as QuoteStatus,
    userRole: perfil.cargo as UserRole,
    quoteOwnerId: orcamento.responsavel_id,
    currentUserId: user.id,
    hasOrder: !!pedidoExistente,
  })

  if (!podeEditar) {
    redirect(`/orcamentos/${id}`)
  }

  const { data: itens } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', id)
    .order('id') as { data: QuoteItem[] | null }

  const { data: produtos } = await supabase
    .from('products')
    .select('*')
    .eq('organization_id', perfil.organization_id)
    .eq('ativo', true)
    .order('nome')

  const { data: fornecedores } = await supabase
    .from('suppliers')
    .select('*')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  const { data: categorias } = await supabase
    .from('supplier_categories')
    .select('*')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  const { data: deals } = await supabase
    .from('deals')
    .select('id, titulo')
    .eq('organization_id', perfil.organization_id)
    .is('ganho', null)
    .order('titulo')

  const { data: contatos } = await supabase
    .from('contacts')
    .select('id, nome, telefone, email, cpf_cnpj, cargo, tipo_pessoa, categoria_cliente, especialidade, tipo_conselho, numero_conselho, uf_conselho, observacoes, empresa_id, empresa:companies!empresa_id(nome), endereco, endereco_numero, endereco_complemento, endereco_bairro, endereco_cidade, endereco_estado, endereco_cep')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  const { data: empresas } = await supabase
    .from('companies')
    .select('id, nome, cnpj, nome_fantasia, inscricao_estadual, inscricao_municipal, endereco')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  const { data: fretesRaw } = await supabase
    .from('supplier_freight')
    .select('supplier_id, carrier_id, regiao, valor')
    .eq('organization_id', perfil.organization_id)

  const fretesFornecedores = (fretesRaw ?? []) as { supplier_id: string; carrier_id: string; regiao: string; valor: number }[]

  const { data: transportadorasRaw } = await supabase
    .from('freight_carriers')
    .select('id, supplier_id, nome')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  const transportadoras = (transportadorasRaw ?? []) as { id: string; supplier_id: string; nome: string }[]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Editar Orçamento #{orcamento.numero}</h1>
      <FormOrcamento
        produtos={produtos ?? []}
        fornecedores={fornecedores ?? []}
        categorias={categorias ?? []}
        deals={(deals ?? []) as { id: string; titulo: string }[]}
        contatos={contatos as any}
        empresas={(empresas ?? []) as { id: string; nome: string; cnpj: string | null; nome_fantasia: string | null; inscricao_estadual: string | null; inscricao_municipal: string | null; endereco: string | null }[]}
        fretesFornecedores={fretesFornecedores}
        transportadoras={transportadoras}
        orcamentoId={id}
        defaultValues={{
          lead_id: orcamento.lead_id,
          deal_id: orcamento.deal_id,
          supplier_id: orcamento.supplier_id,
          contato_id: orcamento.contato_id ?? null,
          observacoes: orcamento.observacoes,
          endereco_entrega: orcamento.endereco_entrega ?? null,
          forma_pagamento: orcamento.forma_pagamento ?? null,
          desconto_geral: orcamento.desconto_geral,
          frete: orcamento.frete ?? 0,
          itens: (itens ?? []).map((item) => ({
            product_id: item.product_id,
            descricao: item.descricao,
            unidade: item.unidade ?? 'un',
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario,
            desconto_item: item.desconto_item,
          })),
          // Migration 049: dados para emissão da nota fiscal
          nota_tipo_pessoa: orcamento.nota_tipo_pessoa ?? 'PF',
          nota_nome: orcamento.nota_nome ?? '',
          nota_documento: orcamento.nota_documento ?? '',
          nota_razao_social: orcamento.nota_razao_social ?? '',
          nota_nome_fantasia: orcamento.nota_nome_fantasia ?? '',
          nota_endereco: orcamento.nota_endereco ?? '',
          nota_ie: orcamento.nota_ie ?? '',
          nota_im: orcamento.nota_im ?? '',
        }}
      />
    </div>
  )
}
