// Mensageria (DEC-023 · E11) — leitura para a UI. Somente consumo do que já existe:
// consultas via client RLS-aware (createClient) — as policies filtram por hub_id.
// NÃO cria RPC/índice/tabela; nenhuma escrita aqui (envio é a Server Action da E9.6).

import { createClient } from '@/lib/supabase/server'
import type { CommConversationStatus, CommMessageDirection, CommMessageStatus, CommMessageTipo } from '@/types/database'

export interface ConversaResumo {
  id: string
  status: CommConversationStatus
  unreadCount: number
  lastMessageAt: string | null
  nome: string
  telefone: string | null
  ultimaMensagem: string | null
}

export interface MensagemView {
  id: string
  direction: CommMessageDirection
  tipo: CommMessageTipo
  corpo: string | null
  status: CommMessageStatus
  createdAt: string
}

export interface ConversaDetalhe {
  id: string
  nome: string
  telefone: string | null
  status: CommConversationStatus
  mensagens: MensagemView[]
}

// Prévia textual da última mensagem. Tipos não-texto (fora do escopo de renderização)
// viram rótulo curto — a UI mínima não baixa/exibe mídia.
function previaMensagem(tipo: string, corpo: string | null): string {
  if (tipo === 'texto') return corpo ?? ''
  const rotulos: Record<string, string> = {
    imagem: '[imagem]', audio: '[áudio]', video: '[vídeo]', documento: '[documento]',
    localizacao: '[localização]', contato: '[contato]', sistema: '[sistema]',
  }
  return rotulos[tipo] ?? '[mensagem]'
}

// Lista de conversas do Hub do usuário, ordenada por last_message_at (mais recente primeiro).
export async function listarConversas(): Promise<ConversaResumo[]> {
  const supabase = await createClient()

  const { data: convData } = await supabase
    .from('communication_conversations')
    .select('id, status, unread_count, last_message_at, channel_identity_id')
    .order('last_message_at', { ascending: false, nullsFirst: false })
  const conversas = (convData ?? []) as Array<{
    id: string; status: CommConversationStatus; unread_count: number
    last_message_at: string | null; channel_identity_id: string
  }>
  if (conversas.length === 0) return []

  const identIds = [...new Set(conversas.map((c) => c.channel_identity_id))]
  const { data: identData } = await supabase
    .from('communication_channel_identities')
    .select('id, display_name, telefone, external_user_id')
    .in('id', identIds)
  const idents = new Map(
    ((identData ?? []) as Array<{ id: string; display_name: string | null; telefone: string | null; external_user_id: string }>)
      .map((i) => [i.id, i]),
  )

  // última mensagem por conversa: 1 query batelada (evita N+1), reduzida em memória.
  const convIds = conversas.map((c) => c.id)
  const { data: msgData } = await supabase
    .from('communication_messages')
    .select('conversation_id, corpo, tipo, created_at')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: false })
  const ultimaPorConversa = new Map<string, { corpo: string | null; tipo: string }>()
  for (const m of (msgData ?? []) as Array<{ conversation_id: string; corpo: string | null; tipo: string }>) {
    if (!ultimaPorConversa.has(m.conversation_id)) ultimaPorConversa.set(m.conversation_id, m)
  }

  return conversas.map((c) => {
    const ident = idents.get(c.channel_identity_id)
    const ultima = ultimaPorConversa.get(c.id)
    return {
      id: c.id,
      status: c.status,
      unreadCount: c.unread_count,
      lastMessageAt: c.last_message_at,
      nome: ident?.display_name || ident?.telefone || ident?.external_user_id || 'Sem nome',
      telefone: ident?.telefone ?? null,
      ultimaMensagem: ultima ? previaMensagem(ultima.tipo, ultima.corpo) : null,
    }
  })
}

// Detalhe de uma conversa (cabeçalho + histórico). null se não visível ao Hub do usuário (RLS).
export async function carregarConversa(id: string): Promise<ConversaDetalhe | null> {
  const supabase = await createClient()

  const { data: conv } = await supabase
    .from('communication_conversations')
    .select('id, status, channel_identity_id')
    .eq('id', id)
    .maybeSingle()
  if (!conv) return null
  const c = conv as { id: string; status: CommConversationStatus; channel_identity_id: string }

  const { data: ident } = await supabase
    .from('communication_channel_identities')
    .select('display_name, telefone, external_user_id')
    .eq('id', c.channel_identity_id)
    .maybeSingle()
  const i = (ident ?? null) as { display_name: string | null; telefone: string | null; external_user_id: string } | null

  const { data: msgData } = await supabase
    .from('communication_messages')
    .select('id, direction, tipo, corpo, status, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })
  const mensagens = ((msgData ?? []) as Array<{
    id: string; direction: CommMessageDirection; tipo: CommMessageTipo
    corpo: string | null; status: CommMessageStatus; created_at: string
  }>).map((m) => ({
    id: m.id, direction: m.direction, tipo: m.tipo, corpo: m.corpo, status: m.status, createdAt: m.created_at,
  }))

  return {
    id: c.id,
    nome: i?.display_name || i?.telefone || i?.external_user_id || 'Sem nome',
    telefone: i?.telefone ?? null,
    status: c.status,
    mensagens,
  }
}
