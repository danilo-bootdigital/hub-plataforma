import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Fase T-1 — Rastreamento do Orçamento. Helper ÚNICO e server-side para registrar
// eventos em quote_events (append-only). Regras:
// - só roda no servidor (import 'server-only');
// - hub_id/organization_id SEMPRE derivados do orçamento (fonte de verdade);
// - registra ator_id + ator_cargo;
// - ignora evento de "mudança" quando valor_anterior == valor_novo (sem mudança real);
// - NUNCA lança: falha de rastreamento não pode quebrar o fluxo operacional.

export type TipoEventoOrcamento =
  | 'criado' | 'status_alterado' | 'cliente_alterado'
  | 'item_adicionado' | 'item_removido' | 'quantidade_alterada' | 'preco_alterado'
  | 'desconto_aplicado' | 'observacao_adicionada'
  | 'enviado_cliente' | 'resposta_cliente'
  | 'receita_anexada' | 'receita_validada'
  | 'pagamento_informado' | 'pagamento_confirmado'
  | 'aprovado' | 'recusado' | 'pedido_gerado' | 'erro_validacao'

type EventoInput = {
  tipo: TipoEventoOrcamento
  descricao?: string
  valorAnterior?: unknown
  valorNovo?: unknown
  origem?: 'hub_form' | 'api' | 'ia' | 'sistema'
  metadata?: Record<string, unknown>
}

const igual = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

export async function registrarEventoOrcamento(quoteId: string, ev: EventoInput): Promise<void> {
  try {
    if (!quoteId) return
    // Ignora evento de valor sem mudança real.
    const temValores = ev.valorAnterior !== undefined || ev.valorNovo !== undefined
    if (temValores && igual(ev.valorAnterior, ev.valorNovo)) return

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    let ator_id: string | null = null
    let ator_cargo: string | null = null
    if (user) {
      const { data: perfil } = await supabase.from('profiles').select('id, cargo').eq('id', user.id).single()
      ator_id = perfil?.id ?? user.id
      ator_cargo = perfil?.cargo ?? null
    }

    const admin = createAdminClient()
    const { data: q } = await admin
      .from('quotes').select('id, hub_id, organization_id').eq('id', quoteId).maybeSingle()
    if (!q) return

    await admin.from('quote_events').insert({
      quote_id: q.id,
      hub_id: q.hub_id,
      organization_id: q.organization_id,
      tipo_evento: ev.tipo,
      ator_id,
      ator_cargo,
      descricao: ev.descricao ?? null,
      valor_anterior: ev.valorAnterior ?? null,
      valor_novo: ev.valorNovo ?? null,
      origem: ev.origem ?? 'hub_form',
      metadata: ev.metadata ?? {},
    })
  } catch (e) {
    console.error('[quote_events] falha ao registrar evento', ev.tipo, e)
  }
}
