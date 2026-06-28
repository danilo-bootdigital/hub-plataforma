'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function getAssistente() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo, hub_id')
    .eq('id', user.id)
    .single()
  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'assistente') {
    throw new Error('Apenas Assistentes podem criar Orçamentos.')
  }
  return { supabase, perfil }
}

// Cria um Orçamento em RASCUNHO a partir de um Atendimento do próprio Assistente.
// Sem itens/valores/cálculos/envio (Fatia 12). numero é serial (auto).
export async function criarOrcamento(atendimentoId: string) {
  const { supabase, perfil } = await getAssistente()

  const { data: deal } = await supabase
    .from('deals')
    .select('id, responsavel_id, contato_id, organization_id')
    .eq('id', atendimentoId)
    .single()
  if (!deal || deal.organization_id !== perfil.organization_id) {
    throw new Error('Atendimento não encontrado.')
  }
  if (deal.responsavel_id !== perfil.id) {
    throw new Error('Apenas o responsável pelo Atendimento pode criar o Orçamento.')
  }

  const { data: orcamento, error } = await supabase
    .from('quotes')
    .insert({
      organization_id: perfil.organization_id,
      deal_id: deal.id,
      contato_id: deal.contato_id,
      responsavel_id: perfil.id,
      status: 'rascunho',
    })
    .select('id')
    .single()
  if (error) throw new Error(`Erro ao criar Orçamento: ${error.message}`)

  await supabase.from('audit_logs').insert({
    organization_id: perfil.organization_id,
    usuario_id: perfil.id,
    acao: 'CRIACAO_ORCAMENTO',
    tabela_afetada: 'quotes',
    registro_id: orcamento.id,
    dados_anteriores: null,
    dados_novos: { deal_id: deal.id, contato_id: deal.contato_id, status: 'rascunho' },
  })

  revalidatePath('/assistente/orcamentos')
}

// ---- Itens do Orçamento (Fatia 13A) — produto, quantidade, subtotal, total bruto ----

type SupabaseSrv = Awaited<ReturnType<typeof createClient>>
type PerfilMin = { id: string; organization_id: string }

// Só permite alterar itens de Orçamento RASCUNHO do próprio responsável.
async function carregarOrcamentoEditavel(supabase: SupabaseSrv, perfil: PerfilMin, quoteId: string) {
  const { data: q } = await supabase
    .from('quotes')
    .select('id, status, responsavel_id, organization_id')
    .eq('id', quoteId)
    .single()
  if (!q || q.organization_id !== perfil.organization_id) throw new Error('Orçamento não encontrado.')
  if (q.responsavel_id !== perfil.id) throw new Error('Apenas o responsável pode alterar os itens.')
  if (q.status !== 'rascunho') throw new Error('Apenas Orçamentos em RASCUNHO podem ser alterados.')
  return q
}

// Total bruto = soma dos subtotais. Recompõe também o Total Final conforme o
// desconto vigente (mantém valor_total consistente após mudanças de itens — 13B).
async function recomputarTotalBruto(supabase: SupabaseSrv, quoteId: string) {
  const { data: itens } = await supabase.from('quote_items').select('subtotal').eq('quote_id', quoteId)
  const bruto = (itens ?? []).reduce((s: number, i: { subtotal: number | null }) => s + Number(i.subtotal ?? 0), 0)
  const { data: q } = await supabase
    .from('quotes')
    .select('desconto_tipo, desconto_geral, desconto_valor')
    .eq('id', quoteId)
    .single()
  const { final } = calcularTotalFinal(
    bruto,
    (q?.desconto_tipo ?? null) as 'PERCENTUAL' | 'VALOR' | null,
    Number(q?.desconto_geral ?? 0),
    Number(q?.desconto_valor ?? 0)
  )
  await supabase
    .from('quotes')
    .update({ valor_subtotal: bruto, valor_total: final, atualizado_em: new Date().toISOString() })
    .eq('id', quoteId)
}

async function auditarItem(
  supabase: SupabaseSrv, perfil: PerfilMin, acao: string, registroId: string,
  ant: Record<string, unknown> | null, novos: Record<string, unknown> | null
) {
  await supabase.from('audit_logs').insert({
    organization_id: perfil.organization_id, usuario_id: perfil.id, acao,
    tabela_afetada: 'quote_items', registro_id: registroId, dados_anteriores: ant, dados_novos: novos,
  })
}

export async function adicionarItemOrcamento(quoteId: string, productId: string, quantidade: number) {
  const { supabase, perfil } = await getAssistente()
  await carregarOrcamentoEditavel(supabase, perfil, quoteId)

  const q = Number(quantidade)
  if (!Number.isFinite(q) || q <= 0) throw new Error('Quantidade deve ser maior que zero.')

  const { data: prod } = await supabase
    .from('products')
    .select('id, nome, preco_unitario, organization_id')
    .eq('id', productId)
    .single()
  if (!prod || prod.organization_id !== perfil.organization_id) throw new Error('Produto não encontrado.')

  const preco = Number(prod.preco_unitario ?? 0)
  const subtotal = q * preco
  const { data: item, error } = await supabase
    .from('quote_items')
    .insert({ quote_id: quoteId, product_id: prod.id, descricao: prod.nome, quantidade: q, preco_unitario: preco, subtotal })
    .select('id')
    .single()
  if (error) throw new Error(`Erro ao adicionar item: ${error.message}`)

  await recomputarTotalBruto(supabase, quoteId)
  await auditarItem(supabase, perfil, 'ADICAO_ITEM_ORCAMENTO', item.id, null, { quote_id: quoteId, product_id: prod.id, quantidade: q, subtotal })
  revalidatePath(`/assistente/orcamentos/${quoteId}`)
}

export async function alterarItemQuantidade(quoteId: string, itemId: string, quantidade: number) {
  const { supabase, perfil } = await getAssistente()
  await carregarOrcamentoEditavel(supabase, perfil, quoteId)

  const q = Number(quantidade)
  if (!Number.isFinite(q) || q <= 0) throw new Error('Quantidade deve ser maior que zero.')

  const { data: item } = await supabase
    .from('quote_items')
    .select('id, quote_id, preco_unitario, quantidade')
    .eq('id', itemId)
    .single()
  if (!item || item.quote_id !== quoteId) throw new Error('Item não pertence a este Orçamento.')

  const subtotal = q * Number(item.preco_unitario ?? 0)
  const { error } = await supabase.from('quote_items').update({ quantidade: q, subtotal }).eq('id', itemId)
  if (error) throw new Error(`Erro ao alterar item: ${error.message}`)

  await recomputarTotalBruto(supabase, quoteId)
  await auditarItem(supabase, perfil, 'ALTERACAO_ITEM_ORCAMENTO', itemId, { quantidade: item.quantidade }, { quantidade: q, subtotal })
  revalidatePath(`/assistente/orcamentos/${quoteId}`)
}

export async function removerItemOrcamento(quoteId: string, itemId: string) {
  const { supabase, perfil } = await getAssistente()
  await carregarOrcamentoEditavel(supabase, perfil, quoteId)

  const { data: item } = await supabase.from('quote_items').select('id, quote_id').eq('id', itemId).single()
  if (!item || item.quote_id !== quoteId) throw new Error('Item não pertence a este Orçamento.')

  const { error } = await supabase.from('quote_items').delete().eq('id', itemId)
  if (error) throw new Error(`Erro ao remover item: ${error.message}`)

  await recomputarTotalBruto(supabase, quoteId)
  await auditarItem(supabase, perfil, 'REMOCAO_ITEM_ORCAMENTO', itemId, { quote_id: quoteId }, null)
  revalidatePath(`/assistente/orcamentos/${quoteId}`)
}

// ---- Conclusão financeira (Fatia 13B) — desconto global + observações + total final ----

// Total Final = Total Bruto - Desconto. Sem frete/imposto/arredondamento avançado.
function calcularTotalFinal(bruto: number, tipo: 'PERCENTUAL' | 'VALOR' | null, percentual: number, valor: number) {
  let desconto = 0
  if (tipo === 'PERCENTUAL') desconto = bruto * (percentual / 100)
  else if (tipo === 'VALOR') desconto = valor
  if (desconto < 0) desconto = 0
  if (desconto > bruto) desconto = bruto // desconto nunca maior que o bruto
  const final = bruto - desconto
  return { desconto, final: final < 0 ? 0 : final } // total final nunca negativo
}

// Define o desconto global por TIPO (percentual OU valor), zerando o outro.
export async function definirDescontoOrcamento(
  quoteId: string,
  tipo: 'PERCENTUAL' | 'VALOR',
  montante: number
) {
  const { supabase, perfil } = await getAssistente()
  await carregarOrcamentoEditavel(supabase, perfil, quoteId)

  if (tipo !== 'PERCENTUAL' && tipo !== 'VALOR') throw new Error('Tipo de desconto inválido.')
  const m = Number(montante)
  if (!Number.isFinite(m) || m < 0) throw new Error('Desconto inválido.')
  if (tipo === 'PERCENTUAL' && m > 100) throw new Error('Percentual não pode ultrapassar 100%.')

  const { data: q } = await supabase.from('quotes').select('valor_subtotal, desconto_tipo, desconto_geral, desconto_valor').eq('id', quoteId).single()
  const bruto = Number(q?.valor_subtotal ?? 0)
  if (tipo === 'VALOR' && m > bruto) throw new Error('Desconto não pode ser maior que o Total Bruto.')

  // Mutuamente exclusivos: zera o outro campo.
  const percentual = tipo === 'PERCENTUAL' ? m : 0
  const valor = tipo === 'VALOR' ? m : 0
  const { final } = calcularTotalFinal(bruto, tipo, percentual, valor)

  const { error } = await supabase
    .from('quotes')
    .update({
      desconto_tipo: tipo,
      desconto_geral: percentual,
      desconto_valor: valor,
      valor_total: final,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', quoteId)
  if (error) throw new Error(`Erro ao aplicar desconto: ${error.message}`)

  await auditarItem(
    supabase, perfil, 'ALTERACAO_DESCONTO_ORCAMENTO', quoteId,
    { desconto_tipo: q?.desconto_tipo ?? null, desconto_geral: q?.desconto_geral ?? 0, desconto_valor: q?.desconto_valor ?? 0 },
    { desconto_tipo: tipo, desconto_geral: percentual, desconto_valor: valor, valor_total: final }
  )
  revalidatePath(`/assistente/orcamentos/${quoteId}`)
}

// Remove o desconto (volta a Total Final = Total Bruto).
export async function limparDescontoOrcamento(quoteId: string) {
  const { supabase, perfil } = await getAssistente()
  await carregarOrcamentoEditavel(supabase, perfil, quoteId)

  const { data: q } = await supabase.from('quotes').select('valor_subtotal, desconto_tipo, desconto_geral, desconto_valor').eq('id', quoteId).single()
  const bruto = Number(q?.valor_subtotal ?? 0)

  const { error } = await supabase
    .from('quotes')
    .update({ desconto_tipo: null, desconto_geral: 0, desconto_valor: 0, valor_total: bruto, atualizado_em: new Date().toISOString() })
    .eq('id', quoteId)
  if (error) throw new Error(`Erro ao limpar desconto: ${error.message}`)

  await auditarItem(
    supabase, perfil, 'ALTERACAO_DESCONTO_ORCAMENTO', quoteId,
    { desconto_tipo: q?.desconto_tipo ?? null, desconto_geral: q?.desconto_geral ?? 0, desconto_valor: q?.desconto_valor ?? 0 },
    { desconto_tipo: null, desconto_geral: 0, desconto_valor: 0, valor_total: bruto }
  )
  revalidatePath(`/assistente/orcamentos/${quoteId}`)
}

// Observações comerciais (sem alterar valores financeiros).
export async function salvarObservacoesOrcamento(quoteId: string, observacoes: string) {
  const { supabase, perfil } = await getAssistente()
  await carregarOrcamentoEditavel(supabase, perfil, quoteId)

  const { data: q } = await supabase.from('quotes').select('observacoes').eq('id', quoteId).single()
  const texto = observacoes?.trim() || null

  const { error } = await supabase
    .from('quotes')
    .update({ observacoes: texto, atualizado_em: new Date().toISOString() })
    .eq('id', quoteId)
  if (error) throw new Error(`Erro ao salvar observações: ${error.message}`)

  await auditarItem(supabase, perfil, 'ALTERACAO_OBSERVACOES_ORCAMENTO', quoteId, { observacoes: q?.observacoes ?? null }, { observacoes: texto })
  revalidatePath(`/assistente/orcamentos/${quoteId}`)
}

// ---- Envio operacional ao Cliente (Fatia 14) ----
// "Enviar" = apenas mudar o status para 'enviado_ao_cliente'. NÃO há canal real
// (WhatsApp/e-mail/link), NÃO há aceite/recusa/aprovação. Após o envio, o
// Orçamento deixa de ser RASCUNHO e a edição (itens/financeiro) fica bloqueada.
export async function enviarOrcamentoAoCliente(quoteId: string) {
  const { supabase, perfil } = await getAssistente()

  const { data: q } = await supabase
    .from('quotes')
    .select('id, status, responsavel_id, organization_id, valor_total')
    .eq('id', quoteId)
    .single()
  if (!q || q.organization_id !== perfil.organization_id) throw new Error('Orçamento não encontrado.')
  if (q.responsavel_id !== perfil.id) throw new Error('Apenas o responsável pode enviar o Orçamento.')
  if (q.status !== 'rascunho') throw new Error('Apenas Orçamentos em RASCUNHO podem ser enviados.')

  // Precisa de ao menos 1 item.
  const { count } = await supabase
    .from('quote_items')
    .select('id', { count: 'exact', head: true })
    .eq('quote_id', quoteId)
  if (!count || count < 1) throw new Error('O Orçamento precisa ter ao menos 1 item para ser enviado.')

  // Total Final precisa ser maior que zero.
  if (Number(q.valor_total ?? 0) <= 0) throw new Error('O Total Final precisa ser maior que zero para enviar.')

  const { error } = await supabase
    .from('quotes')
    .update({ status: 'enviado_ao_cliente', atualizado_em: new Date().toISOString() })
    .eq('id', quoteId)
  if (error) throw new Error(`Erro ao enviar Orçamento: ${error.message}`)

  await supabase.from('audit_logs').insert({
    organization_id: perfil.organization_id,
    usuario_id: perfil.id,
    acao: 'ENVIO_ORCAMENTO_CLIENTE',
    tabela_afetada: 'quotes',
    registro_id: quoteId,
    dados_anteriores: { status: 'rascunho' },
    dados_novos: { status: 'enviado_ao_cliente' },
  })

  revalidatePath('/assistente/orcamentos')
  revalidatePath(`/assistente/orcamentos/${quoteId}`)
}

// ---- Conversão em Pré-pedido (Fatia 16) ----
// O Pré-pedido reutiliza a estrutura EXISTENTE `orders` (+ `order_items`): uma
// linha de `orders` com quote_id ligado ao Orçamento aprovado, em status
// 'pendente' (início da operação interna; ainda NÃO é o Pedido definitivo). NÃO
// há alteração de schema/RLS, NÃO há faturamento/ERP/estoque/expedição/fiscal.
// A não-duplicação é garantida verificando se já existe `orders.quote_id`.
// O Orçamento permanece 'aprovado_pelo_cliente' (documento histórico).
export async function converterEmPrePedido(quoteId: string) {
  const { supabase, perfil } = await getAssistente()

  const { data: q } = await supabase
    .from('quotes')
    .select('id, status, responsavel_id, organization_id, deal_id, contato_id, valor_total, desconto_geral, observacoes')
    .eq('id', quoteId)
    .single()
  if (!q || q.organization_id !== perfil.organization_id) throw new Error('Orçamento não encontrado.')
  if (q.responsavel_id !== perfil.id) throw new Error('Apenas o responsável pode converter o Orçamento.')
  if (q.status !== 'aprovado_pelo_cliente') {
    throw new Error('Apenas Orçamentos aprovados pelo Cliente podem ser convertidos em Pré-pedido.')
  }

  // Um Orçamento gera apenas um Pré-pedido (sem conversão duplicada).
  const { data: existente } = await supabase
    .from('orders')
    .select('id')
    .eq('quote_id', quoteId)
    .maybeSingle()
  if (existente) throw new Error('Este Orçamento já foi convertido em Pré-pedido.')

  // Cria o Pré-pedido (orders) preservando os vínculos do Orçamento.
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      organization_id: perfil.organization_id,
      quote_id: q.id,
      deal_id: q.deal_id,
      contato_id: q.contato_id,
      responsavel_id: perfil.id,
      status: 'pendente',
      tipo: 'PRE_PEDIDO',
      valor_total: Number(q.valor_total ?? 0),
      desconto_geral: Number(q.desconto_geral ?? 0),
      frete: 0,
      observacoes: q.observacoes ?? null,
    })
    .select('id')
    .single()
  if (error) throw new Error(`Erro ao converter em Pré-pedido: ${error.message}`)

  // Copia os itens do Orçamento para o Pré-pedido (documento operacional).
  const { data: itens } = await supabase
    .from('quote_items')
    .select('product_id, descricao, quantidade, preco_unitario, subtotal')
    .eq('quote_id', quoteId)
  if (itens && itens.length) {
    const linhas = itens.map((i: {
      product_id: string | null; descricao: string; quantidade: number; preco_unitario: number; subtotal: number
    }) => ({
      order_id: order.id,
      product_id: i.product_id,
      descricao: i.descricao,
      quantidade: i.quantidade,
      preco_unitario: i.preco_unitario,
      subtotal: i.subtotal,
      desconto_item: 0,
    }))
    const { error: errItens } = await supabase.from('order_items').insert(linhas)
    if (errItens) throw new Error(`Erro ao copiar itens do Pré-pedido: ${errItens.message}`)
  }

  await supabase.from('audit_logs').insert({
    organization_id: perfil.organization_id,
    usuario_id: perfil.id,
    acao: 'CONVERSAO_ORCAMENTO_PREPEDIDO',
    tabela_afetada: 'orders',
    registro_id: order.id,
    dados_anteriores: { quote_id: quoteId, quote_status: 'aprovado_pelo_cliente' },
    dados_novos: { order_id: order.id, status: 'pendente', tipo: 'PRE_PEDIDO' },
  })

  revalidatePath('/assistente/prepedidos')
  revalidatePath(`/assistente/orcamentos/${quoteId}`)
}

// ---- Promoção de Pré-pedido para Pedido definitivo (Fatia 17) ----
// Promoção IN-PLACE na mesma linha de `orders`: tipo PRE_PEDIDO -> PEDIDO.
// NÃO cria novo order, NÃO duplica order_items, NÃO altera valores/vínculos/
// status do Orçamento. Mantém o status operacional existente (ex.: 'pendente').
// Idempotente: só promove quem está em PRE_PEDIDO; segunda tentativa é barrada.
export async function gerarPedidoDefinitivo(orderId: string) {
  const { supabase, perfil } = await getAssistente()

  const { data: o } = await supabase
    .from('orders')
    .select('id, tipo, status, responsavel_id, organization_id')
    .eq('id', orderId)
    .single()
  if (!o || o.organization_id !== perfil.organization_id) throw new Error('Pré-pedido não encontrado.')
  if (o.responsavel_id !== perfil.id) throw new Error('Apenas o responsável pode gerar o Pedido.')
  if (o.tipo !== 'PRE_PEDIDO') throw new Error('Apenas Pré-pedidos podem ser promovidos a Pedido.')

  // Promoção in-place. Atualiza apenas `tipo` (preserva status operacional,
  // valores, vínculos e itens). O filtro por tipo='PRE_PEDIDO' garante
  // idempotência: uma segunda chamada concorrente não reescreve um já-PEDIDO.
  const { data: atualizado, error } = await supabase
    .from('orders')
    .update({ tipo: 'PEDIDO', atualizado_em: new Date().toISOString() })
    .eq('id', orderId)
    .eq('tipo', 'PRE_PEDIDO')
    .select('id')
  if (error) throw new Error(`Erro ao gerar Pedido: ${error.message}`)
  if (!atualizado || atualizado.length === 0) throw new Error('Este Pré-pedido já foi promovido a Pedido.')

  await supabase.from('audit_logs').insert({
    organization_id: perfil.organization_id,
    usuario_id: perfil.id,
    acao: 'GERACAO_PEDIDO_DEFINITIVO',
    tabela_afetada: 'orders',
    registro_id: orderId,
    dados_anteriores: { tipo: 'PRE_PEDIDO', status: o.status },
    dados_novos: { tipo: 'PEDIDO', status: o.status },
  })

  revalidatePath('/assistente/prepedidos')
  revalidatePath('/pedidos')
}

// ---- Resposta do Cliente (Fatia 15) ----
// Registra manualmente (pelo Assistente responsável) a resposta comercial do
// Cliente a um Orçamento ENVIADO. Apenas muda o status para
// 'aprovado_pelo_cliente' ou 'recusado_pelo_cliente'. NÃO há Pré-pedido/Pedido,
// assinatura, portal, confirmação automática nem canais reais. Resposta é final:
// só Orçamentos em 'enviado_ao_cliente' podem receber resposta (1 vez).
export async function registrarRespostaCliente(quoteId: string, resposta: 'APROVADO' | 'RECUSADO') {
  const { supabase, perfil } = await getAssistente()

  if (resposta !== 'APROVADO' && resposta !== 'RECUSADO') throw new Error('Resposta inválida.')

  const { data: q } = await supabase
    .from('quotes')
    .select('id, status, responsavel_id, organization_id')
    .eq('id', quoteId)
    .single()
  if (!q || q.organization_id !== perfil.organization_id) throw new Error('Orçamento não encontrado.')
  if (q.responsavel_id !== perfil.id) throw new Error('Apenas o responsável pode registrar a resposta.')
  if (q.status !== 'enviado_ao_cliente') {
    throw new Error('Só é possível registrar resposta de Orçamentos enviados ao Cliente.')
  }

  const novoStatus = resposta === 'APROVADO' ? 'aprovado_pelo_cliente' : 'recusado_pelo_cliente'
  const acao = resposta === 'APROVADO' ? 'APROVACAO_ORCAMENTO_CLIENTE' : 'RECUSA_ORCAMENTO_CLIENTE'

  const { error } = await supabase
    .from('quotes')
    .update({ status: novoStatus, atualizado_em: new Date().toISOString() })
    .eq('id', quoteId)
  if (error) throw new Error(`Erro ao registrar resposta: ${error.message}`)

  await supabase.from('audit_logs').insert({
    organization_id: perfil.organization_id,
    usuario_id: perfil.id,
    acao,
    tabela_afetada: 'quotes',
    registro_id: quoteId,
    dados_anteriores: { status: 'enviado_ao_cliente' },
    dados_novos: { status: novoStatus },
  })

  revalidatePath('/assistente/orcamentos')
  revalidatePath(`/assistente/orcamentos/${quoteId}`)
}
