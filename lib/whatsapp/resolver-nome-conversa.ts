// ============================================================
// Resolvedor de nome para Conversas WhatsApp
// ============================================================
// Criado na Sub-fase 2.1 (Opcao C) - NAO altera
// lib/nome-contato.ts (que tem logica diferente).
//
// Regra de negocio oficial:
//   1. manual      - is_name_manually_edited = true
//                     (preservado, NAO sobrescrito pelo webhook)
//   2. contact     - contacts.nome (por telefone)
//   3. lead        - leads.nome (por id ou por telefone)
//   4. pushname    - whatsapp_push_name vindo da Evolution API
//   5. phone       - telefone formatado
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { normalizarParaBusca, formatarTelefone } from '@/lib/telefone'

// ------------------------------------------------------------
// Tipos publicos
// ------------------------------------------------------------

export type NameSource = 'manual' | 'contact' | 'lead' | 'pushname' | 'phone'

export type ResolvedNameConversa = {
  /** Texto a ser exibido na UI */
  display: string
  /** Origem oficial do nome */
  source: NameSource
  /** Telefone formatado (sempre presente) */
  phone: string
  /** true se source === 'phone' */
  isPhoneFallback: boolean
}

export type ResolverNomeConversaInput = {
  orgId: string
  telefone: string
  leadId?: string | null
  pushName?: string | null
  conversationId?: string
}

// ------------------------------------------------------------
// Helpers internos
// ------------------------------------------------------------

/**
 * Nome e valido: nao vazio, nao puramente numerico (8-15 digitos).
 * Essa protecao evita usar "5511999998888" como nome.
 */
function isValidName(n: string | null | undefined): n is string {
  if (!n) return false
  const trimmed = n.trim()
  if (trimmed === '') return false
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length >= 8 && digits.length <= 15 && digits === trimmed.replace(/\D/g, '')) {
    // se for puramente numerico com 8+ digitos, NAO e' um nome valido
    return false
  }
  return true
}

/**
 * Constroi as variacoes do telefone para a busca ILIKE.
 * Inclui o telefone puro e a variante com 9 extra (celular BR).
 */
function buildTelefonePatterns(telefoneNormalizado: string): string[] {
  const patterns = [telefoneNormalizado]
  // Variante com 9o digito (celular BR: 11 -> 119, 21 -> 219, etc)
  if (telefoneNormalizado.length >= 10) {
    const ddd = telefoneNormalizado.slice(0, 2)
    const resto = telefoneNormalizado.slice(2)
    patterns.push(`${ddd}9${resto}`)
  }
  return patterns
}

// ------------------------------------------------------------
// Funcao publica
// ------------------------------------------------------------

/**
 * Resolve o nome de exibicao de uma conversa, respeitando
 * a regra de negocio oficial (manual > contact > lead > pushname > phone).
 *
 * NAO sobrescreve nomes manuais (is_name_manually_edited = true).
 *
 * @example
 *   const nome = await resolverNomeConversa({
 *     orgId: 'org-uuid',
 *     telefone: '5511999998888',
 *     leadId: 'lead-uuid',
 *     pushName: 'Joao Silva',
 *     conversationId: 'conv-uuid',
 *   })
 *   // => { display: 'Joao Silva', source: 'pushname', phone: '+55 (11) 99999-8888', isPhoneFallback: false }
 */
export async function resolverNomeConversa(
  input: ResolverNomeConversaInput
): Promise<ResolvedNameConversa> {
  const { orgId, telefone, leadId, pushName, conversationId } = input

  const telefoneNormalizado = normalizarParaBusca(telefone)
  const telefoneFormatado = formatarTelefone(telefone)

  const supabase = await createClient()

  // ===========================================================
  // 1) MANUAL - preservado se is_name_manually_edited = true
  // ===========================================================
  if (conversationId) {
    const { data: conv } = await supabase
      .from('conversations')
      .select('nome_contato, is_name_manually_edited')
      .eq('id', conversationId)
      .eq('organization_id', orgId)
      .maybeSingle()

    if (conv?.is_name_manually_edited && isValidName(conv.nome_contato)) {
      return {
        display: conv.nome_contato!.trim(),
        source: 'manual',
        phone: telefoneFormatado,
        isPhoneFallback: false,
      }
    }
  }

  // ===========================================================
  // 2) CONTACT - nome do contato (por telefone)
  // ===========================================================
  const patterns = buildTelefonePatterns(telefoneNormalizado)
  const orFilter = patterns.map((p) => `telefone.ilike.%${p}%`).join(',')

  const { data: contato } = await supabase
    .from('contacts')
    .select('nome')
    .eq('organization_id', orgId)
    .or(orFilter)
    .limit(1)
    .maybeSingle()

  if (isValidName(contato?.nome)) {
    return {
      display: contato.nome!.trim(),
      source: 'contact',
      phone: telefoneFormatado,
      isPhoneFallback: false,
    }
  }

  // ===========================================================
  // 3) LEAD - nome do lead (por id primeiro, depois por telefone)
  // ===========================================================
  let leadNome: string | null = null

  if (leadId) {
    const { data: lead } = await supabase
      .from('leads')
      .select('nome')
      .eq('id', leadId)
      .eq('organization_id', orgId)
      .maybeSingle()
    if (isValidName(lead?.nome)) {
      leadNome = lead!.nome!.trim()
    }
  }

  if (!leadNome) {
    const { data: lead } = await supabase
      .from('leads')
      .select('nome')
      .eq('organization_id', orgId)
      .or(orFilter)
      .limit(1)
      .maybeSingle()
    if (isValidName(lead?.nome)) {
      leadNome = lead!.nome!.trim()
    }
  }

  if (leadNome) {
    return {
      display: leadNome,
      source: 'lead',
      phone: telefoneFormatado,
      isPhoneFallback: false,
    }
  }

  // ===========================================================
  // 4) PUSHNAME - nome vindo do WhatsApp
  // ===========================================================
  if (isValidName(pushName)) {
    return {
      display: pushName!.trim(),
      source: 'pushname',
      phone: telefoneFormatado,
      isPhoneFallback: false,
    }
  }

  // ===========================================================
  // 5) PHONE - telefone formatado (fallback final)
  // ===========================================================
  return {
    display: telefoneFormatado ? `Contato ${telefoneFormatado}` : 'Contato',
    source: 'phone',
    phone: telefoneFormatado,
    isPhoneFallback: true,
  }
}
