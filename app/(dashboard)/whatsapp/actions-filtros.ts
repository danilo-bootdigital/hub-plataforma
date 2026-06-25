'use server'

// ============================================================
// Server Actions auxiliares para filtros da Central WhatsApp
// ============================================================
// Sub-fase 2.1: Camada de dados (Fase 2)
// Server Actions minimalistas - apenas para quando filtros
// precisam persistir/limpar (ex: arquivar conversa).
// A navegacao por filtros usa router.replace do client.
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { ConversaStatus } from '@/types/database'
import { revalidatePath } from 'next/cache'

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

async function getPerfilAutenticado() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  return { supabase, perfil, userId: user.id }
}

// ------------------------------------------------------------
// Acoes de arquivamento
// ------------------------------------------------------------

/**
 * Arquiva uma conversa (soft delete).
 * Seta arquivada_em = now() na conversa.
 */
export async function arquivarConversa(conversaId: string) {
  const { supabase, perfil } = await getPerfilAutenticado()

  const { error } = await supabase
    .from('conversations')
    .update({ arquivada_em: new Date().toISOString() })
    .eq('id', conversaId)
    .eq('organization_id', perfil.organization_id)

  if (error) {
    console.error('[arquivarConversa] erro:', error)
    throw new Error('Falha ao arquivar conversa')
  }

  revalidatePath('/whatsapp')
}

/**
 * Reativa (desarquiva) uma conversa.
 * Seta arquivada_em = NULL.
 */
export async function desarquivarConversa(conversaId: string) {
  const { supabase, perfil } = await getPerfilAutenticado()

  const { error } = await supabase
    .from('conversations')
    .update({ arquivada_em: null })
    .eq('id', conversaId)
    .eq('organization_id', perfil.organization_id)

  if (error) {
    console.error('[desarquivarConversa] erro:', error)
    throw new Error('Falha ao reativar conversa')
  }

  revalidatePath('/whatsapp')
}

/**
 * Zera o contador de nao_lidas de uma conversa
 * (usado quando o usuario abre a conversa).
 */
export async function marcarConversaComoLida(conversaId: string) {
  const { supabase, perfil } = await getPerfilAutenticado()

  const { error } = await supabase
    .from('conversations')
    .update({ nao_lidas: 0 })
    .eq('id', conversaId)
    .eq('organization_id', perfil.organization_id)

  if (error) {
    console.error('[marcarConversaComoLida] erro:', error)
    // Nao lanca erro - e' uma acao "best-effort"
  }

  revalidatePath('/whatsapp')
}

// ------------------------------------------------------------
// Acoes de mudanca de status
// ------------------------------------------------------------

/**
 * Atualiza o status de uma conversa.
 */
export async function atualizarStatusConversa(
  conversaId: string,
  novoStatus: ConversaStatus
) {
  const { supabase, perfil } = await getPerfilAutenticado()

  const { error } = await supabase
    .from('conversations')
    .update({ status: novoStatus, atualizado_em: new Date().toISOString() })
    .eq('id', conversaId)
    .eq('organization_id', perfil.organization_id)

  if (error) {
    console.error('[atualizarStatusConversa] erro:', error)
    throw new Error('Falha ao atualizar status')
  }

  revalidatePath('/whatsapp')
}
