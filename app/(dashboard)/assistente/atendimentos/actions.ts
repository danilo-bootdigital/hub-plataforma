'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function getAssistente() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo, hub_id, nome')
    .eq('id', user.id)
    .single()
  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'assistente') {
    throw new Error('Apenas Assistentes podem criar Atendimentos.')
  }
  if (!perfil.hub_id) {
    throw new Error('Você ainda não está vinculado a um Hub.')
  }
  return { supabase, perfil }
}

// Cria um Atendimento (deal) para um Cliente visível ao Assistente (regra da Fatia 10).
export async function criarAtendimento(clienteId: string) {
  const { supabase, perfil } = await getAssistente()

  // Cliente precisa pertencer à Indústria e a uma Carteira do Hub do Assistente.
  const { data: contato } = await supabase
    .from('contacts')
    .select('id, nome, carteira_id, organization_id')
    .eq('id', clienteId)
    .single()
  if (!contato || contato.organization_id !== perfil.organization_id) {
    throw new Error('Cliente não encontrado.')
  }
  if (!contato.carteira_id) {
    throw new Error('Cliente sem Carteira — indisponível para Atendimento.')
  }

  const { data: carteira } = await supabase
    .from('carteiras')
    .select('id, hub_id, modo, responsavel_id')
    .eq('id', contato.carteira_id)
    .single()
  if (!carteira || carteira.hub_id !== perfil.hub_id) {
    throw new Error('Cliente não pertence ao seu Hub.')
  }
  const visivel =
    carteira.modo === 'ABERTA' || (carteira.modo === 'DISTRIBUIDA' && carteira.responsavel_id === perfil.id)
  if (!visivel) {
    throw new Error('Cliente de Carteira distribuída a outro Assistente.')
  }

  // Pipeline padrão + estágio inicial (sem implementar gestão de Pipeline).
  const { data: pipeline } = await supabase
    .from('pipelines')
    .select('id')
    .eq('organization_id', perfil.organization_id)
    .order('padrao', { ascending: false })
    .order('criado_em', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (!pipeline) throw new Error('Pipeline não configurado para a Indústria.')

  const { data: estagio } = await supabase
    .from('pipeline_stages')
    .select('id')
    .eq('pipeline_id', pipeline.id)
    .order('ordem', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (!estagio) throw new Error('Etapas do Pipeline não configuradas.')

  const { data: deal, error } = await supabase
    .from('deals')
    .insert({
      organization_id: perfil.organization_id,
      titulo: `Atendimento — ${contato.nome}`,
      contato_id: clienteId,
      responsavel_id: perfil.id,
      pipeline_id: pipeline.id,
      estagio_id: estagio.id,
    })
    .select('id')
    .single()
  if (error) throw new Error(`Erro ao criar Atendimento: ${error.message}`)

  await supabase.from('audit_logs').insert({
    organization_id: perfil.organization_id,
    usuario_id: perfil.id,
    acao: 'CRIACAO_ATENDIMENTO_ASSISTENTE',
    tabela_afetada: 'deals',
    registro_id: deal.id,
    dados_anteriores: null,
    dados_novos: { contato_id: clienteId, carteira_id: contato.carteira_id, responsavel_id: perfil.id },
  })

  revalidatePath('/assistente/atendimentos')
  revalidatePath('/assistente/clientes')
}
