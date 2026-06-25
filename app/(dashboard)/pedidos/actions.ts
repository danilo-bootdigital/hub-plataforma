'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { registrarAuditoriaPedido, compararAlteracoes, type AuditoriaAcao } from '@/lib/auditoria-pedido'
import type { OrderStatus } from '@/types/database'

const TRANSICOES: Record<string, string> = {
  pendente: 'em_producao',
  em_producao: 'pronto',
  pronto: 'enviado',
  enviado: 'entregue',
  entregue: 'concluido',
}

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_producao: 'Em Produção',
  pronto: 'Pronto',
  enviado: 'Enviado',
  entregue: 'Entregue',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

async function getUsuarioEOrg() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()
  if (!perfil) redirect('/login')
  return { supabase, perfil, user }
}

async function getUsuarioEOrgComSenha(senha: string) {
  const { supabase, perfil, user } = await getUsuarioEOrg()

  // Verificar senha de administrador
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: senha,
  })

  if (authError) {
    throw new Error('Senha incorreta.')
  }

  return { supabase, perfil, user }
}

export async function avancarStatus(orderId: string, observacao?: string) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const { data: pedido } = await supabase
    .from('orders')
    .select('id, status, lead_id, deal_id, numero, quote_id')
    .eq('id', orderId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!pedido) throw new Error('Pedido não encontrado.')

  const proximoStatus = TRANSICOES[pedido.status as string]
  if (!proximoStatus) throw new Error('Este pedido não pode avançar de status.')

  const agora = new Date().toISOString()
  const extras: Record<string, unknown> = { status: proximoStatus, atualizado_em: agora }
  if (proximoStatus === 'concluido') extras.concluido_em = agora

  const { error } = await supabase
    .from('orders')
    .update(extras)
    .eq('id', orderId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao avançar status: ${error.message}`)

  await supabase.from('order_status_history').insert({
    organization_id: perfil.organization_id,
    order_id: orderId,
    status_anterior: pedido.status,
    status_novo: proximoStatus,
    observacao: observacao || null,
    autor_id: perfil.id,
  })

  // Auditoria detalhada
  await registrarAuditoriaPedido({
    orderId,
    quoteId: (pedido as any).quote_id,
    usuarioId: perfil.id,
    acao: 'ALTERACAO_STATUS',
    camposAlterados: [
      { campo: 'status', anterior: pedido.status, novo: proximoStatus },
    ],
    motivo: observacao || `Status alterado de ${STATUS_LABELS[pedido.status] || pedido.status} para ${STATUS_LABELS[proximoStatus] || proximoStatus}`,
  })

  await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    tipo: 'pedido_status',
    descricao: `Pedido #${pedido.numero} alterado para ${STATUS_LABELS[proximoStatus] || proximoStatus}.`,
    lead_id: pedido.lead_id || null,
    deal_id: pedido.deal_id || null,
    autor_id: perfil.id,
  })

  revalidatePath('/pedidos')
  revalidatePath(`/pedidos/${orderId}`)
}

export async function editarPedido(
  orderId: string,
  dados: {
    lead_id?: string | null
    deal_id?: string | null
    contato_id?: string | null
    valor_total?: number
    desconto_geral?: number
    frete?: number
    observacoes?: string | null
    endereco_entrega?: string | null
    forma_pagamento?: string | null
    itens?: Array<{
      id?: string
      product_id?: string | null
      descricao: string
      quantidade: number
      preco_unitario: number
      desconto_item: number
      subtotal: number
    }>
  },
  senhaAdmin: string,
  motivo: string
) {
  if (!motivo?.trim()) throw new Error('Motivo da alteração é obrigatório.')

  const { supabase, perfil, user } = await getUsuarioEOrgComSenha(senhaAdmin)

  if (perfil.cargo !== 'admin') {
    throw new Error('Apenas administradores podem editar pedidos.')
  }

  // Buscar dados atuais do pedido
  const { data: pedidoAtual } = await supabase
    .from('orders')
    .select(`
      *,
      itens:order_items(*)
    `)
    .eq('id', orderId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!pedidoAtual) throw new Error('Pedido não encontrado.')

  // Validações
  if (pedidoAtual.status === 'cancelado' || pedidoAtual.status === 'concluido') {
    throw new Error('Não é possível editar um pedido cancelado ou concluído.')
  }

  // Preparar dados para atualização
  const dadosAtualizados: Record<string, unknown> = {
    ...dados,
    atualizado_em: new Date().toISOString(),
  }

  // Atualizar pedido
  const { error: updateError } = await supabase
    .from('orders')
    .update(dadosAtualizados)
    .eq('id', orderId)
    .eq('organization_id', perfil.organization_id)

  if (updateError) throw new Error(`Erro ao atualizar pedido: ${updateError.message}`)

  // Atualizar itens do pedido
  if (dados.itens && dados.itens.length > 0) {
    // Deletar itens antigos
    await supabase.from('order_items').delete().eq('order_id', orderId)

    // Inserir novos itens
    const itensParaInserir = dados.itens.map((item) => ({
      order_id: orderId,
      product_id: item.product_id || null,
      descricao: item.descricao,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      desconto_item: item.desconto_item,
      subtotal: item.subtotal,
    }))

    const { error: itensError } = await supabase.from('order_items').insert(itensParaInserir)
    if (itensError) throw new Error(`Erro ao atualizar itens do pedido: ${itensError.message}`)
  }

  // Registrar auditoria detalhada
  const alteracoes = compararAlteracoes(
    {
      lead_id: pedidoAtual.lead_id,
      deal_id: pedidoAtual.deal_id,
      contato_id: pedidoAtual.contato_id,
      valor_total: pedidoAtual.valor_total,
      desconto_geral: pedidoAtual.desconto_geral,
      frete: pedidoAtual.frete,
      observacoes: pedidoAtual.observacoes,
      endereco_entrega: pedidoAtual.endereco_entrega,
      forma_pagamento: pedidoAtual.forma_pagamento,
    },
    dadosAtualizados
  )

  await registrarAuditoriaPedido({
    orderId,
    quoteId: pedidoAtual.quote_id,
    usuarioId: perfil.id,
    administradorId: perfil.id,
    acao: 'EDICAO_PEDIDO',
    camposAlterados: alteracoes,
    dadosAnteriores: pedidoAtual,
    dadosNovos: dadosAtualizados,
    motivo: motivo.trim(),
  })

  await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    tipo: 'pedido_editado',
    descricao: `Pedido #${pedidoAtual.numero} editado por administrador. Motivo: ${motivo.trim()}`,
    lead_id: pedidoAtual.lead_id || null,
    deal_id: pedidoAtual.deal_id || null,
    autor_id: perfil.id,
  })

  revalidatePath('/pedidos')
  revalidatePath(`/pedidos/${orderId}`)
}

export async function cancelarPedido(orderId: string, motivo: string) {
  if (!motivo?.trim()) throw new Error('Motivo do cancelamento é obrigatório.')

  const { supabase, perfil } = await getUsuarioEOrg()

  const { data: pedido } = await supabase
    .from('orders')
    .select('id, status, lead_id, deal_id, numero')
    .eq('id', orderId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!pedido) throw new Error('Pedido não encontrado.')
  if (pedido.status === 'cancelado' || pedido.status === 'concluido') {
    throw new Error('Este pedido não pode ser cancelado.')
  }

  const agora = new Date().toISOString()

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'cancelado' as OrderStatus,
      motivo_cancelamento: motivo.trim(),
      cancelado_por: perfil.id,
      cancelado_em: agora,
      atualizado_em: agora,
    })
    .eq('id', orderId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao cancelar: ${error.message}`)

  await supabase.from('order_status_history').insert({
    organization_id: perfil.organization_id,
    order_id: orderId,
    status_anterior: pedido.status,
    status_novo: 'cancelado',
    observacao: motivo.trim(),
    autor_id: perfil.id,
  })

  // Auditoria detalhada
  await registrarAuditoriaPedido({
    orderId,
    quoteId: (pedido as any).quote_id,
    usuarioId: perfil.id,
    acao: 'CANCELAMENTO',
    dadosAnteriores: { status: pedido.status },
    dadosNovos: { status: 'cancelado', motivo_cancelamento: motivo.trim() },
    motivo: motivo.trim(),
  })

  await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    tipo: 'pedido_cancelado',
    descricao: `Pedido #${pedido.numero} cancelado. Motivo: ${motivo.trim()}`,
    lead_id: pedido.lead_id || null,
    deal_id: pedido.deal_id || null,
    autor_id: perfil.id,
  })

  revalidatePath('/pedidos')
  revalidatePath(`/pedidos/${orderId}`)
}

export async function verificarPedidoPodeEditar(pedidoId: string, senha: string, motivo: string) {
  if (!motivo?.trim()) {
    return { error: 'Motivo da alteração é obrigatório.' }
  }

  const { supabase, perfil } = await getUsuarioEOrg()

  // Verificar se o pedido existe e pertence à organização
  const { data: pedido } = await supabase
    .from('orders')
    .select('id, status, organization_id')
    .eq('id', pedidoId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!pedido) {
    return { error: 'Pedido não encontrado.' }
  }

  // Verificar se o pedido está em status permitido para edição
  const statusPermitidos: OrderStatus[] = ['pendente', 'em_producao']
  if (!statusPermitidos.includes(pedido.status)) {
    return { error: 'Apenas pedidos pendentes ou em produção podem ser editados.' }
  }

  // Verificar senha de administrador
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: (await supabase.auth.getUser()).data.user!.email!,
    password: senha,
  })

  if (authError) {
    return { error: 'Senha administrativa incorreta.' }
  }

  // Registrar tentativa de auditoria (mesmo que falhe)
  try {
    await supabase.from('pedido_audit_logs').insert({
      organization_id: perfil.organization_id,
      order_id: pedidoId,
      acao: 'SOLICITAR_EDICAO',
      motivo: motivo,
      dados_anteriores: JSON.stringify({ status: pedido.status }),
      campos_alterados: JSON.stringify({ solicitado_edicao: true }),
      usuario_id: perfil.id,
      ip: '', // Pode ser capturado do request
      sessao: '', // Pode ser capturado do session
    })
  } catch (e) {
    // Não falhar se o log não conseguir ser salvo
    console.error('Erro ao registrar log de auditoria:', e)
  }

  return {}
}

export async function editarPedidoSimples(
  orderId: string,
  dados: {
    observacoes?: string | null
    endereco_entrega?: string | null
    forma_pagamento?: string | null
    desconto_geral: number
    frete: number
    itens?: Array<{
      id: string
      descricao: string
      quantidade: number
      preco_unitario: number
      desconto_item: number
    }>
  },
  senhaAdmin: string,
  motivo: string
) {
  if (!motivo?.trim()) throw new Error('Motivo da alteração é obrigatório.')

  const { supabase, perfil, user } = await getUsuarioEOrgComSenha(senhaAdmin)

  // Buscar dados atuais do pedido
  const { data: pedidoAtual } = await supabase
    .from('orders')
    .select(`
      *,
      itens:order_items(*)
    `)
    .eq('id', orderId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!pedidoAtual) throw new Error('Pedido não encontrado.')

  // Validações
  if (pedidoAtual.status === 'cancelado' || pedidoAtual.status === 'concluido') {
    throw new Error('Não é possível editar um pedido cancelado ou concluído.')
  }

  // Calcular novo valor total
  const valorSubtotal = dados.itens ?
    dados.itens.reduce((acc, item) => acc + (item.quantidade * item.preco_unitario * (1 - item.desconto_item / 100)), 0) :
    pedidoAtual.valor_total - pedidoAtual.desconto_geral - pedidoAtual.frete
  const valorTotal = Math.round((valorSubtotal * (1 - dados.desconto_geral / 100) + dados.frete) * 100) / 100

  // Atualizar pedido
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      observacoes: dados.observacoes,
      endereco_entrega: dados.endereco_entrega,
      forma_pagamento: dados.forma_pagamento,
      desconto_geral: dados.desconto_geral,
      frete: dados.frete,
      valor_total: valorTotal,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('organization_id', perfil.organization_id)

  if (updateError) throw new Error(`Erro ao atualizar pedido: ${updateError.message}`)

  // Atualizar itens do pedido
  if (dados.itens && dados.itens.length > 0) {
    // Deletar itens antigos
    await supabase.from('order_items').delete().eq('order_id', orderId)

    // Inserir novos itens
    const itensParaInserir = dados.itens.map((item) => ({
      order_id: orderId,
      descricao: item.descricao,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      desconto_item: item.desconto_item,
      subtotal: item.quantidade * item.preco_unitario * (1 - item.desconto_item / 100),
    }))

    const { error: itensError } = await supabase.from('order_items').insert(itensParaInserir)
    if (itensError) throw new Error(`Erro ao atualizar itens do pedido: ${itensError.message}`)
  }

  // Registrar auditoria detalhada
  await supabase.from('pedido_audit_logs').insert({
    organization_id: perfil.organization_id,
    order_id: orderId,
    quote_id: pedidoAtual.quote_id,
    usuario_id: perfil.id,
    administrador_id: perfil.id,
    acao: 'EDICAO',
    campos_alterados: JSON.stringify({
      observacoes: { anterior: pedidoAtual.observacoes, novo: dados.observacoes },
      endereco_entrega: { anterior: pedidoAtual.endereco_entrega, novo: dados.endereco_entrega },
      forma_pagamento: { anterior: pedidoAtual.forma_pagamento, novo: dados.forma_pagamento },
      desconto_geral: { anterior: pedidoAtual.desconto_geral, novo: dados.desconto_geral },
      frete: { anterior: pedidoAtual.frete, novo: dados.frete },
      valor_total: { anterior: pedidoAtual.valor_total, novo: valorTotal },
    }),
    dados_anteriores: JSON.stringify(pedidoAtual),
    dados_novos: JSON.stringify({
      ...pedidoAtual,
      ...dados,
      valor_total: valorTotal,
    }),
    motivo: motivo.trim(),
    ip: '',
    sessao: '',
  })

  await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    tipo: 'pedido_editado',
    descricao: `Pedido #${pedidoAtual.numero} editado por administrador. Motivo: ${motivo.trim()}`,
    lead_id: pedidoAtual.lead_id || null,
    deal_id: pedidoAtual.deal_id || null,
    autor_id: perfil.id,
  })

  revalidatePath('/pedidos')
  revalidatePath(`/pedidos/${orderId}`)
}

export async function concluirPedido(orderId: string) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const { data: pedido } = await supabase
    .from('orders')
    .select('id, status, lead_id, deal_id, numero')
    .eq('id', orderId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!pedido) throw new Error('Pedido não encontrado.')
  if (pedido.status === 'concluido') {
    throw new Error('Pedido já está concluído.')
  }

  const agora = new Date().toISOString()

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'concluido' as OrderStatus,
      concluido_em: agora,
      atualizado_em: agora,
    })
    .eq('id', orderId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao concluir pedido: ${error.message}`)

  await supabase.from('order_status_history').insert({
    organization_id: perfil.organization_id,
    order_id: orderId,
    status_anterior: pedido.status,
    status_novo: 'concluido',
    observacao: `Pedido concluído por ${perfil.id}.`,
    autor_id: perfil.id,
  })

  await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    tipo: 'pedido_concluido',
    descricao: `Pedido #${pedido.numero} foi concluído por ${perfil.id}.`,
    lead_id: pedido.lead_id || null,
    deal_id: pedido.deal_id || null,
    autor_id: perfil.id,
  })

  revalidatePath('/pedidos')
  revalidatePath(`/pedidos/${orderId}`)
}

export async function excluirPedido(orderId: string, senhaAdmin: string) {
  if (!senhaAdmin?.trim()) throw new Error('Senha de administrador é obrigatória.')

  const { supabase, perfil } = await getUsuarioEOrg()

  if (perfil.cargo !== 'admin') {
    throw new Error('Apenas administradores podem excluir pedidos.')
  }

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: (await supabase.auth.getUser()).data.user!.email!,
    password: senhaAdmin,
  })

  if (authError) {
    throw new Error('Senha incorreta.')
  }

  const { data: pedido } = await supabase
    .from('orders')
    .select('id, numero')
    .eq('id', orderId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!pedido) throw new Error('Pedido não encontrado.')

  await supabase.from('order_items').delete().eq('order_id', orderId)
  await supabase.from('order_status_history').delete().eq('order_id', orderId)

  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao excluir pedido: ${error.message}`)

  await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    tipo: 'pedido_excluido',
    descricao: `Pedido #${pedido.numero} excluído permanentemente.`,
    autor_id: perfil.id,
  })

  revalidatePath('/pedidos')
  redirect('/pedidos')
}

// Transições permitidas para correção de status
const TRANSICOES_CORRECAO: Record<string, string[]> = {
  pronto: ['em_producao'],
  concluido: ['pronto', 'em_producao'],
  em_producao: ['pendente'],
}

export async function corrigirStatusPedido(orderId: string, novoStatus: string, motivo: string) {
  if (!motivo?.trim()) throw new Error('Motivo da correção é obrigatório.')

  const { supabase, perfil } = await getUsuarioEOrg()

  // Buscar pedido atual
  const { data: pedido } = await supabase
    .from('orders')
    .select('id, status, lead_id, deal_id, numero, quote_id')
    .eq('id', orderId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!pedido) throw new Error('Pedido não encontrado.')

  // Bloquear status cancelado
  if (pedido.status === 'cancelado') {
    throw new Error('Não é possível corrigir status de um pedido cancelado.')
  }

  // Validar transição permitida
  const transicoesPermitidas = TRANSICOES_CORRECAO[pedido.status as string]
  if (!transicoesPermitidas || !transicoesPermitidas.includes(novoStatus)) {
    throw new Error(`Transição de status não permitida: ${STATUS_LABELS[pedido.status] || pedido.status} → ${STATUS_LABELS[novoStatus] || novoStatus}`)
  }

  const agora = new Date().toISOString()

  // Atualizar orders.status
  const { error } = await supabase
    .from('orders')
    .update({
      status: novoStatus as OrderStatus,
      atualizado_em: agora,
    })
    .eq('id', orderId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao corrigir status: ${error.message}`)

  // Inserir order_status_history
  await supabase.from('order_status_history').insert({
    organization_id: perfil.organization_id,
    order_id: orderId,
    status_anterior: pedido.status,
    status_novo: novoStatus,
    observacao: motivo.trim(),
    autor_id: perfil.id,
  })

  // Chamar registrarAuditoriaPedido se existir padrão no arquivo
  await registrarAuditoriaPedido({
    orderId,
    quoteId: (pedido as any).quote_id,
    usuarioId: perfil.id,
    acao: 'ALTERACAO_STATUS',
    camposAlterados: [
      { campo: 'status', anterior: pedido.status, novo: novoStatus },
    ],
    motivo: motivo.trim(),
  })

  await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    tipo: 'pedido_status',
    descricao: `Pedido #${pedido.numero} teve status corrigido para ${STATUS_LABELS[novoStatus] || novoStatus}. Motivo: ${motivo.trim()}`,
    lead_id: pedido.lead_id || null,
    deal_id: pedido.deal_id || null,
    autor_id: perfil.id,
  })

  revalidatePath('/pedidos')
  revalidatePath(`/pedidos/${orderId}`)
}