// Actions públicas para FASE 4 - Aprovação Pública
// Local: app/actions/proposta-publica.ts
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Quote } from '@/types/database'

export async function aprovarPropostaPublica(tokenHash: string, clienteIp?: string, userAgent?: string) {
  const supabase = await createClient()

  // Buscar token válido completo
  const { data: token } = await supabase
    .from('quote_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .eq('status', 'pendente')
    .single()

  if (!token) {
    throw new Error('Token inválido ou expirado.')
  }

  // Verificar se o token já foi usado
  if (token.usado_em) {
    throw new Error('Este token já foi utilizado.')
  }

  // Verificar expiração do token
  const agora = new Date()
  if (new Date(token.expira_em) < agora) {
    throw new Error('Token expirado.')
  }

  // Buscar orçamento vinculado ao token (SÓ a partir do token)
  const { data: orcamento } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', token.quote_id)
    .single()

  if (!orcamento) {
    throw new Error('Orçamento vinculado ao token não encontrado.')
  }

  // Validar validade do orçamento
  if (!orcamento.validade_em) {
    throw new Error('Orçamento sem validade definida.')
  }

  const validadeOrcamento = new Date(orcamento.validade_em)
  if (validadeOrcamento < agora) {
    throw new Error('Orçamento vencido.')
  }

  // Validar status do orçamento
  if (orcamento.status !== 'enviado_ao_cliente') {
    throw new Error('Orçamento não está disponível para aprovação.')
  }

  // Verificar se já existe pedido vinculado
  const { data: pedidoExistente } = await supabase
    .from('orders')
    .select('id')
    .eq('quote_id', token.quote_id)
    .limit(1)
    .single()

  if (pedidoExistente) {
    throw new Error('Já existe um pedido vinculado a este orçamento.')
  }

  // Validar que o token pertence ao orçamento (proteção extra)
  if (token.quote_id !== orcamento.id) {
    throw new Error('Inconsistência detectada entre token e orçamento.')
  }

  // Atualizar status do token
  const { error: tokenError } = await supabase
    .from('quote_tokens')
    .update({
      status: 'aprovado',
      usado_em: agora.toISOString(),
      cliente_ip: clienteIp,
      cliente_ua: userAgent
    })
    .eq('id', token.id)

  if (tokenError) {
    throw new Error(`Erro ao registrar aprovação: ${tokenError.message}`)
  }

  // Atualizar orçamento
  const { error: orcamentoError } = await supabase
    .from('quotes')
    .update({
      status: 'aguardando_confirmacao_vendedor',
      cliente_aprovado_em: agora.toISOString(),
      cliente_recusado_em: null,
      ultima_alteracao_validada_em: agora.toISOString()
    })
    .eq('id', token.quote_id)

  if (orcamentoError) {
    throw new Error(`Erro ao atualizar orçamento: ${orcamentoError.message}`)
  }

  revalidatePath('/orcamentos')
  revalidatePath(`/orcamentos/${token.quote_id}`)
}

export async function recusarPropostaPublica(tokenHash: string, clienteIp?: string, userAgent?: string) {
  const supabase = await createClient()

  // Buscar token válido completo
  const { data: token } = await supabase
    .from('quote_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .eq('status', 'pendente')
    .single()

  if (!token) {
    throw new Error('Token inválido ou expirado.')
  }

  // Verificar se o token já foi usado
  if (token.usado_em) {
    throw new Error('Este token já foi utilizado.')
  }

  // Verificar expiração do token
  const agora = new Date()
  if (new Date(token.expira_em) < agora) {
    throw new Error('Token expirado.')
  }

  // Buscar orçamento vinculado ao token (SÓ a partir do token)
  const { data: orcamento } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', token.quote_id)
    .single()

  if (!orcamento) {
    throw new Error('Orçamento vinculado ao token não encontrado.')
  }

  // Validar validade do orçamento
  if (!orcamento.validade_em) {
    throw new Error('Orçamento sem validade definida.')
  }

  const validadeOrcamento = new Date(orcamento.validade_em)
  if (validadeOrcamento < agora) {
    throw new Error('Orçamento vencido.')
  }

  // Validar status do orçamento
  if (orcamento.status !== 'enviado_ao_cliente') {
    throw new Error('Orçamento não está disponível para aprovação.')
  }

  // Validar que o token pertence ao orçamento (proteção extra)
  if (token.quote_id !== orcamento.id) {
    throw new Error('Inconsistência detectada entre token e orçamento.')
  }

  // Atualizar status do token
  const { error: tokenError } = await supabase
    .from('quote_tokens')
    .update({
      status: 'recusado',
      usado_em: agora.toISOString(),
      cliente_ip: clienteIp,
      cliente_ua: userAgent
    })
    .eq('id', token.id)

  if (tokenError) {
    throw new Error(`Erro ao registrar recusa: ${tokenError.message}`)
  }

  // Atualizar orçamento
  const { error: orcamentoError } = await supabase
    .from('quotes')
    .update({
      status: 'recusado_pelo_cliente',
      cliente_recusado_em: agora.toISOString(),
      cliente_aprovado_em: null,
      ultima_alteracao_validada_em: agora.toISOString()
    })
    .eq('id', token.quote_id)

  if (orcamentoError) {
    throw new Error(`Erro ao atualizar orçamento: ${orcamentoError.message}`)
  }

  revalidatePath('/orcamentos')
  revalidatePath(`/orcamentos/${token.quote_id}`)
}