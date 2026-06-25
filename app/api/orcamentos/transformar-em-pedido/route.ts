import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * RPC de conversão de orçamento para pedido
 *
 * Esta rota delega toda a lógica de conversão para a função PostgreSQL
 * convert_orcamento_to_pedido(), que executa a operação de forma atômica.
 *
 * Benefícios:
 * - Transação atômica (tudo ou nada)
 * - Proteção contra race conditions (SELECT FOR UPDATE)
 * - Proteção contra duplicidade (unique constraint)
 * - Número do pedido gerado pela sequence do banco
 * - Todos os campos copiados corretamente
 * - Registro de auditoria automático
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Validar entrada
    const body = await request.json()
    const { orcamentoId, motivo } = body

    if (!orcamentoId) {
      return NextResponse.json(
        { error: 'ID do orçamento é obrigatório', code: 'MISSING_QUOTE_ID' },
        { status: 400 }
      )
    }

    // Validar formato do UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(orcamentoId)) {
      return NextResponse.json(
        { error: 'ID do orçamento inválido', code: 'INVALID_QUOTE_ID' },
        { status: 400 }
      )
    }

    // Chamar a RPC PostgreSQL para conversão atômica
    const { data, error } = await supabase.rpc('convert_orcamento_to_pedido', {
      p_quote_id: orcamentoId,
      p_motivo: motivo || null
    })

    // Processar resultado da RPC
    if (error) {
      console.error('=== ERRO RPC convert_orcamento_to_pedido ===', error)
      return NextResponse.json(
        { error: 'Falha ao converter orçamento em pedido', details: error.message },
        { status: 500 }
      )
    }

    // A RPC retorna um array com um registro
    const result = Array.isArray(data) ? data[0] : data

    if (!result) {
      return NextResponse.json(
        { error: 'Resposta inválida do servidor', code: 'INVALID_RESPONSE' },
        { status: 500 }
      )
    }

    // Verificar se a conversão foi bem-sucedida
    if (!result.success) {
      // Analisar a mensagem de erro para determinar o código HTTP apropriado
      const message = result.message || ''

      if (message.includes('Não autenticado') || message.includes('Perfil não encontrado')) {
        return NextResponse.json(
          { error: message, code: 'PERMISSION_DENIED' },
          { status: 403 }
        )
      }

      if (message.includes('não encontrado')) {
        return NextResponse.json(
          { error: message, code: 'NOT_FOUND' },
          { status: 404 }
        )
      }

      if (message.includes('Já existe') || message.includes('duplicado')) {
        return NextResponse.json(
          { error: message, code: 'DUPLICATE_ORDER' },
          { status: 409 }
        )
      }

      if (message.includes('status') || message.includes('aprovado')) {
        return NextResponse.json(
          { error: message, code: 'INVALID_STATUS' },
          { status: 400 }
        )
      }

      if (message.includes('item')) {
        return NextResponse.json(
          { error: message, code: 'NO_ITEMS' },
          { status: 400 }
        )
      }

      // Erro genérico de validação
      return NextResponse.json(
        { error: message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Sucesso - revalidar caches
    revalidatePath('/orcamentos')
    revalidatePath(`/orcamentos/${orcamentoId}`)
    revalidatePath('/pedidos')

    return NextResponse.json({
      success: true,
      pedidoId: result.order_id,
      pedidoNumero: result.order_numero,
      message: result.message || 'Pedido gerado com sucesso!'
    })

  } catch (error: any) {
    console.error('=== ERRO AO CONVERTER ORÇAMENTO EM PEDIDO ===', error)
    return NextResponse.json(
      { error: error.message || 'Falha ao converter orçamento em pedido' },
      { status: 500 }
    )
  }
}
