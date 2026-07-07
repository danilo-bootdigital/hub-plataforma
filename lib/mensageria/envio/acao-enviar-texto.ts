'use server'

// Mensageria (DEC-023 · E9.6) — Server Action de ENVIO de texto.
// Ponto de entrada da futura UI: envia UMA mensagem de texto a partir de uma
// conversation existente. Orquestra via dispatcher (E9.3) + RPCs 076 (E9.1).
//
// Segurança em camadas:
//  1) autenticação: exige usuário logado (getAuthData);
//  2) escopo de Hub: a conversa é lida pelo client RLS-aware (createClient) — as
//     policies já filtram hub_id = get_hub_id(); linha ausente = fora do Hub → rejeita.
//  3) service-role (createAdminClient) SÓ para as RPCs de envio (registrar/confirmar/falha).
//
// Escopo: só texto. Sem UI, mídia, template, RBAC fino, orçamento ou pipeline.

import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthData } from '@/lib/auth/server'
import '@/lib/mensageria/providers/register-all'
import { resolveProvider } from '@/lib/mensageria/providers/registry'
import { despacharEnvio, type DispatcherDeps, type RegistrarEnvioResult } from '@/lib/mensageria/envio/dispatcher'

export interface EnviarTextoInput {
  conversationId: string
  corpo: string
  idempotencyKey?: string   // opcional: a UI pode enviar um token estável p/ proteger double-submit
}

export type EnviarTextoResultado =
  | { ok: true; status: 'enviada' | 'ja_enfileirada' | 'confirmacao_pendente'; messageId: string; providerMessageId?: string }
  | {
      ok: false
      codigo: 'nao_autenticado' | 'conversa_nao_encontrada' | 'corpo_vazio' | 'provider_indisponivel' | 'falha_envio'
      erro?: string
    }

function depsAdmin(): DispatcherDeps {
  const admin = createAdminClient()
  return {
    registrarEnvio: async ({ conversationId, corpo, idempotencyKey }) => {
      const { data, error } = await admin.rpc('communication_registrar_envio', {
        p_conversation_id: conversationId,
        p_corpo: corpo,
        p_idempotency_key: idempotencyKey,
      })
      if (error) throw new Error(`registrar_envio RPC: ${error.message}`)
      return (data ?? { ok: false }) as RegistrarEnvioResult
    },
    confirmarEnvio: async ({ messageId, providerMessageId }) => {
      const { error } = await admin.rpc('communication_confirmar_envio', {
        p_message_id: messageId,
        p_provider_message_id: providerMessageId,
      })
      if (error) throw new Error(`confirmar_envio RPC: ${error.message}`)
    },
    registrarFalha: async ({ messageId, erro }) => {
      const { error } = await admin.rpc('communication_registrar_falha', {
        p_message_id: messageId,
        p_erro: erro,
      })
      if (error) throw new Error(`registrar_falha RPC: ${error.message}`)
    },
    resolveProvider,
  }
}

export async function enviarMensagemDeTexto(input: EnviarTextoInput): Promise<EnviarTextoResultado> {
  // 1) autenticação
  const { user } = await getAuthData()
  if (!user) return { ok: false, codigo: 'nao_autenticado' }

  // 2) validação de conteúdo (só texto; corpo não-vazio)
  const corpo = input.corpo?.trim()
  if (!corpo) return { ok: false, codigo: 'corpo_vazio' }

  // 3) escopo de Hub via RLS: a conversa precisa ser visível ao usuário
  const rls = await createClient()
  const { data: conversa } = await rls
    .from('communication_conversations')
    .select('id')
    .eq('id', input.conversationId)
    .maybeSingle()
  if (!conversa) return { ok: false, codigo: 'conversa_nao_encontrada' }

  // 4) despacho (dispatcher + RPCs via service-role)
  const idempotencyKey = input.idempotencyKey?.trim() || randomUUID()
  const r = await despacharEnvio(depsAdmin(), { conversationId: input.conversationId, corpo, idempotencyKey })

  // 5) resultado estruturado para a UI
  switch (r.status) {
    case 'enviada':
      return { ok: true, status: 'enviada', messageId: r.messageId, providerMessageId: r.providerMessageId }
    case 'ja_enfileirada':
      return { ok: true, status: 'ja_enfileirada', messageId: r.messageId }
    case 'confirmacao_falhou':
      // a mensagem SAIU; só a confirmação (wamid→enviada) falhou — reconciliação via webhook/poller
      return { ok: true, status: 'confirmacao_pendente', messageId: r.messageId, providerMessageId: r.providerMessageId }
    case 'nao_registrada':
      return { ok: false, codigo: 'conversa_nao_encontrada' }
    case 'provider_indisponivel':
      return { ok: false, codigo: 'provider_indisponivel', erro: r.erro }
    case 'falha_envio':
      return { ok: false, codigo: 'falha_envio', erro: r.erro }
    case 'tipo_nao_suportado':
      return { ok: false, codigo: 'falha_envio', erro: r.motivo }
  }
}
