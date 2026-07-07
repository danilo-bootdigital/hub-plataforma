// Testes do dispatcher de envio (DEC-023 · E9.3). node:test.
// Todas as deps são MOCKADAS (nenhum banco, nenhuma chamada real ao provider).
// Cobre: happy path, idempotência (ja_existia), erro/timeout do provider,
// tipo não-texto, provider não encontrado, confirmação que falha, e a garantia
// de que uma falha ao registrar a falha NÃO mascara o erro original.

import test from 'node:test'
import assert from 'node:assert/strict'
import { despacharEnvio } from '../dispatcher'
import type { DispatcherDeps, RegistrarEnvioResult } from '../dispatcher'
import type { ProviderAdapter, SendResult, AccountRef, OutboundContent } from '../../providers/tipos'

type Calls = {
  registrar: Array<{ conversationId: string; corpo: string; idempotencyKey: string }>
  confirmar: Array<{ messageId: string; providerMessageId: string }>
  falha: Array<{ messageId: string; erro: string }>
  send: Array<{ account: AccountRef; to: string; content: OutboundContent }>
}

// Provider fake: sendMessage configurável (resolve com SendResult ou lança).
function fakeProvider(send: (a: AccountRef, to: string, c: OutboundContent) => Promise<SendResult>, calls: Calls): ProviderAdapter {
  return {
    code: 'cloud_api',
    channels: ['whatsapp'],
    verifyWebhook: () => ({ ok: true }),
    parseInbound: () => ({ messages: [] }),
    mapStatus: () => [],
    sendMessage: (account, to, content) => { calls.send.push({ account, to, content }); return send(account, to, content) },
    fetchMedia: async () => ({ bytes: new Uint8Array(), mime: 'application/octet-stream' }),
  }
}

// Constrói deps com comportamentos configuráveis e registra todas as chamadas.
function makeDeps(over: {
  registrar?: RegistrarEnvioResult
  send?: (a: AccountRef, to: string, c: OutboundContent) => Promise<SendResult>
  resolveProvider?: (code: string) => ProviderAdapter
  confirmar?: () => Promise<void>
  falha?: () => Promise<void>
}): { deps: DispatcherDeps; calls: Calls } {
  const calls: Calls = { registrar: [], confirmar: [], falha: [], send: [] }
  const send = over.send ?? (async () => ({ providerMessageId: 'wamid.OUT', status: 'enviada' as const }))
  const provider = fakeProvider(send, calls)
  const deps: DispatcherDeps = {
    registrarEnvio: async (input) => {
      calls.registrar.push(input)
      return over.registrar ?? { ok: true, ja_existia: false, message_id: 'msg-1', provider: 'cloud_api', account_external_id: 'PNID1', to: '5511999999999' }
    },
    confirmarEnvio: async (input) => { calls.confirmar.push(input); if (over.confirmar) await over.confirmar() },
    registrarFalha: async (input) => { calls.falha.push(input); if (over.falha) await over.falha() },
    resolveProvider: over.resolveProvider ?? ((code) => { if (code !== 'cloud_api') throw new Error(`provider '${code}' não registrado`); return provider }),
  }
  return { deps, calls }
}

const INPUT = { conversationId: 'conv-1', corpo: 'olá', idempotencyKey: 'idem-1' }

test('happy path: registra, envia, confirma', async () => {
  const { deps, calls } = makeDeps({})
  const r = await despacharEnvio(deps, INPUT)
  assert.deepEqual(r, { ok: true, status: 'enviada', messageId: 'msg-1', providerMessageId: 'wamid.OUT' })
  assert.equal(calls.registrar.length, 1)
  assert.equal(calls.send.length, 1)
  assert.equal(calls.confirmar.length, 1)
  assert.equal(calls.falha.length, 0)
  // conteúdo montado corretamente a partir do retorno da RPC
  assert.equal(calls.send[0].to, '5511999999999')
  assert.equal(calls.send[0].account.externalAccountId, 'PNID1')
  assert.deepEqual(calls.send[0].content, { tipo: 'texto', corpo: 'olá' })
  assert.deepEqual(calls.confirmar[0], { messageId: 'msg-1', providerMessageId: 'wamid.OUT' })
})

test('idempotência: ja_existia=true NÃO dispara o provider', async () => {
  const { deps, calls } = makeDeps({ registrar: { ok: true, ja_existia: true, message_id: 'msg-1', provider: 'cloud_api', account_external_id: 'PNID1', to: '5511999999999' } })
  const r = await despacharEnvio(deps, INPUT)
  assert.deepEqual(r, { ok: true, status: 'ja_enfileirada', messageId: 'msg-1' })
  assert.equal(calls.send.length, 0)
  assert.equal(calls.confirmar.length, 0)
  assert.equal(calls.falha.length, 0)
})

test('erro da Cloud API: registra falha', async () => {
  const { deps, calls } = makeDeps({ send: async () => { throw new Error('Cloud API sendMessage falhou (HTTP 400): parametro invalido') } })
  const r = await despacharEnvio(deps, INPUT)
  assert.equal(r.ok, false)
  assert.equal(r.status, 'falha_envio')
  assert.equal(calls.confirmar.length, 0)
  assert.equal(calls.falha.length, 1)
  assert.match(calls.falha[0].erro, /HTTP 400/)
  assert.equal(calls.falha[0].messageId, 'msg-1')
})

test('timeout: registra falha', async () => {
  const { deps, calls } = makeDeps({ send: async () => { throw new Error('Cloud API HTTP timeout após 15000ms: https://graph.test/x') } })
  const r = await despacharEnvio(deps, INPUT)
  assert.equal(r.ok, false)
  assert.equal(r.status, 'falha_envio')
  assert.equal(calls.falha.length, 1)
  assert.match(calls.falha[0].erro, /timeout/)
})

test('conteúdo não-texto é rejeitado ANTES de registrar', async () => {
  const { deps, calls } = makeDeps({})
  const r = await despacharEnvio(deps, { ...INPUT, tipo: 'imagem' })
  assert.equal(r.ok, false)
  assert.equal(r.status, 'tipo_nao_suportado')
  // nada foi tocado
  assert.equal(calls.registrar.length, 0)
  assert.equal(calls.send.length, 0)
})

test('provider não encontrado: registra falha e devolve provider_indisponivel', async () => {
  const { deps, calls } = makeDeps({ registrar: { ok: true, ja_existia: false, message_id: 'msg-1', provider: 'provider_x', account_external_id: 'PNID1', to: '55' } })
  const r = await despacharEnvio(deps, INPUT)
  assert.equal(r.ok, false)
  assert.equal(r.status, 'provider_indisponivel')
  assert.equal(calls.send.length, 0)
  assert.equal(calls.falha.length, 1)
  assert.match(calls.falha[0].erro, /provider_x/)
})

test('nao_registrada: registrarEnvio ok=false (ex.: conversa inexistente) não envia', async () => {
  const { deps, calls } = makeDeps({ registrar: { ok: false, motivo: 'conversa_nao_encontrada' } })
  const r = await despacharEnvio(deps, INPUT)
  assert.deepEqual(r, { ok: false, status: 'nao_registrada', motivo: 'conversa_nao_encontrada' })
  assert.equal(calls.send.length, 0)
  assert.equal(calls.falha.length, 0)
})

test('confirmar_envio falha após envio: NÃO marca falha (mensagem já saiu)', async () => {
  const { deps, calls } = makeDeps({ confirmar: async () => { throw new Error('confirmarEnvio indisponível') } })
  const r = await despacharEnvio(deps, INPUT)
  assert.equal(r.ok, false)
  assert.equal(r.status, 'confirmacao_falhou')
  assert.equal((r as { providerMessageId: string }).providerMessageId, 'wamid.OUT')
  assert.equal(calls.send.length, 1)      // enviou de fato
  assert.equal(calls.falha.length, 0)     // não marca falha — a mensagem saiu
})

test('registrar_falha falha NÃO mascara o erro original do envio', async () => {
  const { deps, calls } = makeDeps({
    send: async () => { throw new Error('ERRO_ORIGINAL_DO_ENVIO') },
    falha: async () => { throw new Error('ERRO_AO_REGISTRAR_FALHA') },
  })
  const r = await despacharEnvio(deps, INPUT)
  assert.equal(r.ok, false)
  assert.equal(r.status, 'falha_envio')
  // o erro reportado é o ORIGINAL do envio, não o da RPC de falha
  assert.match((r as { erro: string }).erro, /ERRO_ORIGINAL_DO_ENVIO/)
  assert.doesNotMatch((r as { erro: string }).erro, /ERRO_AO_REGISTRAR_FALHA/)
  assert.equal(calls.falha.length, 1)     // tentou registrar a falha
})
