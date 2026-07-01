'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { QuoteStatus } from '@/types/database'

// Orçamento do HUB (DEC-013/014/016/017). Somente proprietario_hub/assistente.
// TODA validação é server-side: Cliente em Carteira do Hub, Portfólio autorizado/ativo,
// produtos do Portfólio, e PREÇO do vínculo product_portfolios (ignora preço do front).

export type ItemOrcamentoHub = { product_id: string; quantidade: number; desconto_item?: number }
export type DadosOrcamentoHub = {
  contato_id: string
  portfolio_id: string
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

// Valida a cadeia (Cliente→Carteira→Hub, Portfólio autorizado, produtos do Portfólio)
// e recalcula itens/totais SEMPRE no servidor, com o preço vindo do vínculo.
async function validarECalcular(admin: AdminClient, org: string, hub: string, dados: DadosOrcamentoHub) {
  if (!dados.contato_id) throw new Error('Selecione o Cliente.')
  if (!dados.portfolio_id) throw new Error('Selecione o Portfólio.')
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

  // 2) Portfólio autorizado ao Hub e ativo.
  const { data: pf } = await admin
    .from('portfolios').select('id, ativo').eq('id', dados.portfolio_id).eq('organization_id', org).maybeSingle()
  if (!pf || !pf.ativo) throw new Error('Portfólio inválido ou inativo.')
  const { data: aut } = await admin
    .from('hub_portfolios').select('id')
    .eq('hub_id', hub).eq('portfolio_id', dados.portfolio_id).eq('status', 'ativo').eq('organization_id', org).maybeSingle()
  if (!aut) throw new Error('Portfólio não autorizado ao seu Hub.')

  // 3) Produtos do Portfólio + PREÇO do vínculo (server-side).
  const ids = [...new Set(dados.itens.map((i) => i.product_id).filter(Boolean))]
  if (ids.length === 0) throw new Error('Itens inválidos.')
  const { data: vincs } = await admin
    .from('product_portfolios')
    .select('product_id, preco_unitario, ativo, produto:product_id(nome, apresentacao, preco_unitario)')
    .eq('portfolio_id', dados.portfolio_id).eq('organization_id', org).in('product_id', ids) as unknown as
    { data: { product_id: string; preco_unitario: number | null; ativo: boolean; produto: { nome: string; apresentacao: string | null; preco_unitario: number } | null }[] | null }
  const vmap = new Map((vincs ?? []).map((v) => [v.product_id, v]))

  const itens = dados.itens.map((it) => {
    const v = vmap.get(it.product_id)
    if (!v || v.ativo === false) throw new Error('Há um produto fora do Portfólio selecionado.')
    const quantidade = Math.max(1, Math.floor(Number(it.quantidade) || 0))
    const desconto_item = Math.min(100, Math.max(0, Number(it.desconto_item) || 0))
    const preco_unitario = Number(v.preco_unitario ?? v.produto?.preco_unitario ?? 0) // preço do vínculo
    const subtotal = quantidade * preco_unitario * (1 - desconto_item / 100)
    const descricao = [v.produto?.nome, v.produto?.apresentacao].filter(Boolean).join(' — ') || 'Produto'
    return { product_id: it.product_id, descricao, quantidade, preco_unitario, desconto_item, subtotal }
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

  const { data: orc, error } = await admin
    .from('quotes')
    .insert({
      organization_id: org,
      responsavel_id: perfil.id,
      hub_id: hub,
      portfolio_id: dados.portfolio_id,
      contato_id: dados.contato_id,
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
      quote_id: orc.id, product_id: i.product_id, descricao: i.descricao,
      quantidade: i.quantidade, preco_unitario: i.preco_unitario, desconto_item: i.desconto_item, subtotal: i.subtotal,
    }))
  )
  if (eItens) {
    await admin.from('quotes').delete().eq('id', orc.id) // rollback
    throw new Error(`Erro ao inserir itens: ${eItens.message}`)
  }

  await admin.from('audit_logs').insert({
    organization_id: org, usuario_id: perfil.id,
    acao: dados.finalizar ? 'CRIACAO_ORCAMENTO_HUB' : 'RASCUNHO_ORCAMENTO_HUB',
    tabela_afetada: 'quotes', registro_id: orc.id,
    dados_anteriores: null,
    dados_novos: { hub_id: hub, portfolio_id: dados.portfolio_id, contato_id: dados.contato_id, itens: itens.length, valor_total: valorTotal },
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
    .select('id, hub_id, status')
    .eq('id', orcamentoId).eq('organization_id', org).maybeSingle() as unknown as
    { data: { id: string; hub_id: string | null; status: QuoteStatus } | null }
  if (!atual || atual.hub_id !== hub) throw new Error('Orçamento não pertence ao seu Hub.')
  if (!STATUS_EDITAVEIS.includes(atual.status)) {
    throw new Error('Este orçamento não pode mais ser editado no status atual.')
  }

  const { itens, valorSubtotal, valorTotal, descontoGeral, frete } = await validarECalcular(admin, org, hub, dados)
  // "Gerar orçamento" (re)envia para aprovação; "Salvar alterações" mantém o status atual.
  const status: QuoteStatus = dados.finalizar ? 'aguardando_aprovacao_interna' : atual.status

  const { error: eUpd } = await admin
    .from('quotes')
    .update({
      portfolio_id: dados.portfolio_id,
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
      quote_id: orcamentoId, product_id: i.product_id, descricao: i.descricao,
      quantidade: i.quantidade, preco_unitario: i.preco_unitario, desconto_item: i.desconto_item, subtotal: i.subtotal,
    }))
  )
  if (eItens) throw new Error(`Erro ao inserir itens: ${eItens.message}`)

  await admin.from('audit_logs').insert({
    organization_id: org, usuario_id: perfil.id,
    acao: 'EDICAO_ORCAMENTO_HUB',
    tabela_afetada: 'quotes', registro_id: orcamentoId,
    dados_anteriores: { status: atual.status },
    dados_novos: { hub_id: hub, portfolio_id: dados.portfolio_id, contato_id: dados.contato_id, itens: itens.length, valor_total: valorTotal, status },
  })

  revalidatePath('/hub/orcamentos')
  revalidatePath(`/orcamentos/${orcamentoId}`)
  revalidatePath('/orcamentos')
  return orcamentoId
}
