import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { transformarEmPedido } from '@/app/(dashboard)/orcamentos/actions'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { orcamentoId, acao, motivo } = await request.json()

    // Buscar perfil do usuário
    const { data: perfil } = await supabase
      .from('profiles')
      .select('id, organization_id, cargo')
      .eq('id', user.id)
      .single()

    if (!perfil) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
    }

    // Validar orçamento
    const { data: orcamento } = await supabase
      .from('quotes')
      .select('id, status, organization_id')
      .eq('id', orcamentoId)
      .eq('organization_id', perfil.organization_id)
      .single()

    if (!orcamento) {
      return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 })
    }

    // Executar ação baseada no status
    switch (acao) {
      case 'aprovar_interna':
        if (perfil.cargo !== 'admin' && perfil.cargo !== 'gestor') {
          return NextResponse.json({ error: 'Apenas administradores e gestores podem aprovar.' }, { status: 403 })
        }
        if (orcamento.status !== 'aguardando_aprovacao_interna') {
          return NextResponse.json({ error: 'Orçamento não está aguardando aprovação interna.' }, { status: 400 })
        }

        // Atualizar status para aprovado internamente
        await supabase
          .from('quotes')
          .update({
            status: 'aprovado_internamente',
            aprovacao_interna_por: perfil.id,
            aprovacao_interna_em: new Date().toISOString(),
            aprovacao_interna_comentario: motivo || null,
            atualizado_em: new Date().toISOString()
          })
          .eq('id', orcamentoId)
        break

      case 'enviar_cliente':
        if (orcamento.status !== 'aprovado_internamente') {
          return NextResponse.json({ error: 'Orçamento não está aprovado internamente.' }, { status: 400 })
        }

        // Atualizar status para enviado ao cliente
        await supabase
          .from('quotes')
          .update({
            status: 'enviado_ao_cliente',
            atualizado_em: new Date().toISOString()
          })
          .eq('id', orcamentoId)
        break

      case 'aprovar_rascunho':
        if (orcamento.status !== 'rascunho') {
          return NextResponse.json({ error: 'Orçamento não está em rascunho.' }, { status: 400 })
        }

        // Atualizar status para aguardando aprovação interna
        await supabase
          .from('quotes')
          .update({
            status: 'aguardando_aprovacao_interna',
            atualizado_em: new Date().toISOString()
          })
          .eq('id', orcamentoId)
        break

      case 'cliente_aprovou':
        if (orcamento.status !== 'enviado_ao_cliente') {
          return NextResponse.json({ error: 'Orçamento não foi enviado ao cliente.' }, { status: 400 })
        }

        // Usar a função transformarEmPedido
        await transformarEmPedido(orcamentoId, motivo || 'Cliente aprovou')
        break

      default:
        return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
    }

    // Registrar atividade
    await supabase.from('activities').insert({
      organization_id: perfil.organization_id,
      tipo: `orcamento_${acao}`,
      descricao: `Orçamento #${orcamentoId} ${motivo ? `- ${motivo}` : ''}`,
      autor_id: perfil.id,
    })

    revalidatePath('/orcamentos')
    revalidatePath(`/orcamentos/${orcamentoId}`)

    return NextResponse.json({
      success: true,
      message: 'Ação executada com sucesso!',
      novoStatus: acao === 'cliente_aprovou' ? 'aprovado_pelo_cliente' : getNovoStatus(acao)
    })
  } catch (error: any) {
    console.error('=== ERRO AO EXECUTAR AÇÃO DO ORÇAMENTO ===', error)
    return NextResponse.json({
      error: error.message || 'Falha ao executar ação'
    }, { status: 500 })
  }
}

function getNovoStatus(acao: string): string {
  const statusMap: Record<string, string> = {
    'aprovar_interna': 'aprovado_internamente',
    'enviar_cliente': 'enviado_ao_cliente',
    'aprovar_rascunho': 'aguardando_aprovacao_interna',
    'cliente_aprovou': 'aprovado_pelo_cliente'
  }
  return statusMap[acao] || 'desconhecido'
}