'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const MODOS = ['ABERTA', 'DISTRIBUIDA'] as const

// Apenas o Proprietário do Hub configura as Carteiras autorizadas AO SEU Hub.
async function getProprietario() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo, hub_id')
    .eq('id', user.id)
    .single()
  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'proprietario_hub') {
    throw new Error('Apenas o Proprietário do Hub pode configurar Carteiras.')
  }
  if (!perfil.hub_id) {
    throw new Error('Você ainda não está vinculado a um Hub.')
  }
  return { supabase, perfil }
}

async function registrarAuditoria(
  supabase: Awaited<ReturnType<typeof createClient>>,
  perfil: { id: string; organization_id: string },
  acao: string,
  registroId: string,
  anteriores: Record<string, unknown> | null,
  novos: Record<string, unknown> | null
) {
  await supabase.from('audit_logs').insert({
    organization_id: perfil.organization_id,
    usuario_id: perfil.id,
    acao,
    tabela_afetada: 'carteiras',
    registro_id: registroId,
    dados_anteriores: anteriores,
    dados_novos: novos,
  })
}

// Define o modo operacional (ABERTA/DISTRIBUIDA) e o responsável da Carteira do Hub.
// ABERTA  -> responsavel_id = null.
// DISTRIBUIDA -> responsavel_id obrigatório (Assistente ativo do mesmo Hub).
export async function definirModoCarteira(
  carteiraId: string,
  modo: string,
  responsavelId: string | null
) {
  const { supabase, perfil } = await getProprietario()

  if (!(MODOS as readonly string[]).includes(modo)) throw new Error('Modo inválido.')

  // A Carteira precisa estar autorizada ao Hub do Proprietário.
  const { data: carteira } = await supabase
    .from('carteiras')
    .select('id, modo, responsavel_id, hub_id')
    .eq('id', carteiraId)
    .single()
  if (!carteira || carteira.hub_id !== perfil.hub_id) {
    throw new Error('Carteira não autorizada ao seu Hub.')
  }

  let responsavelFinal: string | null = null
  if (modo === 'DISTRIBUIDA') {
    if (!responsavelId) throw new Error('Selecione um Assistente responsável.')
    const { data: assistente } = await supabase
      .from('profiles')
      .select('id, cargo, ativo, hub_id')
      .eq('id', responsavelId)
      .single()
    if (!assistente || assistente.cargo !== 'assistente' || !assistente.ativo || assistente.hub_id !== perfil.hub_id) {
      throw new Error('Responsável inválido (precisa ser um Assistente ativo do seu Hub).')
    }
    responsavelFinal = responsavelId
  }
  // ABERTA mantém responsavelFinal = null (limpa o responsável).

  const prevModo = carteira.modo
  const prevResp: string | null = carteira.responsavel_id ?? null

  const { error } = await supabase
    .from('carteiras')
    .update({ modo, responsavel_id: responsavelFinal, atualizado_em: new Date().toISOString() })
    .eq('id', carteiraId)
  if (error) throw new Error(`Erro ao configurar Carteira: ${error.message}`)

  if (modo !== prevModo) {
    await registrarAuditoria(supabase, perfil, 'ALTERACAO_MODO_CARTEIRA_HUB', carteiraId, { modo: prevModo }, { modo })
  }
  if (responsavelFinal !== prevResp) {
    await registrarAuditoria(supabase, perfil, 'ALTERACAO_RESPONSAVEL_CARTEIRA_HUB', carteiraId, { responsavel_id: prevResp }, { responsavel_id: responsavelFinal })
  }
  revalidatePath('/hub/carteiras')
}
