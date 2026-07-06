'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { QuoteStatus } from '@/types/database'
import { registrarEventoOrcamento } from '@/lib/orcamentos/eventos'
import { resolverPermissoes, podeAcao } from '@/lib/rbac'
import { STATUS_ORCAMENTO_ORDEM, rotuloStatus } from '@/lib/orcamentos/eventos-tipos'

// Orçamento do HUB (DEC-013/014/016/017). Somente proprietario_hub/assistente.
// TODA validação é server-side: Cliente em Carteira do Hub, Portfólio autorizado/ativo,
// produtos do Portfólio, e PREÇO do vínculo product_portfolios (ignora preço do front).

// Cada item carrega seu portfolio_id (vínculo product_portfolios) — o usuário não
// escolhe portfólio; ele vem do produto adicionado pela busca. Itens de um mesmo
// orçamento podem vir de portfólios diferentes.
export type ItemOrcamentoHub = { product_id: string; portfolio_id: string; quantidade: number; desconto_item?: number }
export type DadosOrcamentoHub = {
  contato_id: string
  deal_id?: string | null // atendimento de origem (opcional; preservado quando vem de Atendimentos)
  itens: ItemOrcamentoHub[]
  forma_pagamento?: string | null
  prazo_entrega?: string | null
  transportadora?: string | null
  frete?: number
  endereco_entrega?: string | null
  observacoes?: string | null
  observacoes_cliente?: string | null
  desconto_geral?: number
  finalizar?: boolean // true = "Gerar orçamento"; false/undefined = "Salvar rascunho"
}

// Status em que o orçamento do Hub ainda pode ser editado (até ser aprovado/enviado).
const STATUS_EDITAVEIS: QuoteStatus[] = ['rascunho', 'rejeitado_internamente', 'aguardando_aprovacao_interna']

type AdminClient = ReturnType<typeof createAdminClient>

async function getHubUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase
    .from('profiles').select('id, organization_id, cargo, hub_id').eq('id', user.id).single()
  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'proprietario_hub' && perfil.cargo !== 'assistente') {
    throw new Error('Apenas o Hub (Proprietário ou Assistente) pode criar orçamento.')
  }
  if (!perfil.hub_id) throw new Error('Seu usuário não está vinculado a um Hub.')
  return { perfil: perfil as { id: string; organization_id: string; cargo: string; hub_id: string } }
}

// Valida a cadeia (Cliente→Carteira→Hub; e, POR ITEM, o vínculo product_portfolios
// em Portfólio AUTORIZADO+ativo do Hub) e recalcula itens/totais SEMPRE no servidor,
// com o preço vindo do vínculo. O usuário não escolhe portfólio — cada item traz o seu.
async function validarECalcular(admin: AdminClient, org: string, hub: string, dados: DadosOrcamentoHub) {
  if (!dados.contato_id) throw new Error('Selecione o Cliente.')
  if (!dados.itens?.length) throw new Error('Adicione ao menos um item.')
  const descontoGeral = Math.min(100, Math.max(0, Number(dados.desconto_geral) || 0))
  const frete = Math.max(0, Number(dados.frete) || 0)

  // 1) Cliente pertence a uma Carteira operada pelo Hub.
  const { data: cli } = await admin
    .from('contacts')
    .select('id, nome, carteira_id, carteiras:carteira_id(hub_id)')
    .eq('id', dados.contato_id).eq('organization_id', org).maybeSingle() as unknown as
    { data: { id: string; carteira_id: string | null; carteiras: { hub_id: string | null } | null } | null }
  if (!cli || cli.carteiras?.hub_id !== hub) {
    throw new Error('Cliente não pertence a uma Carteira operada pelo seu Hub.')
  }

  // 2) Portfólios distintos dos itens: TODOS autorizados ao Hub e ativos (segurança).
  const portfolioIds = [...new Set(dados.itens.map((i) => i.portfolio_id).filter(Boolean))]
  const productIds = [...new Set(dados.itens.map((i) => i.product_id).filter(Boolean))]
  if (portfolioIds.length === 0 || productIds.length === 0) throw new Error('Itens inválidos.')

  const { data: pfs } = await admin
    .from('portfolios').select('id, ativo').eq('organization_id', org).in('id', portfolioIds)
  const pfMap = new Map((pfs ?? []).map((p) => [p.id, p]))
  const { data: auts } = await admin
    .from('hub_portfolios').select('portfolio_id')
    .eq('hub_id', hub).eq('organization_id', org).eq('status', 'ativo').in('portfolio_id', portfolioIds)
  const autSet = new Set((auts ?? []).map((a) => a.portfolio_id as string))
  for (const pid of portfolioIds) {
    const pf = pfMap.get(pid)
    if (!pf || !pf.ativo) throw new Error('Há um Portfólio inválido ou inativo entre os itens.')
    if (!autSet.has(pid)) throw new Error('Há um Portfólio não autorizado ao seu Hub entre os itens.')
  }

  // 3) Vínculo (product_id + portfolio_id) autorizado/ativo + PREÇO do vínculo (server-side).
  const { data: vincs } = await admin
    .from('product_portfolios')
    .select('product_id, portfolio_id, preco_unitario, ativo, produto:product_id(nome, apresentacao, preco_unitario)')
    .eq('organization_id', org).in('portfolio_id', portfolioIds).in('product_id', productIds) as unknown as
    { data: { product_id: string; portfolio_id: string; preco_unitario: number | null; ativo: boolean; produto: { nome: string; apresentacao: string | null; preco_unitario: number } | null }[] | null }
  const vmap = new Map((vincs ?? []).map((v) => [`${v.product_id}::${v.portfolio_id}`, v]))

  const itens = dados.itens.map((it) => {
    const v = vmap.get(`${it.product_id}::${it.portfolio_id}`)
    if (!v || v.ativo === false) throw new Error('Há um produto fora dos Portfólios autorizados do seu Hub.')
    const quantidade = Math.max(1, Math.floor(Number(it.quantidade) || 0))
    const desconto_item = Math.min(100, Math.max(0, Number(it.desconto_item) || 0))
    const preco_unitario = Number(v.preco_unitario ?? v.produto?.preco_unitario ?? 0) // preço do vínculo
    const subtotal = quantidade * preco_unitario * (1 - desconto_item / 100)
    const descricao = [v.produto?.nome, v.produto?.apresentacao].filter(Boolean).join(' — ') || 'Produto'
    return { product_id: it.product_id, portfolio_id: it.portfolio_id, descricao, quantidade, preco_unitario, desconto_item, subtotal }
  })

  const valorSubtotal = itens.reduce((s, i) => s + i.subtotal, 0)
  const valorTotal = Math.max(0, valorSubtotal * (1 - descontoGeral / 100) + frete)
  return { itens, valorSubtotal, valorTotal, descontoGeral, frete }
}

export async function criarOrcamentoHub(dados: DadosOrcamentoHub): Promise<string> {
  const { perfil } = await getHubUser()
  const admin = createAdminClient()
  const org = perfil.organization_id
  const hub = perfil.hub_id

  const { itens, valorSubtotal, valorTotal, descontoGeral, frete } = await validarECalcular(admin, org, hub, dados)
  const status: QuoteStatus = dados.finalizar ? 'aguardando_aprovacao_interna' : 'rascunho'
  // Compat (DEC-013/017): quotes.portfolio_id = portfólio do 1º item (PDF/tabela/detalhe).
  const portfolioCabecalho = itens[0]?.portfolio_id ?? null

  const { data: orc, error } = await admin
    .from('quotes')
    .insert({
      organization_id: org,
      responsavel_id: perfil.id,
      hub_id: hub,
      portfolio_id: portfolioCabecalho,
      contato_id: dados.contato_id,
      deal_id: dados.deal_id ?? null, // preserva o atendimento de origem, quando houver
      supplier_id: null,
      forma_pagamento: dados.forma_pagamento?.trim() || null,
      prazo_entrega: dados.prazo_entrega?.trim() || null,
      transportadora: dados.transportadora?.trim() || null,
      endereco_entrega: dados.endereco_entrega?.trim() || null,
      observacoes: dados.observacoes?.trim() || null,
      observacoes_cliente: dados.observacoes_cliente?.trim() || null,
      desconto_geral: descontoGeral,
      frete,
      valor_subtotal: valorSubtotal,
      valor_total: valorTotal,
      status,
    })
    .select('id').single()
  if (error || !orc) throw new Error(`Erro ao criar orçamento: ${error?.message ?? 'desconhecido'}`)

  const { error: eItens } = await admin.from('quote_items').insert(
    itens.map((i) => ({
      quote_id: orc.id, product_id: i.product_id, portfolio_id: i.portfolio_id, descricao: i.descricao,
      quantidade: i.quantidade, preco_unitario: i.preco_unitario, desconto_item: i.desconto_item, subtotal: i.subtotal,
    }))
  )
  if (eItens) {
    await admin.from('quotes').delete().eq('id', orc.id) // rollback
    throw new Error(`Erro ao inserir itens: ${eItens.message}`)
  }

  const nPortfolios = new Set(itens.map((i) => i.portfolio_id)).size
  await admin.from('audit_logs').insert({
    organization_id: org, usuario_id: perfil.id,
    acao: dados.finalizar ? 'CRIACAO_ORCAMENTO_HUB' : 'RASCUNHO_ORCAMENTO_HUB',
    tabela_afetada: 'quotes', registro_id: orc.id,
    dados_anteriores: null,
    dados_novos: { hub_id: hub, portfolio_id: portfolioCabecalho, portfolios: nPortfolios, contato_id: dados.contato_id, itens: itens.length, valor_total: valorTotal },
  })

  // T-1 — rastreamento
  await registrarEventoOrcamento(orc.id, {
    tipo: 'criado',
    descricao: `Orçamento criado com ${itens.length} ${itens.length === 1 ? 'item' : 'itens'}${nPortfolios > 1 ? ` (${nPortfolios} portfólios)` : ''}.`,
    valorNovo: { status, portfolio_id: portfolioCabecalho, contato_id: dados.contato_id, valor_total: valorTotal },
    metadata: { itens: itens.length, portfolios: nPortfolios, finalizar: !!dados.finalizar },
  })

  revalidatePath('/hub/orcamentos')
  revalidatePath('/orcamentos')
  return orc.id
}

export async function editarOrcamentoHub(orcamentoId: string, dados: DadosOrcamentoHub): Promise<string> {
  const { perfil } = await getHubUser()
  const admin = createAdminClient()
  const org = perfil.organization_id
  const hub = perfil.hub_id

  if (!orcamentoId) throw new Error('Orçamento inválido.')

  // 0) O orçamento existe, é do MESMO Hub e está em status editável (não confia no front).
  const { data: atual } = await admin
    .from('quotes')
    .select('id, hub_id, status, contato_id, portfolio_id, desconto_geral, observacoes')
    .eq('id', orcamentoId).eq('organization_id', org).maybeSingle() as unknown as
    { data: { id: string; hub_id: string | null; status: QuoteStatus; contato_id: string | null; portfolio_id: string | null; desconto_geral: number | null; observacoes: string | null } | null }
  if (!atual || atual.hub_id !== hub) throw new Error('Orçamento não pertence ao seu Hub.')
  if (!STATUS_EDITAVEIS.includes(atual.status)) {
    throw new Error('Este orçamento não pode mais ser editado no status atual.')
  }

  // Estado anterior dos itens (para diff granular no rastreamento — T-1). Ordem
  // estável (id) para consistência entre leituras.
  const { data: itensAntigos } = await admin
    .from('quote_items').select('product_id, portfolio_id, descricao, quantidade, preco_unitario, desconto_item')
    .eq('quote_id', orcamentoId).order('id', { ascending: true })

  const { itens, valorSubtotal, valorTotal, descontoGeral, frete } = await validarECalcular(admin, org, hub, dados)
  // "Gerar orçamento" (re)envia para aprovação; "Salvar alterações" mantém o status atual.
  const status: QuoteStatus = dados.finalizar ? 'aguardando_aprovacao_interna' : atual.status
  // Compat: quotes.portfolio_id = portfólio do 1º item.
  const portfolioCabecalho = itens[0]?.portfolio_id ?? null

  const { error: eUpd } = await admin
    .from('quotes')
    .update({
      portfolio_id: portfolioCabecalho,
      contato_id: dados.contato_id,
      forma_pagamento: dados.forma_pagamento?.trim() || null,
      prazo_entrega: dados.prazo_entrega?.trim() || null,
      transportadora: dados.transportadora?.trim() || null,
      endereco_entrega: dados.endereco_entrega?.trim() || null,
      observacoes: dados.observacoes?.trim() || null,
      observacoes_cliente: dados.observacoes_cliente?.trim() || null,
      desconto_geral: descontoGeral,
      frete,
      valor_subtotal: valorSubtotal,
      valor_total: valorTotal,
      status,
    })
    .eq('id', orcamentoId).eq('organization_id', org).eq('hub_id', hub)
  if (eUpd) throw new Error(`Erro ao atualizar orçamento: ${eUpd.message}`)

  // Substitui os itens (remove os antigos e insere os recalculados).
  const { error: eDel } = await admin.from('quote_items').delete().eq('quote_id', orcamentoId)
  if (eDel) throw new Error(`Erro ao atualizar itens: ${eDel.message}`)
  const { error: eItens } = await admin.from('quote_items').insert(
    itens.map((i) => ({
      quote_id: orcamentoId, product_id: i.product_id, portfolio_id: i.portfolio_id, descricao: i.descricao,
      quantidade: i.quantidade, preco_unitario: i.preco_unitario, desconto_item: i.desconto_item, subtotal: i.subtotal,
    }))
  )
  if (eItens) throw new Error(`Erro ao inserir itens: ${eItens.message}`)

  await admin.from('audit_logs').insert({
    organization_id: org, usuario_id: perfil.id,
    acao: 'EDICAO_ORCAMENTO_HUB',
    tabela_afetada: 'quotes', registro_id: orcamentoId,
    dados_anteriores: { status: atual.status },
    dados_novos: { hub_id: hub, portfolio_id: portfolioCabecalho, contato_id: dados.contato_id, itens: itens.length, valor_total: valorTotal, status },
  })

  // T-1 — rastreamento granular (compara estado anterior × novo; só emite mudanças reais).
  if (atual.contato_id !== dados.contato_id) {
    await registrarEventoOrcamento(orcamentoId, { tipo: 'cliente_alterado', descricao: 'Cliente do orçamento alterado.', valorAnterior: atual.contato_id, valorNovo: dados.contato_id })
  }
  if (Number(atual.desconto_geral ?? 0) !== descontoGeral) {
    await registrarEventoOrcamento(orcamentoId, { tipo: 'desconto_aplicado', descricao: `Desconto geral alterado para ${descontoGeral}%.`, valorAnterior: Number(atual.desconto_geral ?? 0), valorNovo: descontoGeral })
  }
  if ((atual.observacoes ?? '') !== (dados.observacoes?.trim() || '')) {
    await registrarEventoOrcamento(orcamentoId, { tipo: 'observacao_adicionada', descricao: 'Observações internas atualizadas.', valorAnterior: atual.observacoes ?? '', valorNovo: dados.observacoes?.trim() || '' })
  }
  // Diff de itens (T-1). Chave por product_id, salvo quando o mesmo produto aparece em
  // mais de um portfólio no orçamento — aí usa o vínculo composto (product_id+portfolio_id)
  // para desambiguar. Assim, orçamentos legados (itens com portfolio_id NULL no banco,
  // resolvidos só na submissão) casam corretamente e não poluem a timeline.
  const temProdutoDuplicado = (arr: { product_id: string }[]) => {
    const vistos = new Set<string>()
    for (const i of arr) { if (vistos.has(i.product_id)) return true; vistos.add(i.product_id) }
    return false
  }
  const usarComposta = temProdutoDuplicado(itens) || temProdutoDuplicado(itensAntigos ?? [])
  const chaveItem = (i: { product_id: string; portfolio_id?: string | null }) =>
    usarComposta ? `${i.product_id}::${i.portfolio_id ?? ''}` : i.product_id
  const antigos = new Map((itensAntigos ?? []).map((i) => [chaveItem(i), i]))
  const novos = new Map(itens.map((i) => [chaveItem(i), i]))
  for (const [k, n] of novos) {
    const a = antigos.get(k)
    if (!a) {
      await registrarEventoOrcamento(orcamentoId, { tipo: 'item_adicionado', descricao: `Produto adicionado: ${n.descricao} (qtd ${n.quantidade}).`, valorNovo: { product_id: n.product_id, portfolio_id: n.portfolio_id, quantidade: n.quantidade, preco_unitario: n.preco_unitario } })
      continue
    }
    if (Number(a.quantidade) !== n.quantidade) {
      await registrarEventoOrcamento(orcamentoId, { tipo: 'quantidade_alterada', descricao: `Quantidade de ${n.descricao} alterada de ${a.quantidade} para ${n.quantidade}.`, valorAnterior: Number(a.quantidade), valorNovo: n.quantidade, metadata: { product_id: n.product_id, portfolio_id: n.portfolio_id } })
    }
    if (Number(a.preco_unitario) !== n.preco_unitario) {
      await registrarEventoOrcamento(orcamentoId, { tipo: 'preco_alterado', descricao: `Preço de ${n.descricao} alterado.`, valorAnterior: Number(a.preco_unitario), valorNovo: n.preco_unitario, metadata: { product_id: n.product_id, portfolio_id: n.portfolio_id } })
    }
    if (Number(a.desconto_item ?? 0) !== n.desconto_item) {
      await registrarEventoOrcamento(orcamentoId, { tipo: 'desconto_aplicado', descricao: `Desconto do item ${n.descricao} alterado para ${n.desconto_item}%.`, valorAnterior: Number(a.desconto_item ?? 0), valorNovo: n.desconto_item, metadata: { product_id: n.product_id, portfolio_id: n.portfolio_id, nivel: 'item' } })
    }
  }
  for (const [k, a] of antigos) {
    if (!novos.has(k)) {
      await registrarEventoOrcamento(orcamentoId, { tipo: 'item_removido', descricao: `Produto removido: ${a.descricao}.`, valorAnterior: { product_id: a.product_id, portfolio_id: a.portfolio_id, quantidade: a.quantidade } })
    }
  }

  revalidatePath('/hub/orcamentos')
  revalidatePath(`/orcamentos/${orcamentoId}`)
  revalidatePath('/orcamentos')
  return orcamentoId
}

// T-1/T-2 — alteração controlada de status pelo Hub (Proprietário sempre; Assistente
// conforme Função 'orcamentos'/'editar'). Bloqueia Indústria (getHubUser) e outro Hub
// (hub_id). Registra o evento status_alterado (valor_anterior/novo) no rastreamento.
// NÃO altera a lista oficial de status (usa a vigente) — a máquina oficial vem na T-2.
export async function alterarStatusOrcamentoHub(orcamentoId: string, novoStatus: QuoteStatus): Promise<void> {
  const { perfil } = await getHubUser() // bloqueia Indústria; exige hub_id
  const org = perfil.organization_id
  const hub = perfil.hub_id

  if (!orcamentoId) throw new Error('Orçamento inválido.')
  if (!STATUS_ORCAMENTO_ORDEM.includes(novoStatus)) throw new Error('Status inválido.')

  // Assistente precisa de permissão de Função ('orcamentos'/'editar'); Proprietário = total.
  if (perfil.cargo === 'assistente') {
    const perm = await resolverPermissoes()
    if (!podeAcao(perm, 'orcamentos', 'editar')) {
      throw new Error('Sem permissão para alterar o status do orçamento.')
    }
  }

  const admin = createAdminClient()
  const { data: atual } = await admin
    .from('quotes').select('id, hub_id, status')
    .eq('id', orcamentoId).eq('organization_id', org).maybeSingle() as unknown as
    { data: { id: string; hub_id: string | null; status: QuoteStatus } | null }
  if (!atual || atual.hub_id !== hub) throw new Error('Orçamento não pertence ao seu Hub.')
  if (atual.status === novoStatus) return // no-op: nada mudou

  const { error } = await admin
    .from('quotes').update({ status: novoStatus, atualizado_em: new Date().toISOString() })
    .eq('id', orcamentoId).eq('organization_id', org).eq('hub_id', hub)
  if (error) throw new Error(`Erro ao alterar status: ${error.message}`)

  await registrarEventoOrcamento(orcamentoId, {
    tipo: 'status_alterado',
    descricao: `Status alterado de ${rotuloStatus(atual.status)} para ${rotuloStatus(novoStatus)}.`,
    valorAnterior: atual.status,
    valorNovo: novoStatus,
    origem: 'hub_form',
  })

  revalidatePath(`/orcamentos/${orcamentoId}`)
  revalidatePath('/hub/orcamentos')
}
