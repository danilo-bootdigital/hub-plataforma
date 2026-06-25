// ============================================================
// Totais do Cliente para o Painel lateral
// ============================================================
// Sub-fase 2.1: Camada de dados (Fase 2)
// Retorna total de compras, pedidos e orçamentos vinculados
// ao lead/contato da conversa.
// ============================================================

import { createClient } from '@/lib/supabase/server'

// ------------------------------------------------------------
// Tipo público
// ------------------------------------------------------------

/**
 * Totais agregados do cliente para o painel lateral.
 * Todos os valores consideram a organização (multi-tenant).
 */
export type TotaisCliente = {
  /** Soma de valor_total de orders com status ganho/concluido */
  totalCompras: number
  /** Quantidade de pedidos (orders) */
  totalPedidos: number
  /** Quantidade de orçamentos (quotes) */
  totalOrcamentos: number
  /** Soma de valor_total de orçamentos */
  totalOrcamentosValor: number
  /** Soma de valor_total de deals em aberto (não perdidos) */
  totalEmAberto: number
}

// ------------------------------------------------------------
// Função pública
// ------------------------------------------------------------

/**
 * Busca os totais agregados do cliente (lead/contato) vinculado
 * à conversa. Usa o lead_id ou contato_id da conversa para
 * encontrar orders, quotes e deals relacionados.
 *
 * @param orgId         ID da organização
 * @param conversaId    ID da conversa
 * @returns TotaisCliente (zeros se conversa sem lead/contato)
 */
export async function buscarTotaisCliente(
  orgId: string,
  conversaId: string
): Promise<TotaisCliente> {
  const supabase = await createClient()

  const resultadoVazio: TotaisCliente = {
    totalCompras: 0,
    totalPedidos: 0,
    totalOrcamentos: 0,
    totalOrcamentosValor: 0,
    totalEmAberto: 0,
  }

  // 1) Buscar conversa para obter lead_id e contato_id
  const { data: conversa, error: conversaError } = await supabase
    .from('conversations')
    .select('lead_id, contato_id')
    .eq('id', conversaId)
    .eq('organization_id', orgId)
    .single()

  if (conversaError || !conversa) {
    console.error('[buscarTotaisCliente] erro ao buscar conversa:', conversaError)
    return resultadoVazio
  }

  const leadId = conversa.lead_id
  const contatoId = conversa.contato_id

  if (!leadId && !contatoId) {
    return resultadoVazio
  }

  // 2) Buscar orders e quotes em paralelo
  const queries: Promise<{
    kind: 'orders' | 'quotes' | 'deals'
    data: any[] | null
    error: any
  }>[] = []

  if (leadId) {
    const ordersPromise = (async () => {
      const r = await supabase
        .from('orders')
        .select('id, valor_total, status')
        .eq('organization_id', orgId)
        .eq('lead_id', leadId)
      return { kind: 'orders' as const, data: r.data, error: r.error }
    })()

    const quotesPromise = (async () => {
      const r = await supabase
        .from('quotes')
        .select('id, valor_total, status')
        .eq('organization_id', orgId)
        .eq('lead_id', leadId)
      return { kind: 'quotes' as const, data: r.data, error: r.error }
    })()

    const dealsPromise = (async () => {
      const r = await supabase
        .from('deals')
        .select('id, valor_estimado, status')
        .eq('organization_id', orgId)
        .eq('lead_id', leadId)
      return { kind: 'deals' as const, data: r.data, error: r.error }
    })()

    queries.push(ordersPromise, quotesPromise, dealsPromise)
  } else if (contatoId) {
    // Sem lead: tenta buscar orders/quotes pelo contato
    const ordersPromise = (async () => {
      const r = await supabase
        .from('orders')
        .select('id, valor_total, status')
        .eq('organization_id', orgId)
        .eq('contato_id', contatoId)
      return { kind: 'orders' as const, data: r.data, error: r.error }
    })()

    const quotesPromise = (async () => {
      const r = await supabase
        .from('quotes')
        .select('id, valor_total, status')
        .eq('organization_id', orgId)
        .eq('contato_id', contatoId)
      return { kind: 'quotes' as const, data: r.data, error: r.error }
    })()

    queries.push(ordersPromise, quotesPromise)
  }

  const results = await Promise.all(queries)

  // 3) Calcular totais
  let totalCompras = 0
  let totalPedidos = 0
  let totalOrcamentos = 0
  let totalOrcamentosValor = 0
  let totalEmAberto = 0

  for (const r of results) {
    if (r.error) {
      console.error(`[buscarTotaisCliente] erro em ${r.kind}:`, r.error)
      continue
    }
    if (!r.data) continue

    if (r.kind === 'orders') {
      totalPedidos = r.data.length
      for (const o of r.data) {
        // Compras = orders concluidos/ganhos
        if (o.status === 'entregue' || o.status === 'concluido' || o.status === 'pago') {
          totalCompras += Number(o.valor_total ?? 0)
        }
      }
    } else if (r.kind === 'quotes') {
      totalOrcamentos = r.data.length
      for (const q of r.data) {
        totalOrcamentosValor += Number(q.valor_total ?? 0)
      }
    } else if (r.kind === 'deals') {
      for (const d of r.data) {
        // Em aberto = deals nao perdidos
        if (d.status !== 'perdido') {
          totalEmAberto += Number(d.valor_estimado ?? 0)
        }
      }
    }
  }

  return {
    totalCompras,
    totalPedidos,
    totalOrcamentos,
    totalOrcamentosValor,
    totalEmAberto,
  }
}
