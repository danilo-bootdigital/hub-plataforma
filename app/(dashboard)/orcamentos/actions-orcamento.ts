'use server'

import { transformarEmPedido, verificarPedidoGerado } from '@/app/(dashboard)/orcamentos/actions'

export async function handleVerificarEPedirConfirmacao(orcamentoId: string) {
  console.log('=== handleVerificarEPedirConfirmacao (server) ===', orcamentoId)
  console.log('Verificando se já existe pedido...')

  const pedido = await verificarPedidoGerado(orcamentoId)

  console.log('Pedido encontrado:', pedido)

  if (pedido) {
    // Já existe pedido, mostrar link
    return { type: 'exists', pedido }
  }

  // Não existe pedido, pedir confirmação
  return { type: 'confirm', message: 'confirmar_conversao' }
}

export async function handleTransformarPedido(orcamentoId: string, motivo: string) {
  console.log('=== handleTransformarPedido (server) ===', motivo)
  if (!motivo.trim()) {
    throw new Error('Informe o motivo da conversão para gerar o pedido.')
  }

  await transformarEmPedido(orcamentoId, motivo.trim())
  return { success: true, message: 'Pedido gerado com sucesso!' }
}