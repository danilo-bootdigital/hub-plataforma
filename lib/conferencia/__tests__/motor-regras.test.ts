import test from 'node:test'
import assert from 'node:assert/strict'
import { conferir } from '../motor-regras'
import { resolverChecklist } from '../resolver-checklist'
import type { Checklist, EntradaMotor, ExtracaoReceita, OrcamentoContexto } from '../tipos'

// --- Fixture: checklist de Tirzepatida (DEC-019 §9), escopo produto ---
const checklistTirzepatida: Checklist = {
  escopo: 'produto',
  produtoId: 'prod-tirze',
  versao: 1,
  itens: [
    { chave: 'nome_paciente', rotulo: 'Paciente', obrigatorio: true, tipoRegra: 'presenca', config: {}, motivo: 'paciente_ausente', severidade: 'critico', peso: 3 },
    { chave: 'prescritor_nome', rotulo: 'Prescritor', obrigatorio: true, tipoRegra: 'presenca', config: {}, motivo: 'outro', severidade: 'critico', peso: 3 },
    { chave: 'crm_uf', rotulo: 'CRM/UF', obrigatorio: true, tipoRegra: 'formato', config: { regex: 'CRM \\d+/[A-Z]{2}' }, motivo: 'crm_uf_ausente', severidade: 'critico', peso: 3 },
    { chave: 'cpf_paciente', rotulo: 'CPF', obrigatorio: true, tipoRegra: 'presenca', config: {}, motivo: 'cpf_ausente_obrigatorio', severidade: 'aviso', peso: 1 },
    { chave: 'data_emissao', rotulo: 'Data de emissão', obrigatorio: true, tipoRegra: 'formato', config: { validadeDias: 90 }, motivo: 'data_ausente', severidade: 'aviso', peso: 1 },
    { chave: 'medicamento', rotulo: 'Medicamento', obrigatorio: true, tipoRegra: 'comparacao_orcamento', config: { alvo: 'produto' }, motivo: 'produto_divergente', severidade: 'critico', peso: 3 },
    { chave: 'concentracao_dose', rotulo: 'Concentração', obrigatorio: true, tipoRegra: 'comparacao_orcamento', config: { alvo: 'concentracao' }, motivo: 'concentracao_divergente', severidade: 'critico', peso: 3 },
    { chave: 'quantidade', rotulo: 'Quantidade', obrigatorio: true, tipoRegra: 'comparacao_orcamento', config: { alvo: 'quantidade', tolerancia: 0 }, motivo: 'quantidade_divergente', severidade: 'critico', peso: 3 },
    { chave: 'posologia', rotulo: 'Posologia', obrigatorio: true, tipoRegra: 'presenca', config: {}, motivo: 'posologia_ausente', severidade: 'aviso', peso: 1 },
    { chave: 'via_administracao', rotulo: 'Via', obrigatorio: false, tipoRegra: 'valor_esperado', config: { valores: ['subcutanea'] }, motivo: 'outro', severidade: 'info', peso: 1 },
    { chave: 'assinatura', rotulo: 'Assinatura', obrigatorio: true, tipoRegra: 'presenca', config: {}, motivo: 'assinatura_ausente', severidade: 'critico', peso: 3 },
  ],
}

const orcamentoBase: OrcamentoContexto = {
  itens: [{ descricao: 'Tirzepatida', concentracao: '5 mg', quantidade: 1 }],
  nomeCliente: 'Joaquim Silva',
}

function extracaoBoa(): ExtracaoReceita {
  return {
    campos: {
      nome_paciente: 'Joaquim Silva', prescritor_nome: 'Dr. Fulano',
      crm_uf: 'CRM 123456/SP', cpf_paciente: '100.100.100-10',
      data_emissao: '2026-06-15', posologia: 'aplicar 1x/semana',
      via_administracao: 'Subcutânea', assinatura: 'assinado',
    },
    itens: [{ descricao: 'Tirzepatida', concentracao: '5 mg', quantidade: 1 }],
    confianca: 0.95,
  }
}

function entrada(over: Partial<ExtracaoReceita> = {}, hoje = '2026-07-02'): EntradaMotor {
  const base = extracaoBoa()
  return {
    checklist: checklistTirzepatida,
    extracao: { ...base, ...over, campos: { ...base.campos, ...(over.campos ?? {}) } },
    orcamento: orcamentoBase,
    hoje,
  }
}

const motivos = (r: ReturnType<typeof conferir>) => r.pendencias.map((p) => p.motivo)

test('receita completa e coerente → sem pendências aparentes, score 100', () => {
  const r = conferir(entrada())
  assert.equal(r.status, 'sem_pendencias_aparentes')
  assert.equal(r.score, 100)
  assert.equal(r.pendencias.length, 0)
})

test('CRM ausente → pendências encontradas, motivo crm_uf_ausente', () => {
  const r = conferir(entrada({ campos: { crm_uf: '' } }))
  assert.equal(r.status, 'pendencias_encontradas')
  assert.ok(motivos(r).includes('crm_uf_ausente'))
  assert.equal(r.pendencias.find((p) => p.motivo === 'crm_uf_ausente')?.tipo, 'campo_ausente')
})

test('assinatura ausente → pendências encontradas, motivo assinatura_ausente', () => {
  const r = conferir(entrada({ campos: { assinatura: '' } }))
  assert.equal(r.status, 'pendencias_encontradas')
  assert.ok(motivos(r).includes('assinatura_ausente'))
})

test('produto divergente → divergente do orçamento', () => {
  const r = conferir(entrada({ itens: [{ descricao: 'Semaglutida', concentracao: '5 mg', quantidade: 1 }] }))
  assert.equal(r.status, 'divergente_do_orcamento')
  assert.ok(motivos(r).includes('produto_divergente'))
})

test('concentração divergente → divergente do orçamento', () => {
  const r = conferir(entrada({ itens: [{ descricao: 'Tirzepatida', concentracao: '10 mg', quantidade: 1 }] }))
  assert.equal(r.status, 'divergente_do_orcamento')
  assert.ok(motivos(r).includes('concentracao_divergente'))
})

test('quantidade fora da tolerância → divergente do orçamento', () => {
  const r = conferir(entrada({ itens: [{ descricao: 'Tirzepatida', concentracao: '5 mg', quantidade: 3 }] }))
  assert.equal(r.status, 'divergente_do_orcamento')
  assert.ok(motivos(r).includes('quantidade_divergente'))
})

test('receita vencida (> 90 dias) → pendências encontradas, motivo receita_vencida', () => {
  const r = conferir(entrada({ campos: { data_emissao: '2026-01-01' } }, '2026-07-02'))
  assert.equal(r.status, 'pendencias_encontradas')
  assert.ok(motivos(r).includes('receita_vencida'))
})

test('baixa confiança (legível) → precisa de revisão humana', () => {
  const r = conferir(entrada({ confianca: 0.4 }))
  assert.equal(r.status, 'precisa_de_revisao_humana')
})

test('confiança muito baixa → ilegível, motivo documento_ilegivel', () => {
  const r = conferir(entrada({ confianca: 0.1 }))
  assert.equal(r.status, 'ilegivel')
  assert.ok(motivos(r).includes('documento_ilegivel'))
})

test('score nunca fica negativo (clamp em 0)', () => {
  const r = conferir(entrada({ campos: { crm_uf: '', assinatura: '', nome_paciente: '', prescritor_nome: '' } }))
  assert.ok(r.score >= 0)
  assert.equal(r.score, 0)
})

test('resolverChecklist: produto vence portfólio vence organização', () => {
  const cands: Checklist[] = [
    { escopo: 'organizacao', itens: [] },
    { escopo: 'portfolio', portfolioId: 'pf1', itens: [] },
    { escopo: 'produto', produtoId: 'pr1', itens: [] },
  ]
  assert.equal(resolverChecklist(cands, { produtoId: 'pr1', portfolioId: 'pf1' })?.escopo, 'produto')
  assert.equal(resolverChecklist(cands, { produtoId: 'prX', portfolioId: 'pf1' })?.escopo, 'portfolio')
  assert.equal(resolverChecklist(cands, { produtoId: 'prX', portfolioId: 'pfX' })?.escopo, 'organizacao')
  assert.equal(resolverChecklist([{ escopo: 'produto', produtoId: 'pr1', itens: [] }], {}), null)
})
