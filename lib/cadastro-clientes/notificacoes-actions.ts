'use server'

// DEC-020 — Central de notificações in-app (genérica). Wrappers das RPCs.

import { createClient } from '@/lib/supabase/server'

export type NotificacaoUI = {
  id: string
  tipo: string
  titulo: string
  mensagem: string | null
  link: string | null
  lida: boolean
  created_at: string
}

export async function listarNotificacoes(limit = 20): Promise<{ nao_lidas: number; rows: NotificacaoUI[] }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('notificacoes_listar', { p_limit: limit })
  if (error) return { nao_lidas: 0, rows: [] }
  return data as { nao_lidas: number; rows: NotificacaoUI[] }
}

export async function marcarNotificacaoLida(id?: string): Promise<void> {
  const supabase = await createClient()
  await supabase.rpc('notificacoes_marcar_lida', { p_id: id ?? null })
}
