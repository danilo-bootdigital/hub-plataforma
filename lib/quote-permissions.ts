import type { QuoteStatus, UserRole } from '@/types/database'

/**
 * Verifica se um usuário pode editar um orçamento.
 *
 * Regras:
 * - Admin/Gestor: pode editar em qualquer status, exceto quando já convertido em pedido
 * - Vendedor responsável: pode editar apenas rascunho ou rejeitado_internamente
 * - Vendedor não responsável: não pode editar
 * - Atendimento: não pode editar
 *
 * @param params - Parâmetros de verificação
 * @param params.quoteStatus - Status atual do orçamento
 * @param params.userRole - Cargo do usuário atual
 * @param params.quoteOwnerId - ID do responsável pelo orçamento
 * @param params.currentUserId - ID do usuário atual
 * @param params.hasOrder - Se o orçamento já foi convertido em pedido
 * @returns true se o usuário pode editar o orçamento
 */
export function canEditQuote({
  quoteStatus,
  userRole,
  quoteOwnerId,
  currentUserId,
  hasOrder = false,
}: {
  quoteStatus: QuoteStatus
  userRole: UserRole
  quoteOwnerId: string
  currentUserId: string
  hasOrder?: boolean
}): boolean {
  // Orçamentos já convertidos em pedido não podem ser editados
  if (hasOrder) {
    return false
  }

  // Admin e Gestor podem editar qualquer orçamento (exceto convertidos)
  if (userRole === 'admin' || userRole === 'gestor') {
    return true
  }

  // Atendimento não pode editar orçamentos
  if (userRole === 'atendimento') {
    return false
  }

  // Vendedor: só pode editar se for o responsável
  if (userRole === 'vendedor') {
    const isOwner = quoteOwnerId === currentUserId

    if (!isOwner) {
      return false
    }

    // Vendedor responsável: só pode editar rascunho ou rejeitado internamente
    return quoteStatus === 'rascunho' || quoteStatus === 'rejeitado_internamente'
  }

  // Financeiro e Suporte: não podem editar (regras específicas não definidas)
  return false
}
