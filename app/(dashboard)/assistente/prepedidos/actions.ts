'use server'

// Pré-pedidos — promoção de Pré-pedido (orders@PRE_PEDIDO) para Pedido definitivo
// (orders@PEDIDO). Módulo NEUTRO: não depende do fluxo legado de Orçamento do
// Assistente. Movido de `assistente/orcamentos/actions.ts` (DEC-017) para desacoplar
// Pré-pedidos do módulo legado. Opera apenas sobre `orders`/`audit_logs`.

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function getAssistente() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo, hub_id')
    .eq('id', user.id)
    .single()
  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'assistente') {
    throw new Error('Apenas Assistentes podem gerar Pedidos.')
  }
  return { supabase, perfil }
}

// Promoção IN-PLACE na mesma linha de `orders`: tipo PRE_PEDIDO -> PEDIDO.
// NÃO cria novo order, NÃO duplica order_items, NÃO altera valores/vínculos.
// Idempotente: só promove quem está em PRE_PEDIDO (filtro no update).
export async function gerarPedidoDefinitivo(orderId: string) {
  const { supabase, perfil } = await getAssistente()

  const { data: o } = await supabase
    .from('orders')
    .select('id, tipo, status, responsavel_id, organization_id')
    .eq('id', orderId)
    .single()
  if (!o || o.organization_id !== perfil.organization_id) throw new Error('Pré-pedido não encontrado.')
  if (o.responsavel_id !== perfil.id) throw new Error('Apenas o responsável pode gerar o Pedido.')
  if (o.tipo !== 'PRE_PEDIDO') throw new Error('Apenas Pré-pedidos podem ser promovidos a Pedido.')

  const { data: atualizado, error } = await supabase
    .from('orders')
    .update({ tipo: 'PEDIDO', atualizado_em: new Date().toISOString() })
    .eq('id', orderId)
    .eq('tipo', 'PRE_PEDIDO')
    .select('id')
  if (error) throw new Error(`Erro ao gerar Pedido: ${error.message}`)
  if (!atualizado || atualizado.length === 0) throw new Error('Este Pré-pedido já foi promovido a Pedido.')

  await supabase.from('audit_logs').insert({
    organization_id: perfil.organization_id,
    usuario_id: perfil.id,
    acao: 'GERACAO_PEDIDO_DEFINITIVO',
    tabela_afetada: 'orders',
    registro_id: orderId,
    dados_anteriores: { tipo: 'PRE_PEDIDO', status: o.status },
    dados_novos: { tipo: 'PEDIDO', status: o.status },
  })

  revalidatePath('/assistente/prepedidos')
  revalidatePath('/pedidos')
}
