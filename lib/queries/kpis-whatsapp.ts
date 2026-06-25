// ============================================================
// KPIs do WhatsApp para os cards clicáveis da Central
// ============================================================
// Sub-fase 2.1: Camada de dados (Fase 2)
// Retorna contadores agregados respeitando permissão de instâncias.
// ============================================================

import { createClient } from '@/lib/supabase/server'
import type { ConversaStatus } from '@/types/database'

// ------------------------------------------------------------
// Tipo público
// ------------------------------------------------------------

/**
 * KPIs exibidos no HeaderKPIs (5 cards clicáveis).
 * Todos os valores são contadores inteiros.
 */
export type KPIWhatsApp = {
  /** Conversas com status em {nao_atendida, em_atendimento, aguardando_cliente} */
  abertas: number
  /** Conversas com nao_lidas > 0 */
  naoLidas: number
  /** Conversas com status = 'em_atendimento' */
  emAtendimento: number
  /** Conversas com status = 'aguardando_cliente' */
  aguardandoCliente: number
  /** Conversas com status = 'finalizada' finalizadas hoje (atualizado_em::date = CURRENT_DATE) */
  finalizadasHoje: number
}

// ------------------------------------------------------------
// Função pública
// ------------------------------------------------------------

/**
 * Busca os 5 KPIs agregados respeitando a regra de permissão
 * de instâncias (vendedor vê só instâncias próprias + compartilhadas).
 *
 * @param orgId  ID da organização (tenant)
 * @param userId ID do usuário autenticado
 * @param cargo  Cargo do usuário (vendedor, atendimento, admin, gestor, etc)
 * @returns KPIs com os 5 contadores
 */
export async function buscarKPIsWhatsApp(
  orgId: string,
  userId: string,
  cargo: string
): Promise<KPIWhatsApp> {
  const supabase = await createClient()

  // 1) Resolver instancias permitidas
  let instanciasPermitidas: string[] | null = null
  if (cargo === 'vendedor' || cargo === 'atendimento') {
    // Mesma regra: se tem instancia propria exclusiva, usa so ela
    const { data: instanciaPropria } = await supabase
      .from('whatsapp_instances')
      .select('id')
      .eq('organization_id', orgId)
      .eq('vendedor_id', userId)
      .eq('compartilhado', false)
      .limit(1)

    if (instanciaPropria && instanciaPropria.length > 0) {
      instanciasPermitidas = instanciaPropria.map((i) => i.id as string)
    } else {
      const { data: instances } = await supabase
        .from('whatsapp_instances')
        .select('id')
        .eq('organization_id', orgId)
        .or(`vendedor_id.eq.${userId},compartilhado.eq.true`)

      instanciasPermitidas = (instances ?? []).map((i) => i.id as string)
    }
  }

  // 2) Query base
  let query = supabase
    .from('conversations')
    .select('id, status, nao_lidas, whatsapp_instance_id, arquivada_em, atualizado_em', {
      count: 'exact',
      head: false,
    })
    .eq('organization_id', orgId)
    .is('arquivada_em', null) // KPIs consideram apenas conversas ativas

  if (instanciasPermitidas !== null) {
    if (instanciasPermitidas.length === 0) {
      // Vendedor sem instancias: KPIs zerados
      return {
        abertas: 0,
        naoLidas: 0,
        emAtendimento: 0,
        aguardandoCliente: 0,
        finalizadasHoje: 0,
      }
    }
    query = query.in('whatsapp_instance_id', instanciasPermitidas)
  }

  const { data, error } = await query

  if (error) {
    console.error('[buscarKPIsWhatsApp] erro na query:', error)
    return {
      abertas: 0,
      naoLidas: 0,
      emAtendimento: 0,
      aguardandoCliente: 0,
      finalizadasHoje: 0,
    }
  }

  // 3) Calcular KPIs em memoria
  const rows = (data ?? []) as Array<{
    id: string
    status: ConversaStatus
    nao_lidas: number | null
    whatsapp_instance_id: string
    arquivada_em: string | null
    atualizado_em: string
  }>

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  let abertas = 0
  let naoLidas = 0
  let emAtendimento = 0
  let aguardandoCliente = 0
  let finalizadasHoje = 0

  for (const r of rows) {
    // Abertas = tudo que nao e finalizada
    if (r.status !== 'finalizada') {
      abertas++
    }

    // Não lidas conta apenas conversas abertas (consistente com a lista
    // principal, que exclui finalizadas).
    if (r.status !== 'finalizada' && (r.nao_lidas ?? 0) > 0) {
      naoLidas++
    }

    if (r.status === 'em_atendimento') {
      emAtendimento++
    } else if (r.status === 'aguardando_cliente') {
      aguardandoCliente++
    } else if (r.status === 'finalizada') {
      // Finalizadas hoje: compara apenas a data (ignora hora)
      const upd = new Date(r.atualizado_em)
      if (upd >= hoje) {
        finalizadasHoje++
      }
    }
  }

  return {
    abertas,
    naoLidas,
    emAtendimento,
    aguardandoCliente,
    finalizadasHoje,
  }
}
