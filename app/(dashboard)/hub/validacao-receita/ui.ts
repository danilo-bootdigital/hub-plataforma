// MVP-6 — Rótulos e mapeamentos visuais da Validação de Receita (puro, sem IO).
// Só apresentação: consome os valores já definidos no banco/motor, sem alterá-los.

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'secondary' | 'default'

export const RESULTADO_LABEL: Record<string, string> = {
  sem_pendencias_aparentes: 'Sem pendências aparentes',
  pendencias_encontradas: 'Pendências encontradas',
  ilegivel: 'Documento ilegível',
  precisa_de_revisao_humana: 'Necessita revisão humana',
}

export const RESULTADO_BADGE: Record<string, BadgeVariant> = {
  sem_pendencias_aparentes: 'success',
  pendencias_encontradas: 'warning',
  ilegivel: 'error',
  precisa_de_revisao_humana: 'info',
}

export const RESULTADO_EMOJI: Record<string, string> = {
  sem_pendencias_aparentes: '🟢',
  pendencias_encontradas: '🟡',
  ilegivel: '🔴',
  precisa_de_revisao_humana: '🔵',
}

export const STATUS_LABEL: Record<string, string> = {
  criada: 'Criada',
  aguardando_decisao: 'Aguardando decisão',
  aprovada: 'Aprovada',
  reprovada: 'Reprovada',
  devolvida_para_correcao: 'Devolvida para correção',
  erro: 'Erro no processamento',
}

export const STATUS_BADGE: Record<string, BadgeVariant> = {
  criada: 'secondary',
  aguardando_decisao: 'info',
  aprovada: 'success',
  reprovada: 'error',
  devolvida_para_correcao: 'warning',
  erro: 'error',
}

export const SEVERIDADE_BADGE: Record<string, BadgeVariant> = {
  critico: 'error',
  aviso: 'warning',
  info: 'info',
}

export const SEVERIDADE_ICONE: Record<string, string> = {
  critico: '⛔',
  aviso: '⚠️',
  info: 'ℹ️',
}

export const SEVERIDADE_LABEL: Record<string, string> = {
  critico: 'Crítico',
  aviso: 'Aviso',
  info: 'Informação',
}

// Informações técnicas — todos os campos extraídos (amigável, raw).
export const CAMPOS_ORDEM: Array<{ chave: string; label: string }> = [
  { chave: 'prescritor_nome', label: 'Emitente' },
  { chave: 'crm_uf', label: 'CRM' },
  { chave: 'emitente_cpf', label: 'CPF emitente' },
  { chave: 'emitente_endereco', label: 'Endereço emitente' },
  { chave: 'emitente_cidade_uf', label: 'Cidade/UF emitente' },
  { chave: 'emitente_telefone', label: 'Telefone emitente' },
  { chave: 'assinatura', label: 'Assinatura' },
  { chave: 'data_emissao', label: 'Data' },
  { chave: 'nome_paciente', label: 'Paciente' },
  { chave: 'paciente_documento', label: 'RG/CPF paciente' },
  { chave: 'paciente_data_nascimento', label: 'Nascimento' },
  { chave: 'paciente_endereco', label: 'Endereço paciente' },
  { chave: 'paciente_cidade_uf', label: 'Cidade/UF paciente' },
  { chave: 'medicamento', label: 'Medicamento' },
  { chave: 'concentracao', label: 'Concentração' },
  { chave: 'quantidade', label: 'Quantidade' },
  { chave: 'posologia', label: 'Posologia' },
  { chave: 'via_administracao', label: 'Via' },
]

export function fmtData(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function fmtConfianca(v: number | null): string {
  return v == null ? '—' : `${Math.round(v * 100)}%`
}

// --- Resultado principal (linguagem do operador; sem "Diagnóstico") ---
export function receitaAprovavel(resultado: string | null): boolean {
  return resultado === 'sem_pendencias_aparentes'
}
export function tituloResultado(resultado: string | null): string {
  if (!resultado) return 'Análise não executada'
  return receitaAprovavel(resultado)
    ? 'Receita pronta para conferência humana'
    : 'Receita precisa de correção'
}

// --- Checklist visual (✅/❌) derivado de campos extraídos + pendências (sem backend) ---
// ✅ = campo CRÍTICO presente e sem pendência (conciso) · ❌ = cada pendência (todas as severidades).
const CAMPO_OK_LABEL: Array<{ chave: string; label: string }> = [
  { chave: 'prescritor_nome', label: 'Emitente identificado' },
  { chave: 'crm_uf', label: 'CRM encontrado' },
  { chave: 'assinatura', label: 'Assinatura encontrada' },
  { chave: 'nome_paciente', label: 'Paciente identificado' },
  { chave: 'medicamento', label: 'Medicamento informado' },
  { chave: 'concentracao', label: 'Concentração informada' },
  { chave: 'quantidade', label: 'Quantidade informada' },
  { chave: 'posologia', label: 'Posologia informada' },
]

// --- Grupos de exibição do resultado (só apresentação) ---
export const GRUPOS_CAMPOS: Array<{ titulo: string; campos: Array<{ chave: string; label: string }> }> = [
  {
    titulo: 'Documento / Emitente',
    campos: [
      { chave: 'prescritor_nome', label: 'Nome' },
      { chave: 'crm_uf', label: 'CRM' },
      { chave: 'emitente_cpf', label: 'CPF' },
      { chave: 'emitente_endereco', label: 'Endereço' },
      { chave: 'emitente_cidade_uf', label: 'Cidade/UF' },
      { chave: 'emitente_telefone', label: 'Telefone' },
    ],
  },
  {
    titulo: 'Paciente',
    campos: [
      { chave: 'nome_paciente', label: 'Nome completo' },
      { chave: 'paciente_documento', label: 'RG/CPF' },
      { chave: 'paciente_data_nascimento', label: 'Data de nascimento' },
      { chave: 'paciente_endereco', label: 'Endereço' },
      { chave: 'paciente_cidade_uf', label: 'Cidade/UF' },
    ],
  },
]

// Grupo Medicamento (Produto vem do registro; demais dos campos extraídos).
export const CAMPOS_MEDICAMENTO: Array<{ chave: string; label: string }> = [
  { chave: 'concentracao', label: 'Concentração' },
  { chave: 'quantidade', label: 'Quantidade' },
  { chave: 'posologia', label: 'Posologia' },
]

// --- Comparação de Posologia (consultiva) ---
export const COMPARACAO_LABEL: Record<string, string> = {
  compativel: 'Compatível',
  diferenca_encontrada: 'Diferença encontrada',
  nao_foi_possivel_comparar: 'Não foi possível comparar',
}
export const COMPARACAO_EMOJI: Record<string, string> = {
  compativel: '🟢',
  diferenca_encontrada: '🟡',
  nao_foi_possivel_comparar: '⚪',
}

type PendenciaMin = { chave: string | null; mensagem: string; severidade: string }

export function montarChecklistVisual(
  campos: Record<string, string>,
  pendencias: PendenciaMin[]
): { aprovados: string[]; reprovados: Array<{ texto: string; severidade: string }> } {
  const chavesComPendencia = new Set(pendencias.map((p) => p.chave).filter(Boolean) as string[])
  const aprovados = CAMPO_OK_LABEL
    .filter((c) => (campos[c.chave] ?? '').trim() !== '' && !chavesComPendencia.has(c.chave))
    .map((c) => c.label)
  const reprovados = pendencias.map((p) => ({ texto: p.mensagem, severidade: p.severidade }))
  return { aprovados, reprovados }
}
