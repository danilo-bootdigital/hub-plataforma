import test from 'node:test'
import assert from 'node:assert/strict'
import { parseExtracao, construirPromptExtracao, SCHEMA_EXTRACAO, ExtracaoInvalida, CAMPOS_EXTRACAO } from '../schema-extracao'
import { MockExtrator } from '../provedores/mock'
import { conferir } from '../../conferencia/motor-regras'
import { montarDiagnostico } from '../../conferencia/diagnostico'
import type { Checklist, OrcamentoContexto, ExtracaoReceita } from '../../conferencia/tipos'

// Checklist mínimo (documental + comercial) para exercitar o pipeline.
const checklist: Checklist = {
  escopo: 'organizacao',
  itens: [
    { chave: 'nome_paciente', rotulo: 'Paciente', obrigatorio: true, tipoRegra: 'presenca', config: {}, motivo: 'paciente_ausente', severidade: 'critico', peso: 3 },
    { chave: 'crm_uf', rotulo: 'CRM/UF', obrigatorio: true, tipoRegra: 'formato', config: { regex: 'CRM \\d+/[A-Z]{2}' }, motivo: 'crm_uf_ausente', severidade: 'critico', peso: 3 },
    { chave: 'medicamento', rotulo: 'Medicamento', obrigatorio: true, tipoRegra: 'comparacao_orcamento', config: { alvo: 'produto' }, motivo: 'produto_divergente', severidade: 'critico', peso: 3 },
  ],
}
const orcamento: OrcamentoContexto = {
  itens: [{ descricao: 'Tirzepatida', concentracao: '5 mg', quantidade: 1 }],
  nomeCliente: 'Ana Souza',
}

function extracaoBoa(): ExtracaoReceita {
  return {
    campos: { nome_paciente: 'Ana Souza', crm_uf: 'CRM 111/SP' },
    itens: [{ descricao: 'Tirzepatida', concentracao: '5 mg', quantidade: 1 }],
    confianca: 0.9,
  }
}

// ---- Schema / validação ----

test('schema não contém score/status/aprovação (IA só extrai)', () => {
  const s = JSON.stringify(SCHEMA_EXTRACAO).toLowerCase()
  assert.ok(!/score|status|aprov/.test(s), 'schema não deve ter campos de decisão')
  assert.deepEqual(Object.keys((SCHEMA_EXTRACAO as { properties: Record<string, unknown> }).properties).sort(), ['campos', 'confianca', 'itens'])
})

test('parseExtracao aceita retorno válido e normaliza', () => {
  const raw = {
    campos: Object.fromEntries(CAMPOS_EXTRACAO.map((c) => [c, ''])),
    itens: [{ descricao: 'Tirzepatida', concentracao: '5 mg', quantidade: 1 }],
    confianca: 0.85,
  }
  const e = parseExtracao(raw)
  assert.equal(e.confianca, 0.85)
  assert.equal(e.itens[0].descricao, 'Tirzepatida')
})

test('parseExtracao rejeita confiança fora de 0..1', () => {
  assert.throws(() => parseExtracao({ campos: {}, itens: [], confianca: 2 }), ExtracaoInvalida)
})

test('parseExtracao rejeita itens não-array e campos ausente', () => {
  assert.throws(() => parseExtracao({ campos: {}, itens: {}, confianca: 0.5 }), ExtracaoInvalida)
  assert.throws(() => parseExtracao({ itens: [], confianca: 0.5 }), ExtracaoInvalida)
})

// ---- Prompt (sem linguagem de decisão) ----

test('prompt instrui apenas extração, sem decidir/aprovar/score', () => {
  const { system, instrucao } = construirPromptExtracao()
  assert.match(system, /não decida/i)
  assert.match(system, /não aprove/i)
  assert.match(system, /não calcule score/i)
  assert.match(instrucao, /nome_paciente/)
})

// ---- Pipeline: IA (mock) ALIMENTA o motor; motor + diagnóstico decidem ----

test('IA (mock) → motor → Diagnóstico: extração boa vira apta para conferência humana', async () => {
  const ext = await new MockExtrator(extracaoBoa()).extrair({ arquivo: { base64: 'x', mime: 'application/pdf' } })
  const diag = montarDiagnostico(conferir({ checklist, extracao: ext, orcamento, hoje: '2026-07-02' }))
  assert.equal(diag.resultado, 'apta_para_conferencia_humana')
  assert.equal(diag.aptaParaConferenciaHumana, true)
})

test('IA (mock) → motor → Diagnóstico: extração com CRM ausente vira necessita correção', async () => {
  const ruim = { ...extracaoBoa(), campos: { nome_paciente: 'Ana Souza', crm_uf: '' } }
  const ext = await new MockExtrator(ruim).extrair({ texto: 'ocr...' })
  const diag = montarDiagnostico(conferir({ checklist, extracao: ext, orcamento, hoje: '2026-07-02' }))
  assert.equal(diag.resultado, 'necessita_correcao')
  assert.ok(diag.conferenciaDocumental.pendencias.some((p) => p.motivo === 'crm_uf_ausente'))
})

test('retorno cru da IA (parseExtracao) alimenta o motor de ponta a ponta', () => {
  const raw = {
    campos: Object.fromEntries(CAMPOS_EXTRACAO.map((c) => [c, c === 'nome_paciente' ? 'Ana Souza' : c === 'crm_uf' ? 'CRM 111/SP' : ''])),
    itens: [{ descricao: 'Semaglutida', concentracao: '5 mg', quantidade: 1 }], // produto divergente
    confianca: 0.9,
  }
  const diag = montarDiagnostico(conferir({ checklist, extracao: parseExtracao(raw), orcamento, hoje: '2026-07-02' }))
  assert.equal(diag.resultado, 'necessita_correcao')
  assert.equal(diag.conferenciaComercial.ok, false)
})
