import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export type AuditoriaAcao =
  | 'CRIACAO_PEDIDO'
  | 'EDICAO_PEDIDO'
  | 'ALTERACAO_STATUS'
  | 'CANCELAMENTO'
  | 'EXCLUSAO'
  | 'CONVERSAO_ORCAMENTO'

type CampoAlterado = {
  campo: string
  anterior: unknown
  novo: unknown
}

type RegistrarAuditoriaParams = {
  orderId: string
  quoteId?: string | null
  usuarioId: string
  administradorId?: string | null
  acao: AuditoriaAcao
  camposAlterados?: CampoAlterado[]
  dadosAnteriores?: Record<string, unknown>
  dadosNovos?: Record<string, unknown>
  motivo?: string
}

/**
 * Registra uma entrada de auditoria para alteração de pedido.
 * Deve ser chamada em TODA operação que modifica um pedido.
 */
export async function registrarAuditoriaPedido(params: RegistrarAuditoriaParams) {
  const supabase = await createClient()

  // Capturar IP e sessão dos headers
  const headersList = await headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headersList.get('x-real-ip') ||
    null
  const sessao = headersList.get('cookie')?.slice(0, 100) || null

  // Buscar organization_id do pedido
  const { data: pedido } = await supabase
    .from('orders')
    .select('organization_id')
    .eq('id', params.orderId)
    .single()

  if (!pedido) {
    console.warn('[auditoria] Pedido não encontrado para registrar auditoria:', params.orderId)
    return
  }

  // Construir JSON de campos alterados
  let camposJson: Record<string, { anterior: unknown; novo: unknown }> | null = null
  if (params.camposAlterados && params.camposAlterados.length > 0) {
    camposJson = {}
    for (const c of params.camposAlterados) {
      // Só registrar se o valor mudou
      if (JSON.stringify(c.anterior) !== JSON.stringify(c.novo)) {
        camposJson[c.campo] = { anterior: c.anterior, novo: c.novo }
      }
    }
    if (Object.keys(camposJson).length === 0) {
      camposJson = null
    }
  }

  const { error } = await supabase.from('pedido_audit_logs').insert({
    organization_id: pedido.organization_id,
    order_id: params.orderId,
    quote_id: params.quoteId || null,
    usuario_id: params.usuarioId,
    administrador_id: params.administradorId || null,
    acao: params.acao,
    campos_alterados: camposJson,
    dados_anteriores: params.dadosAnteriores || null,
    dados_novos: params.dadosNovos || null,
    motivo: params.motivo || null,
    ip,
    sessao,
  })

  if (error) {
    console.error('[auditoria] Erro ao registrar auditoria de pedido:', error)
  }
}

/**
 * Compara dois objetos e retorna a lista de campos alterados.
 */
export function compararAlteracoes(
  anterior: Record<string, unknown>,
  novo: Record<string, unknown>,
  ignorar: string[] = ['atualizado_em']
): CampoAlterado[] {
  const alterados: CampoAlterado[] = []
  const todosCampos = new Set([...Object.keys(anterior), ...Object.keys(novo)])

  for (const campo of todosCampos) {
    if (ignorar.includes(campo)) continue
    const valAnt = anterior[campo]
    const valNov = novo[campo]
    if (JSON.stringify(valAnt) !== JSON.stringify(valNov)) {
      alterados.push({ campo, anterior: valAnt, novo: valNov })
    }
  }

  return alterados
}
