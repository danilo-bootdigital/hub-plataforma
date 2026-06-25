// ============================================================
// Queries de Conversas para a Central de Atendimento WhatsApp
// ============================================================
// Sub-fase 2.1: Camada de dados (Fase 2)
// Suporta filtros via URL search params (status, busca, etc.)
// Respeita regra de permissão: vendedor vê só instâncias próprias
//   + compartilhadas; se tem instância própria, vê SÓ ela.
// ============================================================

import { createClient } from '@/lib/supabase/server'
import type { Conversation, ConversaStatus, WhatsappInstance, Profile } from '@/types/database'

// ------------------------------------------------------------
// Tipos públicos
// ------------------------------------------------------------

/**
 * Filtros aceitos pela query de conversas.
 * Todos os campos são opcionais; combinações são permitidas.
 */
export type FiltrosConversa = {
  busca?: string
  status?: ConversaStatus | null
  responsavelId?: string | null
  tagIds?: string[]
  instanciaId?: string | null
  somenteNaoLidas?: boolean
  semResponsavel?: boolean
  comLead?: boolean | null
  comContato?: boolean | null
  arquivada?: boolean
}

/**
 * Conversa resumida para a lista da Central.
 * Inclui relações desnormalizadas (responsavel, lead, contato, instancia)
 * e tags agregadas.
 */
export type ConversaResumo = Pick<
  Conversation,
  | 'id'
  | 'organization_id'
  | 'whatsapp_instance_id'
  | 'lead_id'
  | 'contato_id'
  | 'telefone_externo'
  | 'status'
  | 'responsavel_id'
  | 'ultima_mensagem_em'
  | 'nao_lidas'
  | 'arquivada_em'
  | 'nome_contato'
  | 'name_source'
  | 'criado_em'
  | 'atualizado_em'
> & {
  responsavel: Pick<Profile, 'id' | 'nome'> | null
  lead: { id: string; nome: string } | null
  contato: { id: string; nome: string } | null
  instancia: Pick<WhatsappInstance, 'id' | 'nome' | 'status_conexao'> | null
  tags: Array<{ id: string; nome: string; cor: string }>
}

export type ListarConversasOptions = {
  limite?: number
  offset?: number
}

// ------------------------------------------------------------
// Helpers internos
// ------------------------------------------------------------

/**
 * Aplica a regra de permissão de instâncias:
 * - admin/gestor: veem todas
 * - vendedor/atendimento: veem instancias onde vendedor_id = userId OU compartilhado = true
 * - vendedor com instancia propria (compartilhado=false): vei SÓ a dele
 */
async function resolverInstanciasPermitidas(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  userId: string,
  cargo: string
): Promise<string[] | null> {
  // admin e gestor: sem restricao
  if (cargo !== 'vendedor' && cargo !== 'atendimento') {
    return null // null = sem filtro
  }

  // Verifica se tem instancia PROPRIA (compartilhado = false)
  const { data: instanciaPropria } = await supabase
    .from('whatsapp_instances')
    .select('id')
    .eq('organization_id', orgId)
    .eq('vendedor_id', userId)
    .eq('compartilhado', false)
    .limit(1)

  // Se tem instancia propria exclusiva, retorna SÓ ela
  if (instanciaPropria && instanciaPropria.length > 0) {
    return instanciaPropria.map((i) => i.id as string)
  }

  // Senao, retorna as compartilhadas + as marcadas para ele
  const { data: instances } = await supabase
    .from('whatsapp_instances')
    .select('id')
    .eq('organization_id', orgId)
    .or(`vendedor_id.eq.${userId},compartilhado.eq.true`)

  return (instances ?? []).map((i) => i.id as string)
}

// ------------------------------------------------------------
// Funções públicas
// ------------------------------------------------------------

/**
 * Lista conversas com filtros aplicados no servidor.
 * Retorna um array vazio se o usuário não tem permissão
 * para ver nenhuma instância.
 * Retorna debug info junto com o resultado.
 */
export async function listarConversas(
  orgId: string,
  userId: string,
  cargo: string,
  filtros: FiltrosConversa = {},
  options: ListarConversasOptions = {}
): Promise<{ conversas: ConversaResumo[]; debug: { minCount: number; queryError: string | null } }> {
  const supabase = await createClient()
  const { limite = 100, offset = 0 } = options

  // 1) Regra de permissão de instâncias
  const instanciasPermitidas = await resolverInstanciasPermitidas(
    supabase,
    orgId,
    userId,
    cargo
  )

  // Se vendedor nao tem nenhuma instancia, retorna vazio
  if (instanciasPermitidas !== null && instanciasPermitidas.length === 0) {
    return { conversas: [], debug: { minCount: 0, queryError: null } }
  }

  // 2) Query base
  let query = supabase
    .from('conversations')
    .select(
      `
      id, organization_id, whatsapp_instance_id, lead_id, contato_id,
      telefone_externo, status, responsavel_id, ultima_mensagem_em,
      nao_lidas, arquivada_em, nome_contato, name_source,
      criado_em, atualizado_em,
      responsavel:profiles!conversations_responsavel_id_fkey ( id, nome ),
      lead:leads!conversations_lead_id_fkey ( id, nome ),
      contato:contacts!conversations_contato_id_fkey ( id, nome ),
      instancia:whatsapp_instances!conversations_whatsapp_instance_id_fkey ( id, nome, status_conexao ),
      conversation_tag_links (
        tag:conversation_tags ( id, nome, cor )
      )
      `
    )
    .eq('organization_id', orgId)
    .order('ultima_mensagem_em', { ascending: false, nullsFirst: false })
    .range(offset, offset + limite - 1)

  // 3) Aplicar permissão de instâncias
  if (instanciasPermitidas !== null) {
    query = query.in('whatsapp_instance_id', instanciasPermitidas)
  }

  // 4) Aplicar filtros
  if (filtros.instanciaId) {
    query = query.eq('whatsapp_instance_id', filtros.instanciaId)
  }

  if (filtros.status) {
    // Filtro explícito (ex.: "Finalizadas" usa status = 'finalizada')
    query = query.eq('status', filtros.status)
  } else {
    // Lista principal (chips "Todas"/"Não lidas") = apenas conversas
    // abertas/ativas. Conversas finalizadas só aparecem no filtro
    // dedicado. Mantém a lista consistente com kpis.abertas.
    query = query.neq('status', 'finalizada')
  }

  if (filtros.responsavelId !== undefined && filtros.responsavelId !== null) {
    query = query.eq('responsavel_id', filtros.responsavelId)
  } else if (filtros.semResponsavel) {
    query = query.is('responsavel_id', null)
  }

  if (filtros.somenteNaoLidas) {
    query = query.gt('nao_lidas', 0)
  }

  if (filtros.comLead === true) {
    query = query.not('lead_id', 'is', null)
  } else if (filtros.comLead === false) {
    query = query.is('lead_id', null)
  }

  if (filtros.comContato === true) {
    query = query.not('contato_id', 'is', null)
  } else if (filtros.comContato === false) {
    query = query.is('contato_id', null)
  }

  // Arquivada: padrao e NAO arquivada (NULL)
  if (filtros.arquivada === true) {
    query = query.not('arquivada_em', 'is', null)
  } else {
    query = query.is('arquivada_em', null)
  }

  // Busca textual: nome_contato OR lead.nome OR contato.nome OR telefone
  if (filtros.busca && filtros.busca.trim().length > 0) {
    const termo = `%${filtros.busca.trim()}%`
    // OR em colunas de tabelas relacionadas exige filtro extra
    // Aqui filtramos por nome_contato e telefone (campos diretos da conversa)
    query = query.or(
      `nome_contato.ilike.${termo},telefone_externo.ilike.${termo}`
    )
  }

  // 5) Filtrar por tags (in-memory apos query se tagIds presente)
  const { data, error } = await query

  if (error) {
    console.error('[listarConversas] erro na query:', error)
  }

  let resultado = (data ?? []) as unknown as ConversaResumo[]

  // Filtro de tags (client-side apos JOIN, pois Supabase
  // não suporta filter-by-array-relacionado em query unica)
  if (filtros.tagIds && filtros.tagIds.length > 0) {
    resultado = resultado.filter((c) => {
      const tagIdsDaConversa = c.tags?.map((t) => t.id) ?? []
      return filtros.tagIds!.some((id) => tagIdsDaConversa.includes(id))
    })
  }

  // Aplicar regra de prioridade de nomes
  resultado = resultado.map((c) => {
    let nomeFinal: string

    // 1. Se nome foi editado manualmente, usar nome_contato
    if (c.name_source === 'manual' && c.nome_contato) {
      nomeFinal = c.nome_contato
    }
    // 2. Se existe contato, usar nome do contato
    else if (c.contato?.nome) {
      nomeFinal = c.contato.nome
    }
    // 3. Se existe lead, usar nome do lead
    else if (c.lead?.nome) {
      nomeFinal = c.lead.nome
    }
    // 4. Se nome_contato existe (do WhatsApp), usar ele
    else if (c.nome_contato) {
      nomeFinal = c.nome_contato
    }
    // 5. Último recurso: telefone
    else {
      nomeFinal = c.telefone_externo
    }

    return { ...c, nome_contato: nomeFinal }
  })

  return { conversas: resultado, debug: { minCount: 0, queryError: error?.message ?? null } }
}
