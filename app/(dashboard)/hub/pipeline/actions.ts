'use server'

// Pipeline MVP (Kanban do Hub). Action ÚNICA de escrita: move o orçamento de
// etapa OPERACIONAL (pipeline_status). Segurança 100% no servidor — nunca confia
// no front. O `status` COMERCIAL do orçamento NÃO é tocado aqui.
//
// Regras (DEC-015 + escopo por hub_id):
//  - Indústria (admin/gestor) não passa (bloqueada no middleware; reforço aqui).
//  - Proprietário do Hub move qualquer orçamento do próprio hub_id.
//  - Assistente só move orçamento do próprio hub_id atribuído a ele (responsavel_id).
//  - newStatus tem de ser uma das 7 etapas oficiais.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { ehEtapaValida, rotuloEtapa, type PipelineStatus } from '@/lib/pipeline/etapas'
import { registrarEventoOrcamento } from '@/lib/orcamentos/eventos'

export type ResultadoMover = { ok: true } | { ok: false; erro: string }

export async function updateQuotePipelineStatus(
  quoteId: string,
  newStatus: string,
): Promise<ResultadoMover> {
  // 1) Usuário autenticado.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, erro: 'Não autenticado.' }

  const { data: perfil } = await supabase
    .from('profiles').select('id, organization_id, cargo, hub_id').eq('id', user.id).single()
  if (!perfil) return { ok: false, erro: 'Perfil não encontrado.' }

  // 2) Só perfis do Hub. A Indústria já é barrada no middleware; reforço server-side.
  if (perfil.cargo !== 'proprietario_hub' && perfil.cargo !== 'assistente') {
    return { ok: false, erro: 'Perfil sem acesso ao Pipeline.' }
  }
  if (!perfil.hub_id) return { ok: false, erro: 'Usuário sem Hub vinculado.' }

  // 3) Status válido (uma das 7 etapas oficiais).
  if (!ehEtapaValida(newStatus)) return { ok: false, erro: 'Etapa inválida.' }
  const destino = newStatus as PipelineStatus

  // 4) Orçamento existe e pertence ao Hub/organização do usuário.
  const admin = createAdminClient()
  const { data: quote } = await admin
    .from('quotes')
    .select('id, hub_id, organization_id, responsavel_id, pipeline_status')
    .eq('id', quoteId)
    .maybeSingle()
  if (!quote) return { ok: false, erro: 'Orçamento não encontrado.' }
  if (quote.organization_id !== perfil.organization_id || quote.hub_id !== perfil.hub_id) {
    return { ok: false, erro: 'Orçamento fora do seu Hub.' }
  }

  // 5) Permissão de movimentação por perfil.
  if (perfil.cargo === 'assistente' && quote.responsavel_id !== perfil.id) {
    return { ok: false, erro: 'Você só pode mover orçamentos atribuídos a você.' }
  }

  // Sem mudança real → nada a fazer (idempotente).
  const anterior = (quote.pipeline_status ?? 'novo_orcamento') as PipelineStatus
  if (anterior === destino) return { ok: true }

  // 6) Persiste a nova etapa + data + autor.
  const { error } = await admin
    .from('quotes')
    .update({
      pipeline_status: destino,
      pipeline_moved_at: new Date().toISOString(),
      pipeline_moved_by: perfil.id,
    })
    .eq('id', quote.id)
  if (error) return { ok: false, erro: 'Falha ao atualizar o orçamento.' }

  // Auditoria (trilha append-only existente). Nunca lança.
  await registrarEventoOrcamento(quote.id, {
    tipo: 'status_alterado',
    descricao: `Pipeline: ${rotuloEtapa(anterior)} → ${rotuloEtapa(destino)}`,
    valorAnterior: anterior,
    valorNovo: destino,
    origem: 'hub_form',
    metadata: { campo: 'pipeline_status' },
  })

  revalidatePath('/hub/pipeline')
  return { ok: true }
}
