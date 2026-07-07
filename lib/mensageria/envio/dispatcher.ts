// Mensageria (DEC-023 · E9.3) — Dispatcher de ENVIO (outbound).
// Orquestra o envio de UMA mensagem de texto, agnóstico de provider e de banco.
// NÃO toca banco diretamente: recebe as RPCs (registrar/confirmar/falha) e o
// resolvedor de provider como deps injetadas. Sem Server Action, sem UI, sem I/O
// próprio. Único ponto que amarra "enfileirar → enviar → confirmar/falhar".
//
// Contrato de idempotência: registrarEnvio é a fonte da verdade. Se ela informa
// ja_existia=true (replay da mesma idempotency_key), NÃO reenviamos ao provider.

import type { ProviderAdapter, SendResult, NormalizedMessageTipo } from '../providers/tipos'

// Retorno da RPC communication_registrar_envio (076), já em jsonb.
export interface RegistrarEnvioResult {
  ok: boolean
  ja_existia?: boolean
  message_id?: string
  provider?: string
  account_external_id?: string
  to?: string
  motivo?: string
}

export interface DispatcherDeps {
  registrarEnvio(input: { conversationId: string; corpo: string; idempotencyKey: string }): Promise<RegistrarEnvioResult>
  confirmarEnvio(input: { messageId: string; providerMessageId: string }): Promise<void>
  registrarFalha(input: { messageId: string; erro: string }): Promise<void>
  // Resolve o ProviderAdapter pelo code. Pode lançar se não registrado (comportamento
  // do registry) — o dispatcher trata isso como provider indisponível.
  resolveProvider(code: string): ProviderAdapter
}

export interface DispatchInput {
  conversationId: string
  corpo: string
  idempotencyKey: string
  tipo?: NormalizedMessageTipo   // default 'texto'; E9 só aceita texto
}

// Desfecho discriminado — o dispatcher NÃO lança; devolve o resultado.
export type DispatchOutcome =
  | { ok: true; status: 'enviada'; messageId: string; providerMessageId: string }
  | { ok: true; status: 'ja_enfileirada'; messageId: string }          // replay idempotente: não reenviou
  | { ok: false; status: 'tipo_nao_suportado'; motivo: string }        // rejeitado antes de registrar
  | { ok: false; status: 'nao_registrada'; motivo: string }            // registrarEnvio ok=false
  | { ok: false; status: 'provider_indisponivel'; messageId: string; erro: string } // provider não resolvido
  | { ok: false; status: 'falha_envio'; messageId: string; erro: string }            // provider lançou (erro/timeout)
  | { ok: false; status: 'confirmacao_falhou'; messageId: string; providerMessageId: string; erro: string } // enviou, mas confirmar falhou

function mensagemErro(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

// Marca falha sem propagar erro da própria RPC de falha — assim uma falha ao
// REGISTRAR a falha não mascara o erro ORIGINAL do envio (que é o que interessa).
async function registrarFalhaSeguro(deps: DispatcherDeps, messageId: string, erro: string): Promise<void> {
  try {
    await deps.registrarFalha({ messageId, erro })
  } catch {
    // engolido de propósito: o erro original já está capturado no outcome
  }
}

export async function despacharEnvio(deps: DispatcherDeps, input: DispatchInput): Promise<DispatchOutcome> {
  const tipo = input.tipo ?? 'texto'
  if (tipo !== 'texto') {
    // rejeita ANTES de qualquer efeito colateral (nada é registrado)
    return { ok: false, status: 'tipo_nao_suportado', motivo: `envio de tipo '${tipo}' não suportado (apenas 'texto')` }
  }

  const r = await deps.registrarEnvio({
    conversationId: input.conversationId,
    corpo: input.corpo,
    idempotencyKey: input.idempotencyKey,
  })
  if (!r.ok) {
    return { ok: false, status: 'nao_registrada', motivo: r.motivo ?? 'registro_de_envio_falhou' }
  }

  const messageId = r.message_id ?? ''
  // replay idempotente: já havia mensagem com essa chave → NÃO dispara o provider
  if (r.ja_existia) {
    return { ok: true, status: 'ja_enfileirada', messageId }
  }

  // nova mensagem enfileirada: resolver o provider
  let provider: ProviderAdapter
  try {
    provider = deps.resolveProvider(r.provider ?? '')
  } catch (err) {
    const erro = `provider '${r.provider ?? ''}' indisponível: ${mensagemErro(err)}`
    await registrarFalhaSeguro(deps, messageId, erro)
    return { ok: false, status: 'provider_indisponivel', messageId, erro }
  }

  // enviar (I/O externo; pode lançar por erro HTTP ou timeout)
  let resultado: SendResult
  try {
    resultado = await provider.sendMessage(
      { externalAccountId: r.account_external_id ?? '' },
      r.to ?? '',
      { tipo: 'texto', corpo: input.corpo },
    )
  } catch (err) {
    const erro = mensagemErro(err)
    await registrarFalhaSeguro(deps, messageId, erro)
    return { ok: false, status: 'falha_envio', messageId, erro }
  }

  // confirmar (wamid). Se a confirmação falhar, a mensagem JÁ saiu — não marcamos
  // falha (seria incorreto); sinalizamos para reconciliação posterior (E9.5).
  try {
    await deps.confirmarEnvio({ messageId, providerMessageId: resultado.providerMessageId })
  } catch (err) {
    return { ok: false, status: 'confirmacao_falhou', messageId, providerMessageId: resultado.providerMessageId, erro: mensagemErro(err) }
  }

  return { ok: true, status: 'enviada', messageId, providerMessageId: resultado.providerMessageId }
}
