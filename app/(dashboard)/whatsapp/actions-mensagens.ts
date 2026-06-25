'use server'

// ============================================================
// Carregamento leve e paginado de mensagens de UMA conversa.
// Usado pelo painel direito (ThreadMensagens) para trocar de
// conversa de forma instantânea, sem re-renderizar a página
// inteira nem recarregar lista/KPIs.
// ============================================================
// - Seleciona SOMENTE as colunas necessárias (sem joins).
// - Pagina em blocos de PAGINA mensagens (mais recentes primeiro
//   no banco, devolvidas em ordem cronológica para a UI).
// - `before`: cursor para carregar mensagens ANTIGAS (scroll-up).
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PAGINA_MENSAGENS, type MensagemDTO } from '@/lib/whatsapp/mensagens-tipos'

async function orgDoUsuario() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  if (!perfil) redirect('/login')
  return { supabase, orgId: perfil.organization_id as string }
}

/**
 * Carrega um bloco de mensagens da conversa.
 * @param conversaId id da conversa
 * @param before     se informado, retorna mensagens ANTERIORES a esse timestamp
 *                    (paginação para cima); caso contrário, as mais recentes.
 */
export async function carregarMensagensConversa(
  conversaId: string,
  before?: string | null,
): Promise<{ mensagens: MensagemDTO[]; temMais: boolean }> {
  const { supabase, orgId } = await orgDoUsuario()

  let query = supabase
    .from('messages')
    .select('id, direcao, conteudo, tipo_midia, url_midia, enviado_em')
    .eq('conversation_id', conversaId)
    .eq('organization_id', orgId)
    .order('enviado_em', { ascending: false })
    .limit(PAGINA_MENSAGENS)

  if (before) {
    query = query.lt('enviado_em', before)
  }

  const { data, error } = await query
  if (error) {
    console.error('[carregarMensagensConversa] erro:', error.message)
    return { mensagens: [], temMais: false }
  }

  const linhas = (data ?? []) as MensagemDTO[]
  const temMais = linhas.length === PAGINA_MENSAGENS

  // Banco devolve desc (recentes primeiro); a UI espera ordem cronológica.
  return { mensagens: linhas.slice().reverse(), temMais }
}
