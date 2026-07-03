import test from 'node:test'
import assert from 'node:assert/strict'
import { conferir } from '../motor-regras'
import { resolverChecklist } from '../resolver-checklist'
import { montarDiagnostico } from '../diagnostico'
import { mapChecklistRows } from '../mapear-checklist'
import { montarLinhaConferencia, montarPendencias, resumoQuoteReceita } from '../persistencia'
import { mapOrcamentoContexto } from '../mapear-orcamento'
import { hidratarChecklistComMetadadosProduto, type MetadadoValidacao } from '../hidratar-checklist'
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

// ---- MVP-5′ (DEC-019 emenda): regra limite_maximo + diagnóstico documental-only ----

// Checklist standalone (independente do orçamento): valor_esperado p/ medicamento
// + limite_maximo p/ quantidade. Sem itens comparacao_orcamento.
const checklistStandalone: Checklist = {
  escopo: 'produto',
  produtoId: 'prod-tirze',
  versao: 1,
  itens: [
    { chave: 'medicamento', rotulo: 'Medicamento', obrigatorio: true, tipoRegra: 'valor_esperado', config: { valores: ['tirzepatida', 'mounjaro'] }, motivo: 'produto_divergente', severidade: 'critico', peso: 3 },
    { chave: 'concentracao', rotulo: 'Concentração', obrigatorio: true, tipoRegra: 'valor_esperado', config: { valores: ['5 mg', '10 mg'] }, motivo: 'concentracao_divergente', severidade: 'critico', peso: 3 },
    { chave: 'quantidade', rotulo: 'Quantidade', obrigatorio: true, tipoRegra: 'limite_maximo', config: { campo: 'quantidade', limiteMaximo: 3 }, motivo: 'limite_maximo_excedido', severidade: 'critico', peso: 3 },
  ],
}

function entradaStandalone(campos: Record<string, string | number> = {}): EntradaMotor {
  return {
    checklist: checklistStandalone,
    extracao: {
      campos: { medicamento: 'Tirzepatida', concentracao: '5 mg', quantidade: 1, ...campos },
      itens: [{ descricao: 'Tirzepatida', concentracao: '5 mg', quantidade: 1 }],
      confianca: 0.95,
    },
    orcamento: { itens: [] }, // standalone: sem orçamento
    hoje: '2026-07-02',
  }
}

test('limite_maximo: quantidade dentro do limite → sem pendências', () => {
  const r = conferir(entradaStandalone({ quantidade: 3 }))
  assert.equal(r.status, 'sem_pendencias_aparentes')
  assert.equal(r.pendencias.length, 0)
})

test('limite_maximo: quantidade acima do limite → pendência documental (formato_invalido)', () => {
  const r = conferir(entradaStandalone({ quantidade: 5 }))
  assert.equal(r.status, 'pendencias_encontradas')
  const p = r.pendencias.find((x) => x.motivo === 'limite_maximo_excedido')
  assert.ok(p)
  assert.equal(p?.tipo, 'formato_invalido')
  assert.equal(p?.esperado, '<= 3')
  assert.equal(p?.encontrado, '5')
})

test('limite_maximo: NÃO gera divergência de orçamento (status nunca divergente)', () => {
  const r = conferir(entradaStandalone({ quantidade: 9 }))
  assert.notEqual(r.status, 'divergente_do_orcamento')
  assert.ok(!r.pendencias.some((p) => p.tipo === 'divergencia'))
})

test('valor_esperado: medicamento ausente → pendência documental (campo_ausente, produto_divergente)', () => {
  const r = conferir(entradaStandalone({ medicamento: '' }))
  assert.equal(r.status, 'pendencias_encontradas')
  const p = r.pendencias.find((x) => x.motivo === 'produto_divergente')
  assert.ok(p)
  assert.equal(p?.tipo, 'campo_ausente')
  assert.ok(!r.pendencias.some((x) => x.tipo === 'divergencia')) // documental, não comercial
})

test('valor_esperado: medicamento diferente do esperado → pendência (formato_invalido, produto_divergente)', () => {
  const r = conferir(entradaStandalone({ medicamento: 'Semaglutida' }))
  assert.equal(r.status, 'pendencias_encontradas')
  const p = r.pendencias.find((x) => x.motivo === 'produto_divergente')
  assert.ok(p)
  assert.equal(p?.tipo, 'formato_invalido')
  assert.notEqual(r.status, 'divergente_do_orcamento')
})

test('valor_esperado: concentração ausente → pendência documental (campo_ausente, concentracao_divergente)', () => {
  const r = conferir(entradaStandalone({ concentracao: '' }))
  assert.equal(r.status, 'pendencias_encontradas')
  const p = r.pendencias.find((x) => x.motivo === 'concentracao_divergente')
  assert.ok(p)
  assert.equal(p?.tipo, 'campo_ausente')
})

test('valor_esperado: concentração diferente da esperada → pendência (formato_invalido, concentracao_divergente)', () => {
  const r = conferir(entradaStandalone({ concentracao: '20 mg' }))
  assert.equal(r.status, 'pendencias_encontradas')
  const p = r.pendencias.find((x) => x.motivo === 'concentracao_divergente')
  assert.ok(p)
  assert.equal(p?.tipo, 'formato_invalido')
})

// ---- Metadados de validação por produto: hidratação (origemValores) + motor agnóstico ----

// Checklist cujas regras NÃO têm valores/limite literais: vêm de product_validation_metadata.
const checklistMeta: Checklist = {
  escopo: 'produto',
  produtoId: 'prod-tirze',
  versao: 1,
  itens: [
    { chave: 'medicamento', rotulo: 'Medicamento', obrigatorio: true, tipoRegra: 'valor_esperado', config: { origemValores: 'medicamento_aliases' }, motivo: 'produto_divergente', severidade: 'critico', peso: 3 },
    { chave: 'concentracao', rotulo: 'Concentração', obrigatorio: true, tipoRegra: 'valor_esperado', config: { origemValores: 'concentracoes_permitidas' }, motivo: 'concentracao_divergente', severidade: 'critico', peso: 3 },
    { chave: 'via_administracao', rotulo: 'Via', obrigatorio: false, tipoRegra: 'valor_esperado', config: { origemValores: 'vias_permitidas' }, motivo: 'outro', severidade: 'info', peso: 1 },
    { chave: 'quantidade', rotulo: 'Quantidade', obrigatorio: true, tipoRegra: 'limite_maximo', config: { campo: 'quantidade', origemValores: 'limite_maximo_por_receita' }, motivo: 'limite_maximo_excedido', severidade: 'critico', peso: 3 },
  ],
}

// Metadados típicos da Tirzepatida.
const metaTirze: MetadadoValidacao[] = [
  { chave: 'medicamento_aliases', tipo: 'lista', valores: ['Mounjaro', 'Zepbound'], ativo: true },
  { chave: 'concentracoes_permitidas', tipo: 'lista', valores: ['2.5 mg', '5 mg', '10 mg'], ativo: true },
  { chave: 'vias_permitidas', tipo: 'lista', valores: ['subcutanea'], ativo: true },
  { chave: 'limite_maximo_por_receita', tipo: 'numero', valorNum: 3, ativo: true },
]

function entradaMeta(cl: Checklist, campos: Record<string, string | number>): EntradaMotor {
  return {
    checklist: cl,
    extracao: {
      campos: { medicamento: 'Mounjaro', concentracao: '5 mg', via_administracao: 'Subcutânea', quantidade: 1, ...campos },
      itens: [],
      confianca: 0.95,
    },
    orcamento: { itens: [] },
    hoje: '2026-07-02',
  }
}

const temMotivo = (r: ReturnType<typeof conferir>, m: string) => r.pendencias.some((p) => p.motivo === m)

test('metadados: medicamento valida por alias (Mounjaro) e inclui product.nome implícito', () => {
  const cl = hidratarChecklistComMetadadosProduto(checklistMeta, { nome: 'Tirzepatida' }, metaTirze)
  assert.deepEqual(cl.itens[0].config.valores, ['Tirzepatida', 'Mounjaro', 'Zepbound'])
  assert.equal(temMotivo(conferir(entradaMeta(cl, { medicamento: 'Tirzepatida' })), 'produto_divergente'), false)
  assert.equal(temMotivo(conferir(entradaMeta(cl, { medicamento: 'Mounjaro' })), 'produto_divergente'), false)
})

test('metadados: medicamento de outro produto FALHA (produto_divergente)', () => {
  const cl = hidratarChecklistComMetadadosProduto(checklistMeta, { nome: 'Tirzepatida' }, metaTirze)
  const r = conferir(entradaMeta(cl, { medicamento: 'Semaglutida' }))
  const p = r.pendencias.find((x) => x.motivo === 'produto_divergente')
  assert.ok(p)
  assert.equal(p?.tipo, 'formato_invalido')
})

test('metadados: concentração permitida passa; não permitida falha', () => {
  const cl = hidratarChecklistComMetadadosProduto(checklistMeta, { nome: 'Tirzepatida' }, metaTirze)
  assert.equal(temMotivo(conferir(entradaMeta(cl, { concentracao: '10 mg' })), 'concentracao_divergente'), false)
  const r = conferir(entradaMeta(cl, { concentracao: '20 mg' }))
  assert.equal(temMotivo(r, 'concentracao_divergente'), true)
  assert.equal(r.pendencias.find((p) => p.motivo === 'concentracao_divergente')?.tipo, 'formato_invalido')
})

test('metadados: via permitida (subcutanea) passa', () => {
  const cl = hidratarChecklistComMetadadosProduto(checklistMeta, { nome: 'Tirzepatida' }, metaTirze)
  assert.equal(cl.itens[2].config.valores?.includes('subcutanea'), true)
  assert.equal(conferir(entradaMeta(cl, { via_administracao: 'Subcutânea' })).pendencias.length, 0)
})

test('metadados: limite_maximo hidratado (valor_num=3) → 5 excede', () => {
  const cl = hidratarChecklistComMetadadosProduto(checklistMeta, { nome: 'Tirzepatida' }, metaTirze)
  assert.equal(cl.itens[3].config.limiteMaximo, 3)
  const r = conferir(entradaMeta(cl, { quantidade: 5 }))
  const p = r.pendencias.find((x) => x.motivo === 'limite_maximo_excedido')
  assert.ok(p)
  assert.equal(p?.encontrado, '5')
})

test('metadados: metadado INATIVO é ignorado (medicamento cai só para product.nome)', () => {
  const meta: MetadadoValidacao[] = [{ chave: 'medicamento_aliases', tipo: 'lista', valores: ['Mounjaro'], ativo: false }]
  const cl = hidratarChecklistComMetadadosProduto(checklistMeta, { nome: 'Tirzepatida' }, meta)
  assert.deepEqual(cl.itens[0].config.valores, undefined) // ausente/inativo → não injeta
  // 'Mounjaro' não valida (metadado inativo); só 'Tirzepatida' (nome) validaria se houvesse hidratação
  assert.equal(temMotivo(conferir(entradaMeta(cl, { medicamento: 'Mounjaro' })), 'produto_divergente'), false) // motor no-op sem valores
})

test('metadados: MOTOR não conhece product_validation_metadata (sem hidratar → não valida por marca)', () => {
  // Sem hidratação, config.valores/limiteMaximo ficam indefinidos → o motor não busca metadados:
  // valor_esperado com permitidos=[] e limite_maximo sem número viram no-op. Prova o desacoplamento.
  const r = conferir(entradaMeta(checklistMeta, { medicamento: 'Semaglutida', concentracao: '20 mg', quantidade: 99 }))
  assert.equal(temMotivo(r, 'produto_divergente'), false)
  assert.equal(temMotivo(r, 'concentracao_divergente'), false)
  assert.equal(temMotivo(r, 'limite_maximo_excedido'), false)
})

// ---- CRM/UF: regex tolerante a separadores (número + UF ainda obrigatórios) ----

const UF = 'AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO'
// Separador = qualquer sequência não-alfanumérica (espaço, hífen ASCII, traço unicode "–", "/", ".", ":").
const REGEX_CRM = `(\\d{4,7}[^0-9A-Za-z]+(${UF}))|((${UF})[^0-9A-Za-z]+\\d{4,7})`
const checklistCrm: Checklist = {
  escopo: 'organizacao',
  itens: [{ chave: 'crm_uf', rotulo: 'CRM/UF', obrigatorio: true, tipoRegra: 'formato', config: { regex: REGEX_CRM }, motivo: 'crm_uf_ausente', severidade: 'critico', peso: 3 }],
}
const crmInvalido = (v: string) =>
  conferir({ checklist: checklistCrm, extracao: { campos: { crm_uf: v }, itens: [], confianca: 0.95 }, orcamento: { itens: [] }, hoje: '2026-07-02' })
    .pendencias.some((p) => p.motivo === 'crm_uf_ausente' && p.tipo === 'formato_invalido')

test('CRM/UF aceita variações (número+UF e UF+número, separadores diversos)', () => {
  for (const v of [
    'CRM 104352/SP', 'CRM: 104352/SP', 'CRM 104352 - SP', 'CRM: 104352 - SP', '104352/SP', '104352 - SP',
    'CRM: MG 46173', 'CRM MG 46173', 'MG 46173', 'CRM/MG 46173', 'SP/104352',
    '022516-DF', 'CRM: 022516-DF', '022516–DF', '022516 – DF', '022516-df', 'CRM 022516 DF',
  ]) {
    assert.equal(crmInvalido(v), false, `deveria aceitar: ${v}`)
  }
})

test('CRM/UF ainda exige número + UF real', () => {
  assert.equal(crmInvalido('104352'), true)        // sem UF
  assert.equal(crmInvalido('CRM 104352'), true)    // "RM" não é UF válida
  assert.equal(crmInvalido('CRM: XY 46173'), true) // XY não é UF
})

// ---- Via de administração: valor_esperado com contem (token/substring) ----

const checklistVia: Checklist = {
  escopo: 'organizacao',
  itens: [{ chave: 'via_administracao', rotulo: 'Via de administração', obrigatorio: false, tipoRegra: 'valor_esperado', config: { valores: ['subcutânea', 'SC', 'via subcutânea', 'via SC'], contem: true }, motivo: 'outro', severidade: 'info', peso: 1 }],
}
const viaInvalida = (v: string) =>
  conferir({ checklist: checklistVia, extracao: { campos: { via_administracao: v }, itens: [], confianca: 0.95 }, orcamento: { itens: [] }, hoje: '2026-07-02' })
    .pendencias.some((p) => p.tipo === 'formato_invalido')

test('via (contem): aceita equivalências e compostos', () => {
  for (const v of ['via sc / subcutânea', 'SC', 'S.C.', 'subcutânea', 'subcutanea', 'via subcutânea', 'via sc']) {
    assert.equal(viaInvalida(v), false, `deveria aceitar via: ${v}`)
  }
})

test('via (contem): rejeita via realmente diferente', () => {
  assert.equal(viaInvalida('endovenosa'), true)
})

test('diagnóstico documental-only: toda pendência é documental, comercial vazia', () => {
  // mesmo com uma divergência comercial no resultado, documentalOnly a trata como documental
  const resultado = conferir(entrada({ itens: [{ descricao: 'Semaglutida', concentracao: '5 mg', quantidade: 1 }] }))
  const d = montarDiagnostico(resultado, { documentalOnly: true })
  assert.equal(d.conferenciaComercial.ok, true)
  assert.equal(d.conferenciaComercial.pendencias.length, 0)
  assert.equal(d.conferenciaDocumental.ok, false)
  assert.ok(d.conferenciaDocumental.pendencias.some((p) => p.motivo === 'produto_divergente'))
})

test('diagnóstico documental-only: limite_maximo excedido gera ação clara', () => {
  const d = montarDiagnostico(conferir(entradaStandalone({ quantidade: 5 })), { documentalOnly: true })
  assert.equal(d.resultado, 'necessita_correcao')
  assert.equal(d.conferenciaComercial.ok, true)
  assert.ok(d.orientacaoOperacional.itens.some((t) => /limite m[aá]ximo/i.test(t)))
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
