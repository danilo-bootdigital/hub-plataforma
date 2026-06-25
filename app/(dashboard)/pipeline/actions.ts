'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function getVendedorOuSuperior() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')
  if (!['admin', 'gestor', 'vendedor'].includes(perfil.cargo)) redirect('/painel')

  return { supabase, perfil }
}

export async function criarDeal(formData: FormData) {
  const { supabase, perfil } = await getVendedorOuSuperior()

  const titulo = formData.get('titulo') as string
  const pipeline_id = formData.get('pipeline_id') as string
  const estagio_id = formData.get('estagio_id') as string
  const valorBruto = formData.get('valor_estimado') as string | null
  const contato_id = formData.get('contato_id') as string | null
  const responsavel_id_form = formData.get('responsavel_id') as string | null
  const data_fechamento = formData.get('data_fechamento_prevista') as string | null
  const observacoes = formData.get('observacoes') as string | null

  if (!titulo?.trim()) throw new Error('Título é obrigatório.')
  if (!pipeline_id || !estagio_id) throw new Error('Pipeline e etapa são obrigatórios.')

  const valor_estimado =
    valorBruto && valorBruto.trim() !== '' ? parseFloat(valorBruto) : null

  // Vendedor só cria no próprio nome; admin/gestor podem escolher responsável
  const responsavel_id =
    perfil.cargo === 'vendedor' ? perfil.id : (responsavel_id_form || null)

  const { data: deal, error } = await supabase
    .from('deals')
    .insert({
      organization_id: perfil.organization_id,
      titulo: titulo.trim(),
      pipeline_id,
      estagio_id,
      valor_estimado,
      contato_id: contato_id || null,
      responsavel_id,
      data_fechamento_prevista: data_fechamento || null,
      observacoes: observacoes || null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Erro ao criar negociação: ${error.message}`)

  // Registrar log de criação
  await supabase.from('deal_stage_logs').insert({
    organization_id: perfil.organization_id,
    deal_id: deal.id,
    usuario_id: perfil.id,
    estagio_anterior_id: null,
    estagio_novo_id: estagio_id,
  })

  await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: 'deal_criado',
    descricao: `Negociação "${titulo.trim()}" criada.`,
    deal_id: deal.id,
  })

  revalidatePath('/pipeline')
}

export async function moverDeal(
  dealId: string,
  estagioDestinoId: string,
  extras: { valor_estimado?: number; motivo_perda?: string } = {}
): Promise<void> {
  const { supabase, perfil } = await getVendedorOuSuperior()

  const { data: deal } = await supabase
    .from('deals')
    .select('id, titulo, estagio_id, responsavel_id, valor_estimado')
    .eq('id', dealId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!deal) throw new Error('Negociação não encontrada.')

  // Se já está no destino, não faz nada
  if (deal.estagio_id === estagioDestinoId) return

  // Vendedor só move os próprios deals
  if (perfil.cargo === 'vendedor' && deal.responsavel_id !== perfil.id) {
    throw new Error('Você não tem permissão para mover esta negociação.')
  }

  const { data: etapaDestino } = await supabase
    .from('pipeline_stages')
    .select('id, nome, tipo_especial')
    .eq('id', estagioDestinoId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!etapaDestino) throw new Error('Etapa de destino não encontrada.')

  const updates: Record<string, unknown> = {
    estagio_id: estagioDestinoId,
    atualizado_em: new Date().toISOString(),
  }

  let tipoAtividade = 'deal_movido'
  let descAtividade = `Negociação movida para "${etapaDestino.nome}".`

  if (etapaDestino.tipo_especial === 'fechado') {
    const novoValor = extras.valor_estimado ?? deal.valor_estimado
    if (!novoValor || novoValor <= 0) {
      throw new Error('Valor estimado é obrigatório para fechar a negociação.')
    }
    updates.valor_estimado = novoValor
    updates.ganho = true
    tipoAtividade = 'deal_ganho'
    descAtividade = `Negociação fechada. Valor: ${novoValor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })}`
  }

  if (etapaDestino.tipo_especial === 'perdido') {
    if (!extras.motivo_perda?.trim()) {
      throw new Error('Motivo da perda é obrigatório.')
    }
    updates.ganho = false
    updates.motivo_perda = extras.motivo_perda.trim()
    tipoAtividade = 'deal_perdido'
    descAtividade = `Negociação perdida. Motivo: ${extras.motivo_perda.trim()}`
  }

  const { error } = await supabase
    .from('deals')
    .update(updates)
    .eq('id', dealId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao mover negociação: ${error.message}`)

  // Registrar log de movimentação
  await supabase.from('deal_stage_logs').insert({
    organization_id: perfil.organization_id,
    deal_id: dealId,
    usuario_id: perfil.id,
    estagio_anterior_id: deal.estagio_id,
    estagio_novo_id: estagioDestinoId,
  })

  // Sincronizar status da conversa vinculada ao lead do deal
  const { data: dealCompleto } = await supabase
    .from('deals')
    .select('lead_id')
    .eq('id', dealId)
    .single()

  if (dealCompleto?.lead_id) {
    const novoStatusConversa =
      etapaDestino.tipo_especial === 'fechado' || etapaDestino.tipo_especial === 'perdido'
        ? 'finalizada'
        : 'em_atendimento'

    await supabase
      .from('conversations')
      .update({ status: novoStatusConversa, atualizado_em: new Date().toISOString() })
      .eq('lead_id', dealCompleto.lead_id)
      .eq('organization_id', perfil.organization_id)
  }

  await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: tipoAtividade,
    descricao: descAtividade,
    deal_id: dealId,
  })

  revalidatePath('/pipeline')
  revalidatePath('/whatsapp')
}

export async function adicionarObservacaoDeal(dealId: string, texto: string) {
  const { supabase, perfil } = await getVendedorOuSuperior()

  if (!texto?.trim()) throw new Error('Texto da observação é obrigatório.')

  const { data: deal } = await supabase
    .from('deals')
    .select('id')
    .eq('id', dealId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!deal) throw new Error('Negociação não encontrada.')

  const { error } = await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: 'observacao',
    descricao: texto.trim(),
    deal_id: dealId,
  })

  if (error) throw new Error(`Erro ao adicionar observação: ${error.message}`)

  revalidatePath('/pipeline')
}
