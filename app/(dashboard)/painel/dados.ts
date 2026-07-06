/**
 * Camada de dados do PAINEL GERENCIAL da Indústria (Executive Dashboard).
 *
 * Arquitetura (DEC-022): a Indústria ADMINISTRA a rede de Hubs — ela acompanha,
 * nunca opera. Portanto este módulo só produz indicadores estratégicos e uma
 * visão consolidada; nenhuma ação operacional é oferecida.
 *
 * Regras de vínculo entre entidades (schema atual):
 *  - Orçamento → Hub:  quotes.hub_id            (migration expand_orcamento_hub)
 *  - Pedido    → Hub:  orders.quote_id → quotes.hub_id
 *  - Cliente   → Hub:  contacts.carteira_id → carteiras.hub_id
 *  - Receita   → Hub:  conferencia_receitas.hub_id
 *
 * Leitura consolidada usa o admin client (service role) escopada por
 * organization_id, seguindo o padrão de hub/orcamentos e configuracoes/usuarios.
 *
 * NOTA DE ESCALA: para simplicidade e por ser ambiente HUB DEV, as tabelas são
 * lidas por inteiro e agregadas em memória. Em PROD com volume, mover as
 * agregações pesadas (order_items, ranking comercial) para views/RPC no banco.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { calcularVariacao } from '@/components/painel-gerencial/formato'
import type { QuoteStatus, OrderStatus, ConferenciaStatusAtual } from '@/types/database'

// ---------------------------------------------------------------------------
// Tipos expostos aos componentes de bloco
// ---------------------------------------------------------------------------

/** Indicador com número principal, variação MoM (%) e rótulo de comparação. */
export type Metrica = {
  valor: number
  /** Variação percentual vs. período anterior (undefined = sem base → card oculta o selo). */
  variacao?: number
  /** Texto curto de comparação (ex.: "vs. mês anterior"). */
  comparacao?: string
}

export type HubPerformance = {
  id: string
  nome: string
  /** Cidade/UF ainda não existem na tabela `hubs` (placeholder — ver TODO). */
  cidade: string | null
  clientes: number
  orcamentos: number
  pedidos: number
  faturamento: number
  ultimoAcesso: string | null
  status: string
}

export type RankingItem = { nome: string; valor: number }

export type Alerta = {
  id: string
  prioridade: 'alta' | 'media' | 'baixa'
  categoria: string
  titulo: string
  descricao: string
}

export type EventoAtividade = {
  id: string
  tipo:
    | 'hub'
    | 'portfolio'
    | 'assistente'
    | 'pedido'
    | 'receita'
    | 'cliente'
    | 'orcamento'
  titulo: string
  descricao: string
  quando: string
}

export type DadosPainel = {
  resumo: {
    hubsAtivos: Metrica
    clientesAtivos: Metrica
    produtosAtivos: Metrica
    portfoliosAtivos: Metrica
    orcamentosMes: Metrica
    pedidosMes: Metrica
    receitaEmAnalise: Metrica
    crescimentoMes: Metrica
  }
  rede: HubPerformance[]
  comercial: {
    produtosMaisVendidos: RankingItem[]
    categoriasMaisVendidas: RankingItem[]
    portfoliosFaturamento: RankingItem[]
    ticketMedio: number
    conversao: { orcamentos: number; pedidos: number; taxa: number }
  }
  operacao: {
    pedidosAguardandoProducao: Metrica
    pedidosEmProducao: Metrica
    pedidosEnviados: Metrica
    receitasAguardando: Metrica
    receitasAprovadas: Metrica
    receitasReprovadas: Metrica
  }
  alertas: Alerta[]
  atividades: EventoAtividade[]
}

// ---------------------------------------------------------------------------
// Constantes de negócio
// ---------------------------------------------------------------------------

/** Orçamentos "em análise" (pipeline vivo, ainda não ganho nem perdido). */
const QUOTE_EM_ANALISE: QuoteStatus[] = [
  'aguardando_aprovacao_interna',
  'aprovado_internamente',
  'enviado_ao_cliente',
  'aguardando_confirmacao_vendedor',
]

const ORDER_CANCELADO: OrderStatus = 'cancelado'

const DIAS_HUB_INATIVO = 15 // sem acesso há mais de N dias → alerta
const DIAS_PEDIDO_PARADO = 7 // pedido não-finalizado há mais de N dias → alerta

// ---------------------------------------------------------------------------
// Helpers de data
// ---------------------------------------------------------------------------

function inicioDoMes(offset = 0): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + offset, 1).toISOString()
}

function noIntervalo(iso: string | null, ini: string, fim: string): boolean {
  if (!iso) return false
  return iso >= ini && iso < fim
}

/** Constrói uma Métrica comparando volume do mês atual vs. mês anterior. */
function metricaMensal(
  rows: { data: string | null }[],
  ini: string,
  iniAnterior: string,
): Metrica {
  const atual = rows.filter((r) => r.data && r.data >= ini).length
  const anterior = rows.filter((r) => noIntervalo(r.data, iniAnterior, ini)).length
  return {
    valor: rows.length,
    variacao: calcularVariacao(atual, anterior),
    comparacao: 'vs. mês anterior',
  }
}

// ---------------------------------------------------------------------------
// Carga principal
// ---------------------------------------------------------------------------

export async function carregarPainelGerencial(orgId: string): Promise<DadosPainel> {
  const db = createAdminClient()
  const ini = inicioDoMes(0)
  const iniAnterior = inicioDoMes(-1)

  // Leituras base (paralelas) — escopadas por organization_id.
  const [
    hubsRes,
    carteirasRes,
    contatosRes,
    produtosRes,
    portfoliosRes,
    categoriasRes,
    quotesRes,
    ordersRes,
    conferenciasRes,
    proprietariosRes,
  ] = await Promise.all([
    db.from('hubs').select('id, nome, status, criado_em').eq('organization_id', orgId),
    db.from('carteiras').select('id, hub_id').eq('organization_id', orgId),
    db.from('contacts').select('id, nome, carteira_id, criado_em').eq('organization_id', orgId),
    db
      .from('products')
      .select('id, nome, ativo, categoria_id, portfolio_id, criado_em')
      .eq('organization_id', orgId),
    db.from('portfolios').select('id, nome, ativo, criado_em').eq('organization_id', orgId),
    db.from('categorias').select('id, nome').eq('organization_id', orgId),
    db
      .from('quotes')
      .select('id, numero, hub_id, status, valor_total, contato_id, criado_em')
      .eq('organization_id', orgId),
    db
      .from('orders')
      .select('id, numero, quote_id, status, valor_total, contato_id, criado_em')
      .eq('organization_id', orgId),
    db
      .from('conferencia_receitas')
      .select('id, hub_id, status_atual, criado_em, decidido_em')
      .eq('organization_id', orgId),
    db
      .from('profiles')
      .select('id, hub_id')
      .eq('organization_id', orgId)
      .eq('cargo', 'proprietario_hub'),
  ])

  const hubs = hubsRes.data ?? []
  const carteiras = carteirasRes.data ?? []
  const contatos = contatosRes.data ?? []
  const produtos = produtosRes.data ?? []
  const portfolios = portfoliosRes.data ?? []
  const categorias = categoriasRes.data ?? []
  const quotes = quotesRes.data ?? []
  const orders = ordersRes.data ?? []
  const conferencias = conferenciasRes.data ?? []
  const proprietarios = proprietariosRes.data ?? []

  // --- Mapas de vínculo ---------------------------------------------------
  const carteiraParaHub = new Map<string, string>()
  carteiras.forEach((c) => c.hub_id && carteiraParaHub.set(c.id, c.hub_id))

  const quoteParaHub = new Map<string, string>()
  quotes.forEach((q) => q.hub_id && quoteParaHub.set(q.id, q.hub_id))

  const produtoInfo = new Map<string, { nome: string; categoria_id: string | null; portfolio_id: string | null }>()
  produtos.forEach((p) => produtoInfo.set(p.id, { nome: p.nome, categoria_id: p.categoria_id, portfolio_id: p.portfolio_id }))

  const nomeCategoria = new Map<string, string>()
  categorias.forEach((c) => nomeCategoria.set(c.id, c.nome))
  const nomePortfolio = new Map<string, string>()
  portfolios.forEach((p) => nomePortfolio.set(p.id, p.nome))

  const ordersValidos = orders.filter((o) => o.status !== ORDER_CANCELADO)

  // Último acesso por Hub = último login do proprietário do Hub (auth.users).
  const hubParaProprietario = new Map<string, string>()
  proprietarios.forEach((p) => p.hub_id && hubParaProprietario.set(p.hub_id, p.id))
  const ultimoLoginPorUsuario = new Map<string, string | null>()
  try {
    const { data: usersData } = await db.auth.admin.listUsers({ perPage: 1000 })
    usersData?.users?.forEach((u) => ultimoLoginPorUsuario.set(u.id, u.last_sign_in_at ?? null))
  } catch {
    // Sem service role para Auth Admin: coluna "Último acesso" fica indefinida.
  }

  // === BLOCO 1 — Resumo Executivo ========================================
  const normalizarStatus = (s: string | null | undefined) => (s ?? '').toUpperCase()
  const hubsAtivosArr = hubs.filter((h) => normalizarStatus(h.status) === 'ATIVO')

  // Receita realizada (bruta) por mês — soma valor_total de pedidos não cancelados.
  const receitaMes = ordersValidos
    .filter((o) => o.criado_em >= ini)
    .reduce((acc, o) => acc + Number(o.valor_total ?? 0), 0)
  const receitaMesAnterior = ordersValidos
    .filter((o) => noIntervalo(o.criado_em, iniAnterior, ini))
    .reduce((acc, o) => acc + Number(o.valor_total ?? 0), 0)

  const receitaEmAnalise = quotes
    .filter((q) => QUOTE_EM_ANALISE.includes(q.status))
    .reduce((acc, q) => acc + Number(q.valor_total ?? 0), 0)

  const resumo: DadosPainel['resumo'] = {
    hubsAtivos: {
      valor: hubsAtivosArr.length,
      ...variacaoNovos(hubs.map((h) => ({ data: h.criado_em })), ini, iniAnterior),
    },
    clientesAtivos: {
      // Sem coluna de status em `contacts` → "ativos" = total de clientes.
      // TODO(backend): quando existir contacts.status, filtrar por ativos aqui.
      ...metricaMensal(contatos.map((c) => ({ data: c.criado_em })), ini, iniAnterior),
    },
    produtosAtivos: {
      valor: produtos.filter((p) => p.ativo).length,
      ...variacaoNovos(produtos.map((p) => ({ data: p.criado_em })), ini, iniAnterior),
    },
    portfoliosAtivos: {
      valor: portfolios.filter((p) => p.ativo).length,
      ...variacaoNovos(portfolios.map((p) => ({ data: p.criado_em })), ini, iniAnterior),
    },
    orcamentosMes: contagemMensal(quotes.map((q) => ({ data: q.criado_em })), ini, iniAnterior),
    pedidosMes: contagemMensal(ordersValidos.map((o) => ({ data: o.criado_em })), ini, iniAnterior),
    receitaEmAnalise: { valor: receitaEmAnalise, comparacao: 'orçamentos em aberto' },
    crescimentoMes: {
      valor: Math.round(calcularVariacao(receitaMes, receitaMesAnterior)),
      variacao: calcularVariacao(receitaMes, receitaMesAnterior),
      comparacao: 'receita vs. mês anterior',
    },
  }

  // === BLOCO 2 — Performance da Rede =====================================
  const clientesPorHub = new Map<string, number>()
  contatos.forEach((c) => {
    const hub = c.carteira_id ? carteiraParaHub.get(c.carteira_id) : undefined
    if (hub) clientesPorHub.set(hub, (clientesPorHub.get(hub) ?? 0) + 1)
  })
  const orcamentosPorHub = new Map<string, number>()
  quotes.forEach((q) => q.hub_id && orcamentosPorHub.set(q.hub_id, (orcamentosPorHub.get(q.hub_id) ?? 0) + 1))
  const pedidosPorHub = new Map<string, number>()
  const faturamentoPorHub = new Map<string, number>()
  ordersValidos.forEach((o) => {
    const hub = o.quote_id ? quoteParaHub.get(o.quote_id) : undefined
    if (!hub) return
    pedidosPorHub.set(hub, (pedidosPorHub.get(hub) ?? 0) + 1)
    faturamentoPorHub.set(hub, (faturamentoPorHub.get(hub) ?? 0) + Number(o.valor_total ?? 0))
  })

  const rede: HubPerformance[] = hubs
    .map((h) => {
      const dono = hubParaProprietario.get(h.id)
      return {
        id: h.id,
        nome: h.nome,
        cidade: null, // TODO(backend): coluna cidade/uf não existe em `hubs`.
        clientes: clientesPorHub.get(h.id) ?? 0,
        orcamentos: orcamentosPorHub.get(h.id) ?? 0,
        pedidos: pedidosPorHub.get(h.id) ?? 0,
        faturamento: faturamentoPorHub.get(h.id) ?? 0,
        ultimoAcesso: dono ? ultimoLoginPorUsuario.get(dono) ?? null : null,
        status: h.status,
      }
    })
    .sort((a, b) => b.faturamento - a.faturamento)

  // === BLOCO 3 — Performance Comercial ===================================
  const orderIdsValidos = ordersValidos.map((o) => o.id)
  const itens = orderIdsValidos.length
    ? (await db.from('order_items').select('order_id, product_id, quantidade, subtotal').in('order_id', orderIdsValidos)).data ?? []
    : []

  const qtdPorProduto = new Map<string, number>()
  const qtdPorCategoria = new Map<string, number>()
  const fatPorPortfolio = new Map<string, number>()
  const produtosComVenda = new Set<string>()
  itens.forEach((it) => {
    if (!it.product_id) return
    produtosComVenda.add(it.product_id)
    const info = produtoInfo.get(it.product_id)
    qtdPorProduto.set(it.product_id, (qtdPorProduto.get(it.product_id) ?? 0) + Number(it.quantidade ?? 0))
    if (info?.categoria_id) qtdPorCategoria.set(info.categoria_id, (qtdPorCategoria.get(info.categoria_id) ?? 0) + Number(it.quantidade ?? 0))
    if (info?.portfolio_id) fatPorPortfolio.set(info.portfolio_id, (fatPorPortfolio.get(info.portfolio_id) ?? 0) + Number(it.subtotal ?? 0))
  })

  const topRanking = (
    m: Map<string, number>,
    nome: (id: string) => string | undefined,
  ): RankingItem[] =>
    Array.from(m.entries())
      .map(([id, valor]) => ({ nome: nome(id) ?? '—', valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 6)

  const totalFaturado = ordersValidos.reduce((acc, o) => acc + Number(o.valor_total ?? 0), 0)
  const comercial: DadosPainel['comercial'] = {
    produtosMaisVendidos: topRanking(qtdPorProduto, (id) => produtoInfo.get(id)?.nome),
    categoriasMaisVendidas: topRanking(qtdPorCategoria, (id) => nomeCategoria.get(id)),
    portfoliosFaturamento: topRanking(fatPorPortfolio, (id) => nomePortfolio.get(id)),
    ticketMedio: ordersValidos.length ? totalFaturado / ordersValidos.length : 0,
    conversao: {
      orcamentos: quotes.length,
      pedidos: ordersValidos.length,
      taxa: quotes.length ? (ordersValidos.length / quotes.length) * 100 : 0,
    },
  }

  // === BLOCO 4 — Operação (Indústria acompanha, não opera) ================
  const porStatusPedido = (status: OrderStatus): Metrica =>
    metricaPorStatus(
      orders.filter((o) => o.status === status).map((o) => ({ data: o.criado_em })),
      ini,
      iniAnterior,
    )
  const porStatusReceita = (status: ConferenciaStatusAtual, campo: 'criado_em' | 'decidido_em'): Metrica =>
    metricaPorStatus(
      conferencias.filter((c) => c.status_atual === status).map((c) => ({ data: c[campo] })),
      ini,
      iniAnterior,
    )

  const operacao: DadosPainel['operacao'] = {
    pedidosAguardandoProducao: porStatusPedido('pendente'),
    pedidosEmProducao: porStatusPedido('em_producao'),
    pedidosEnviados: porStatusPedido('enviado'),
    receitasAguardando: porStatusReceita('aguardando_decisao', 'criado_em'),
    receitasAprovadas: porStatusReceita('aprovada', 'decidido_em'),
    receitasReprovadas: porStatusReceita('reprovada', 'decidido_em'),
  }

  // === BLOCO 5 — Alertas =================================================
  const alertas = gerarAlertas({
    hubs: hubsAtivosArr.map((h) => ({ id: h.id, nome: h.nome })),
    ultimoAcessoPorHub: new Map(rede.map((r) => [r.id, r.ultimoAcesso])),
    clientesRecentesPorHub: contatosRecentesPorHub(contatos, carteiraParaHub, ini),
    receitasAguardando: operacao.receitasAguardando.valor,
    pedidosParados: orders.filter(
      (o) =>
        (o.status === 'pendente' || o.status === 'em_producao') &&
        diasDesdeIso(o.criado_em) > DIAS_PEDIDO_PARADO,
    ).length,
    produtosSemVenda: produtos.filter((p) => p.ativo && !produtosComVenda.has(p.id)).length,
    portfoliosSemProduto: portfolios.filter(
      (pf) => pf.ativo && !produtos.some((p) => p.portfolio_id === pf.id),
    ).length,
    clientesSemMovimentacao: clientesSemMovimentacao(contatos, quotes, orders),
  })

  // === BLOCO 6 — Atividade recente =======================================
  const atividades = gerarAtividades({ hubs, quotes, orders, contatos, portfolios, conferencias })

  return { resumo, rede, comercial, operacao, alertas, atividades }
}

// ---------------------------------------------------------------------------
// Sub-helpers de métrica
// ---------------------------------------------------------------------------

/** Métrica de estoque (hubs/produtos/portfólios ativos): variação = novos MoM. */
function variacaoNovos(rows: { data: string | null }[], ini: string, iniAnterior: string): Pick<Metrica, 'variacao' | 'comparacao'> {
  const novos = rows.filter((r) => r.data && r.data >= ini).length
  const novosAnt = rows.filter((r) => noIntervalo(r.data, iniAnterior, ini)).length
  return { variacao: calcularVariacao(novos, novosAnt), comparacao: 'novos vs. mês anterior' }
}

/** Métrica de fluxo (orçamentos/pedidos do mês): valor = criados no mês. */
function contagemMensal(rows: { data: string | null }[], ini: string, iniAnterior: string): Metrica {
  const atual = rows.filter((r) => r.data && r.data >= ini).length
  const anterior = rows.filter((r) => noIntervalo(r.data, iniAnterior, ini)).length
  return { valor: atual, variacao: calcularVariacao(atual, anterior), comparacao: 'vs. mês anterior' }
}

/** Métrica de status operacional: valor = total no status; variação = MoM por data. */
function metricaPorStatus(rows: { data: string | null }[], ini: string, iniAnterior: string): Metrica {
  const atual = rows.filter((r) => r.data && r.data >= ini).length
  const anterior = rows.filter((r) => noIntervalo(r.data, iniAnterior, ini)).length
  return { valor: rows.length, variacao: calcularVariacao(atual, anterior), comparacao: 'tendência mensal' }
}

function diasDesdeIso(iso: string | null): number {
  if (!iso) return Infinity
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function contatosRecentesPorHub(
  contatos: { carteira_id: string | null; criado_em: string }[],
  carteiraParaHub: Map<string, string>,
  ini: string,
): Map<string, number> {
  const m = new Map<string, number>()
  contatos.forEach((c) => {
    if (c.criado_em < ini || !c.carteira_id) return
    const hub = carteiraParaHub.get(c.carteira_id)
    if (hub) m.set(hub, (m.get(hub) ?? 0) + 1)
  })
  return m
}

function clientesSemMovimentacao(
  contatos: { id: string; criado_em: string }[],
  quotes: { contato_id: string | null }[],
  orders: { contato_id: string | null }[],
): number {
  const ativos = new Set<string>()
  quotes.forEach((q) => q.contato_id && ativos.add(q.contato_id))
  orders.forEach((o) => o.contato_id && ativos.add(o.contato_id))
  // Cliente cadastrado há +60 dias e sem nenhum orçamento/pedido associado.
  return contatos.filter((c) => diasDesdeIso(c.criado_em) > 60 && !ativos.has(c.id)).length
}

// ---------------------------------------------------------------------------
// BLOCO 5 — geração de alertas
// ---------------------------------------------------------------------------

function gerarAlertas(ctx: {
  hubs: { id: string; nome: string }[]
  ultimoAcessoPorHub: Map<string, string | null>
  clientesRecentesPorHub: Map<string, number>
  receitasAguardando: number
  pedidosParados: number
  produtosSemVenda: number
  portfoliosSemProduto: number
  clientesSemMovimentacao: number
}): Alerta[] {
  const alertas: Alerta[] = []

  // Hubs sem acesso recente (por proprietário).
  ctx.hubs.forEach((h) => {
    const dias = diasDesdeIso(ctx.ultimoAcessoPorHub.get(h.id) ?? null)
    if (dias > DIAS_HUB_INATIVO) {
      alertas.push({
        id: `acesso-${h.id}`,
        prioridade: dias > 30 || dias === Infinity ? 'alta' : 'media',
        categoria: 'Engajamento',
        titulo: `${h.nome} sem acesso`,
        descricao:
          dias === Infinity
            ? 'Proprietário nunca acessou a plataforma.'
            : `Último acesso do proprietário há ${dias} dias.`,
      })
    }
  })

  // Hubs ativos sem novos clientes no mês.
  ctx.hubs.forEach((h) => {
    if ((ctx.clientesRecentesPorHub.get(h.id) ?? 0) === 0) {
      alertas.push({
        id: `sem-clientes-${h.id}`,
        prioridade: 'media',
        categoria: 'Crescimento',
        titulo: `${h.nome} sem novos clientes`,
        descricao: 'Nenhum cliente cadastrado neste mês.',
      })
    }
  })

  if (ctx.receitasAguardando > 0)
    alertas.push({
      id: 'receitas-pendentes',
      prioridade: 'alta',
      categoria: 'Receitas',
      titulo: 'Receitas aguardando validação',
      descricao: `${ctx.receitasAguardando} receita(s) pendente(s) de decisão na rede.`,
    })

  if (ctx.pedidosParados > 0)
    alertas.push({
      id: 'pedidos-parados',
      prioridade: 'media',
      categoria: 'Operação',
      titulo: 'Pedidos parados',
      descricao: `${ctx.pedidosParados} pedido(s) sem avanço há mais de ${DIAS_PEDIDO_PARADO} dias.`,
    })

  if (ctx.portfoliosSemProduto > 0)
    alertas.push({
      id: 'portfolios-vazios',
      prioridade: 'media',
      categoria: 'Catálogo',
      titulo: 'Portfólios sem produtos',
      descricao: `${ctx.portfoliosSemProduto} portfólio(s) ativo(s) sem nenhum produto.`,
    })

  if (ctx.produtosSemVenda > 0)
    alertas.push({
      id: 'produtos-sem-venda',
      prioridade: 'baixa',
      categoria: 'Catálogo',
      titulo: 'Produtos sem vendas',
      descricao: `${ctx.produtosSemVenda} produto(s) ativo(s) nunca vendidos.`,
    })

  if (ctx.clientesSemMovimentacao > 0)
    alertas.push({
      id: 'clientes-inativos',
      prioridade: 'baixa',
      categoria: 'Relacionamento',
      titulo: 'Clientes sem movimentação',
      descricao: `${ctx.clientesSemMovimentacao} cliente(s) sem orçamento/pedido há +60 dias.`,
    })

  const peso = { alta: 0, media: 1, baixa: 2 }
  return alertas.sort((a, b) => peso[a.prioridade] - peso[b.prioridade]).slice(0, 12)
}

// ---------------------------------------------------------------------------
// BLOCO 6 — geração da timeline de atividade recente
// ---------------------------------------------------------------------------

function gerarAtividades(ctx: {
  hubs: { id: string; nome: string; criado_em: string }[]
  quotes: { id: string; numero: number; criado_em: string }[]
  orders: { id: string; numero: number; criado_em: string }[]
  contatos: { id: string; nome: string; criado_em: string }[]
  portfolios: { id: string; nome: string; criado_em: string }[]
  conferencias: { id: string; status_atual: string; decidido_em: string | null }[]
}): EventoAtividade[] {
  const eventos: EventoAtividade[] = []

  ctx.hubs.forEach((h) =>
    eventos.push({ id: `hub-${h.id}`, tipo: 'hub', titulo: 'Novo Hub criado', descricao: h.nome, quando: h.criado_em }),
  )
  ctx.portfolios.forEach((p) =>
    eventos.push({ id: `pf-${p.id}`, tipo: 'portfolio', titulo: 'Portfólio criado', descricao: p.nome, quando: p.criado_em }),
  )
  ctx.contatos.forEach((c) =>
    eventos.push({ id: `ct-${c.id}`, tipo: 'cliente', titulo: 'Cliente cadastrado', descricao: c.nome, quando: c.criado_em }),
  )
  ctx.quotes.forEach((q) =>
    eventos.push({ id: `qt-${q.id}`, tipo: 'orcamento', titulo: 'Orçamento gerado', descricao: `Orçamento #${q.numero}`, quando: q.criado_em }),
  )
  ctx.orders.forEach((o) =>
    eventos.push({ id: `od-${o.id}`, tipo: 'pedido', titulo: 'Pedido gerado', descricao: `Pedido #${o.numero}`, quando: o.criado_em }),
  )
  ctx.conferencias
    .filter((c) => c.decidido_em && (c.status_atual === 'aprovada' || c.status_atual === 'reprovada'))
    .forEach((c) =>
      eventos.push({
        id: `rc-${c.id}`,
        tipo: 'receita',
        titulo: c.status_atual === 'aprovada' ? 'Receita validada' : 'Receita reprovada',
        descricao: 'Conferência de receita concluída',
        quando: c.decidido_em as string,
      }),
    )

  // TODO(backend): incluir "Novo Assistente" e "Portfólio autorizado" quando
  // houver fonte com carimbo de data (profiles cargo=assistente / hub_portfolios).

  return eventos
    .filter((e) => e.quando)
    .sort((a, b) => (a.quando < b.quando ? 1 : -1))
    .slice(0, 12)
}
