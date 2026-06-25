import { createClient } from '@/lib/supabase/server'
import { normalizarParaBusca, formatarTelefone } from './telefone'

/**
 * Fontes de nome para ordenar por prioridade
 */
export type NameSource =
  | 'manual'      // Nome editado manualmente no CRM
  | 'contact'     // Nome salvo no cadastro de contatos
  | 'pushname'    // pushName/profileName vindo do WhatsApp
  | 'lead'        // Nome salvo no cadastro do lead
  | 'conversation' // Nome salvo na conversa
  | 'phone'       // Telefone formatado
  | 'unknown'     // "Não identificado"

/**
 * Interface para o resultado da resolução de nome
 */
export interface ResolvedName {
  display: string        // Nome para exibir
  source: NameSource     // Fonte do nome
  original?: string      // Nome original (se não for telefone)
  phone?: string         // Telefone formatado
  isPhoneFallback: boolean // Se usou telefone como fallback
}

/**
 * Prioridade de fontes de nome:
 * 1. Nome editado manualmente no CRM (lead.nome ou contato.nome)
 * 2. Nome salvo no cadastro do contato
 * 3. pushName/profileName vindo do WhatsApp
 * 4. Nome salvo no cadastro do lead
 * 5. Nome salvo na conversa (se existir campo)
 * 6. Telefone formatado
 * 7. "Não identificado"
 */
export async function resolverNomeContato(
  telefone: string,
  organizationId: string,
  options?: {
    leadId?: string
    pushName?: string
    conversationId?: string
  }
): Promise<ResolvedName> {
  const supabase = await createClient()

  // Normalizar telefone para busca
  const telefoneNormalizado = normalizarParaBusca(telefone)
  const telefoneFormatado = formatarTelefone(telefone)

  // 1. Verificar se é um telefone inválido
  if (!telefone || telefone.length < 8) {
    return {
      display: 'Telefone inválido',
      source: 'unknown',
      phone: telefoneFormatado,
      isPhoneFallback: false
    }
  }

  // 2. Buscar lead existente (prioridade: nome manual)
  if (options?.leadId) {
    const { data: lead } = await supabase
      .from('leads')
      .select('nome, telefone')
      .eq('id', options.leadId)
      .eq('organization_id', organizationId)
      .single()

    if (lead?.nome && !/^\d{8,15}$/.test(lead.nome.replace(/\D/g, ''))) {
      return {
        display: lead.nome.trim(),
        source: 'manual',
        original: lead.nome,
        phone: telefoneFormatado,
        isPhoneFallback: false
      }
    }
  }

  // 3. Buscar contato existente
  const { data: contato } = await supabase
    .from('contacts')
    .select('nome, telefone')
    .eq('organization_id', organizationId)
    .or(`telefone.ilike.%${telefoneNormalizado}%,telefone.ilike.%${telefoneNormalizado.slice(0, 2)}9${telefoneNormalizado.slice(2)}%`)
    .limit(1)
    .single()

  if (contato?.nome && !/^\d{8,15}$/.test(contato.nome.replace(/\D/g, ''))) {
    return {
      display: contato.nome.trim(),
      source: 'contact',
      original: contato.nome,
      phone: telefoneFormatado,
      isPhoneFallback: false
    }
  }

  // 4. Usar pushName do WhatsApp (se fornecido)
  if (options?.pushName && options.pushName.trim() && !/^\d{8,15}$/.test(options.pushName.replace(/\D/g, ''))) {
    return {
      display: options.pushName.trim(),
      source: 'pushname',
      original: options.pushName,
      phone: telefoneFormatado,
      isPhoneFallback: false
    }
  }

  // 5. Buscar lead por telefone (se não foi fornecido leadId)
  if (!options?.leadId) {
    const { data: leadPorTelefone } = await supabase
      .from('leads')
      .select('nome, telefone')
      .eq('organization_id', organizationId)
      .or(`telefone.ilike.%${telefoneNormalizado}%,telefone.ilike.%${telefoneNormalizado.slice(0, 2)}9${telefoneNormalizado.slice(2)}%`)
      .limit(1)
      .single()

    if (leadPorTelefone?.nome && !/^\d{8,15}$/.test(leadPorTelefone.nome.replace(/\D/g, ''))) {
      return {
        display: leadPorTelefone.nome.trim(),
        source: 'lead',
        original: leadPorTelefone.nome,
        phone: telefoneFormatado,
        isPhoneFallback: false
      }
    }
  }

  // 6. Buscar conversa por ID (se fornecido) para pegar nome salvo
  if (options?.conversationId) {
    const { data: conversa } = await supabase
      .from('conversations')
      .select('nome_contato')
      .eq('id', options.conversationId)
      .eq('organization_id', organizationId)
      .single()

    if (conversa?.nome_contato && conversa.nome_contato.trim() && !/^\d{8,15}$/.test(conversa.nome_contato.replace(/\D/g, ''))) {
      const nomeContato = conversa.nome_contato
      return {
        display: nomeContato.trim(),
        source: 'conversation',
        original: nomeContato,
        phone: telefoneFormatado,
        isPhoneFallback: false
      }
    }
  }

  // 7. Usar telefone formatado como fallback
  if (telefoneFormatado) {
    return {
      display: `Contato ${telefoneFormatado}`,
      source: 'phone',
      phone: telefoneFormatado,
      isPhoneFallback: true
    }
  }

  // 8. Último recurso: "Não identificado"
  return {
    display: 'Não identificado',
    source: 'unknown',
    phone: telefoneFormatado,
    isPhoneFallback: false
  }
}

/**
 * Função versátil para obter nome de contato
 * Pode ser usada em server actions ou componentes
 */
export async function obterNomeContato(
  telefone: string,
  organizationId: string,
  context?: {
    leadId?: string
    pushName?: string
    conversationId?: string
  }
): Promise<string> {
  const resolved = await resolverNomeContato(telefone, organizationId, context)
  return resolved.display
}

/**
 * Função para backfill de nomes em conversas existentes
 * Atualiza conversas que têm "Não identificado" ou nomes genéricos
 */
export async function backfillNomesConversas(organizationId: string): Promise<{ updated: number; errors: string[] }> {
  const supabase = await createClient()
  const errors: string[] = []
  let updated = 0

  try {
    // Buscar conversas com nomes genéricos ou vazios
    const { data: conversas } = await supabase
      .from('conversations')
      .select(`
        id,
        telefone_externo,
        nome_contato,
        lead_id,
        whatsapp_push_name,
        lead:leads!lead_id(nome, telefone)
      `)
      .eq('organization_id', organizationId)
      .or(
        `nome_contato.is.null,nome_contato.eq.'Não identificado',` +
        `nome_contato.eq.'Contato WhatsApp',` +
        `nome_contato.ilike.'%(%'` // Telefones formatados como fallback
      )
      .limit(100)

    if (!conversas || conversas.length === 0) {
      return { updated: 0, errors }
    }

    for (const conversa of conversas) {
      try {
        // Usar whatsapp_push_name que já está na conversa
        const pushName = (conversa as any).whatsapp_push_name || ''

        // Resolver nome
        const resolved = await resolverNomeContato(
          conversa.telefone_externo,
          organizationId,
          {
            leadId: conversa.lead_id,
            pushName
          }
        )

        // Se o nome for diferente do atual, atualizar
        // NOTA: O campo nome_contato será adicionado pela migration 040
        // Atualmente ignorado para não quebrar o app
        const nomeAtual = conversa.nome_contato || ''
        if (false && resolved.display !== nomeAtual && resolved.source !== 'unknown') {
          const { error } = await supabase
            .from('conversations')
            .update({
              nome_contato: resolved.display,
              name_source: resolved.source,
              atualizado_em: new Date().toISOString()
            })
            .eq('id', conversa.id)

          if (!error) {
            updated++
          } else {
            errors.push(`Conversa ${conversa.id}: ${error?.message || 'Erro desconhecido'}`)
          }
        }
      } catch (err) {
        errors.push(`Conversa ${conversa.id}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
      }
    }
  } catch (err) {
    errors.push(`Erro geral: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
  }

  return { updated, errors }
}

/**
 * Função para normalizar e comparar telefones
 * Evita duplicidade de contatos pelo mesmo número
 */
export function normalizarTelefoneParaComparacao(jid: string): string {
  // Remover sufixos do WhatsApp
  let normalizado = jid
    .replace(/@s\.whatsapp\.net$/, '')  // Suporte pessoal
    .replace(/@c\.us$/, '')             // Contato EUA
    .replace(/@g\.us$/, '')             // Grupo (ignorado)
    .replace(/:\d+$/, '')              // Device ID

  // Remover caracteres não numéricos
  normalizado = normalizado.replace(/\D/g, '')

  // Remover DDI 55 se presente
  if (normalizado.startsWith('55') && normalizado.length >= 12) {
    normalizado = normalizado.slice(2)
  }

  return normalizado
}