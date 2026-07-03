// DEC-019 / MVP-4 — Schema + validação + prompt da extração (PUROS, sem SDK).
// O schema NÃO tem score/status/aprovação: a IA só extrai dados. "confianca" é a
// confiança da LEITURA (qualidade da extração), não um julgamento sobre a receita.

import type { ExtracaoReceita } from '../conferencia/tipos'

// Campos que a IA extrai (alinhados às chaves usadas pelos checklists no banco).
// medicamento/concentracao/quantidade também em `campos` (MVP-5′, Opção A): o fluxo
// standalone documental valida-os por 'valor_esperado'/'limite_maximo' (que leem `campos`).
// Continuam também em itens[] para o fluxo acoplado (comparacao_orcamento). Retrocompatível.
export const CAMPOS_EXTRACAO = [
  // Emitente / documento
  'prescritor_nome',
  'crm_uf',
  'emitente_cpf',
  'emitente_endereco',
  'emitente_cidade_uf',
  'emitente_telefone',
  'assinatura',
  'data_emissao',
  // Paciente
  'nome_paciente',
  'cpf_paciente',
  'paciente_documento',
  'paciente_data_nascimento',
  'paciente_endereco',
  'paciente_cidade_uf',
  // Medicamento / prescrição
  'medicamento',
  'concentracao',
  'quantidade',
  'posologia',
  'via_administracao',
] as const

// JSON Schema para saída estruturada / tool input. Strings vazias quando ausente
// (evita null-union); quantidade 0 quando desconhecida.
export const SCHEMA_EXTRACAO = {
  type: 'object',
  additionalProperties: false,
  properties: {
    campos: {
      type: 'object',
      additionalProperties: false,
      properties: Object.fromEntries(CAMPOS_EXTRACAO.map((c) => [c, { type: 'string' }])),
      required: [...CAMPOS_EXTRACAO],
    },
    itens: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          descricao: { type: 'string' },
          concentracao: { type: 'string' },
          quantidade: { type: 'number' },
        },
        required: ['descricao', 'concentracao', 'quantidade'],
      },
    },
    confianca: { type: 'number' },
  },
  required: ['campos', 'itens', 'confianca'],
}

export class ExtracaoInvalida extends Error {}

// Validação/normalização PURA do retorno da IA → entrada do motor. Sem regra de negócio.
export function parseExtracao(raw: unknown): ExtracaoReceita {
  if (typeof raw !== 'object' || raw === null) throw new ExtracaoInvalida('retorno não é objeto')
  const o = raw as Record<string, unknown>

  if (typeof o.campos !== 'object' || o.campos === null) throw new ExtracaoInvalida('campos ausente')
  const campos: Record<string, string> = {}
  for (const [k, v] of Object.entries(o.campos as Record<string, unknown>)) {
    campos[k] = v == null ? '' : String(v)
  }

  if (!Array.isArray(o.itens)) throw new ExtracaoInvalida('itens não é array')
  const itens = (o.itens as unknown[]).map((it) => {
    const i = (it ?? {}) as Record<string, unknown>
    const q = typeof i.quantidade === 'number' ? i.quantidade : i.quantidade == null ? null : Number(i.quantidade)
    return {
      descricao: i.descricao == null ? null : String(i.descricao),
      concentracao: i.concentracao == null ? null : String(i.concentracao),
      quantidade: q != null && Number.isNaN(q) ? null : q,
    }
  })

  const confianca = typeof o.confianca === 'number' ? o.confianca : Number(o.confianca)
  if (!Number.isFinite(confianca) || confianca < 0 || confianca > 1) {
    throw new ExtracaoInvalida('confianca inválida (esperado número 0..1)')
  }

  return { campos, itens, confianca }
}

export interface PromptExtracao {
  system: string
  instrucao: string
}

export function construirPromptExtracao(
  camposEsperados: readonly string[] = CAMPOS_EXTRACAO
): PromptExtracao {
  const system = [
    'Você é um EXTRATOR de dados de receitas médicas para um sistema de conferência.',
    'Sua ÚNICA função é LER o documento e EXTRAIR os campos solicitados em JSON.',
    'NÃO decida, NÃO aprove, NÃO calcule score, NÃO afirme se a receita é válida ou está correta.',
    'NÃO invente dados: se um campo não estiver presente ou legível, retorne string vazia.',
    '"confianca" (0..1) é apenas a SUA confiança na LEITURA/extração — não é um julgamento sobre a receita.',
  ].join(' ')
  const instrucao = [
    'Extraia os campos: ' + camposEsperados.join(', ') + '.',
    'A receita tem dois blocos de identificação: EMITENTE/PRESCRITOR (prescritor_nome, crm_uf, emitente_cpf, ' +
      'emitente_endereco, emitente_cidade_uf, emitente_telefone) e PACIENTE (nome_paciente, cpf_paciente, ' +
      'paciente_documento = RG ou CPF do paciente, paciente_data_nascimento, paciente_endereco, paciente_cidade_uf).',
    'Em "crm_uf" inclua SEMPRE o número de registro do CRM E a UF juntos (ex.: "104352/SP", "022516-DF") — ' +
      'NUNCA apenas a UF ("MG") nem apenas o número. Se o CRM e a UF aparecerem separados no documento, junte-os.',
    'Para "medicamento" use apenas o nome do medicamento/princípio ativo (sem a dose); ' +
      'para "concentracao" use apenas a dose (ex.: "5 mg"); para "quantidade" o número de unidades prescritas.',
    'Para "assinatura": preencha SOMENTE se houver, DE FATO, assinatura manuscrita, assinatura eletrônica/digital ' +
      '(ex.: carimbo gov.br/ICP-Brasil) OU um QR code de validação (receita digital) — descreva qual (ex.: "assinatura digital / QR code"). ' +
      'Se NÃO houver nenhuma dessas, retorne "assinatura" VAZIA (""). NÃO invente assinatura que não esteja visível no documento.',
    'Extraia também os itens (medicamentos) com descricao, concentracao e quantidade.',
    'Responda somente pela ferramenta de extração, no formato do schema. Use "" quando ausente e 0 para quantidade desconhecida.',
  ].join(' ')
  return { system, instrucao }
}
