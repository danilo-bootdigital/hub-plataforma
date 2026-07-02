import test from 'node:test'
import assert from 'node:assert/strict'
import { conferir } from '../motor-regras'
import { resolverChecklist } from '../resolver-checklist'
import { montarDiagnostico } from '../diagnostico'
import { mapChecklistRows } from '../mapear-checklist'
import { montarLinhaConferencia, montarPendencias, resumoQuoteReceita } from '../persistencia'
import { mapOrcamentoContexto } from '../mapear-orcamento'
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

// ---- Diagnóstico da Receita (objeto estruturado) ----

test('diagnóstico: apta para conferência humana quando sem pendências', () => {
  const d = montarDiagnostico(conferir(entrada()))
  assert.equal(d.resultado, 'apta_para_conferencia_humana')
  assert.equal(d.aptaParaConferenciaHumana, true)
  assert.equal(d.score, 100)
  assert.equal(d.conferenciaDocumental.ok, true)
  assert.equal(d.conferenciaComercial.ok, true)
  assert.equal(d.orientacaoOperacional.itens.length, 0)
  assert.match(d.orientacaoOperacional.mensagem, /conferência humana/i)
})

test('diagnóstico: pendência documental (CRM) separada da comercial + ação clara', () => {
  const d = montarDiagnostico(conferir(entrada({ campos: { crm_uf: '' } })))
  assert.equal(d.resultado, 'necessita_correcao')
  assert.equal(d.conferenciaComercial.ok, true)
  assert.equal(d.conferenciaDocumental.ok, false)
  assert.ok(d.conferenciaDocumental.pendencias.some((p) => p.motivo === 'crm_uf_ausente'))
  assert.ok(d.orientacaoOperacional.itens.some((t) => /CRM/i.test(t)))
})

test('diagnóstico: divergência comercial (produto) separada da documental', () => {
  const d = montarDiagnostico(conferir(entrada({ itens: [{ descricao: 'Semaglutida', concentracao: '5 mg', quantidade: 1 }] })))
  assert.equal(d.resultado, 'necessita_correcao')
  assert.equal(d.conferenciaDocumental.ok, true)
  assert.equal(d.conferenciaComercial.ok, false)
  assert.ok(d.conferenciaComercial.pendencias.some((p) => p.motivo === 'produto_divergente'))
  assert.ok(d.orientacaoOperacional.itens.some((t) => /medicamento/i.test(t)))
})

test('diagnóstico: ilegível e revisão humana mapeiam corretamente', () => {
  assert.equal(montarDiagnostico(conferir(entrada({ confianca: 0.1 }))).resultado, 'ilegivel')
  assert.equal(montarDiagnostico(conferir(entrada({ confianca: 0.4 }))).resultado, 'necessita_revisao_humana')
})

// ---- Mapeamento das linhas do banco (checklists no BD, não no código) ----

test('mapChecklistRows: monta Checklist ordenado por ordem, config passthrough', () => {
  const checklists = [{ id: 'c1', escopo: 'produto', portfolio_id: null, produto_id: 'p1', versao: 2 }]
  const itens = [
    { checklist_id: 'c1', chave: 'b', rotulo: 'B', obrigatorio: true, tipo_regra: 'presenca', config_json: null, motivo: null, severidade: 'aviso', peso: 1, ordem: 2 },
    { checklist_id: 'c1', chave: 'a', rotulo: 'A', obrigatorio: true, tipo_regra: 'formato', config_json: { regex: 'x' }, motivo: 'crm_uf_ausente', severidade: 'critico', peso: 3, ordem: 1 },
    { checklist_id: 'cX', chave: 'z', rotulo: 'Z', obrigatorio: false, tipo_regra: 'presenca', config_json: null, motivo: null, severidade: 'info', peso: 1, ordem: 1 },
  ]
  const [cl] = mapChecklistRows(checklists, itens)
  assert.equal(cl.produtoId, 'p1')
  assert.equal(cl.versao, 2)
  assert.deepEqual(cl.itens.map((i) => i.chave), ['a', 'b']) // ordenado; item de outro checklist ignorado
  assert.equal(cl.itens[0].config.regex, 'x')
  assert.equal(cl.itens[0].motivo, 'crm_uf_ausente')
})

// ---- Persistência (mapper puro; a server action só faz os inserts) ----

test('montarLinhaConferencia mapeia status/score/confianca/extracao_json', () => {
  const ext = extracaoBoa()
  const resultado = conferir(entrada())
  const linha = montarLinhaConferencia(ext, resultado, {
    organization_id: 'org1', quote_receita_id: 'qr1', quote_id: 'q1',
    checklist_id: 'c1', checklist_versao: 1, provedor_ia: 'claude', modelo_ia: 'claude-opus-4-8',
    prompt_versao: 'extracao/v1', criado_por: 'u1',
  })
  assert.equal(linha.status_analise, resultado.status)
  assert.equal(linha.score, resultado.score)
  assert.equal(linha.confianca_extracao, ext.confianca)
  assert.equal(linha.provedor_ia, 'claude')
  assert.ok(linha.extracao_json.campos && Array.isArray(linha.extracao_json.itens))
  assert.equal(linha.provedor_ocr, null) // default
})

test('montarPendencias e resumoQuoteReceita', () => {
  const resultado = conferir(entrada({ campos: { crm_uf: '' } }))
  const pend = montarPendencias(resultado)
  assert.equal(pend.length, resultado.pendencias.length)
  assert.ok(pend.some((p) => p.motivo === 'crm_uf_ausente'))
  const resumo = resumoQuoteReceita(montarDiagnostico(resultado))
  assert.equal(resumo.status_fluxo, 'em_conferencia')
  assert.equal(resumo.status_analise_ia, resultado.status)
})

// ---- mapOrcamentoContexto (mapper puro; tirado de dentro da action) ----

test('mapOrcamentoContexto monta itens/cliente e resolve produtoId único', () => {
  const ctx = mapOrcamentoContexto(
    { portfolio_id: 'pf1', contato: { nome: 'Ana' } },
    [{ descricao: 'Tirzepatida', quantidade: '2', product_id: 'p1' }]
  )
  assert.equal(ctx.portfolioId, 'pf1')
  assert.equal(ctx.produtoId, 'p1')
  assert.equal(ctx.orcamento.nomeCliente, 'Ana')
  assert.equal(ctx.orcamento.itens[0].quantidade, 2) // string→number
  assert.equal(ctx.orcamento.itens[0].concentracao, null)
})

test('mapOrcamentoContexto: múltiplos produtos → produtoId null (cai p/ portfólio/organização)', () => {
  const ctx = mapOrcamentoContexto(
    { portfolio_id: null, contato: null },
    [
      { descricao: 'A', quantidade: 1, product_id: 'p1' },
      { descricao: 'B', quantidade: 1, product_id: 'p2' },
    ]
  )
  assert.equal(ctx.produtoId, null)
  assert.equal(ctx.portfolioId, null)
  assert.equal(ctx.orcamento.nomeCliente, null)
})
