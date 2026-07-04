// DEC-020 — Cadastro de Clientes: constantes de documentos, status e labels.
// Módulo puro (sem 'use server') — importável por client e server components.

import type {
  OnboardingStatus,
  TipoPessoaOnboarding,
  TipoDocumentoOnboarding,
} from '@/types/database'

export const TIPOS_ARQUIVO_ACEITOS = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp']
export const TAMANHO_MAX_ARQUIVO = 10 * 1024 * 1024 // 10MB

export type DocumentoDef = { tipo: TipoDocumentoOnboarding; rotulo: string }

// Documentos obrigatórios por tipo de pessoa (espelha a validação da RPC hub_onboarding_enviar).
export const DOCUMENTOS_PF: DocumentoDef[] = [
  { tipo: 'comprovante_endereco', rotulo: 'Comprovante de endereço' },
  { tipo: 'crm_frente', rotulo: 'Carteirinha do Conselho (Frente)' },
  { tipo: 'crm_verso', rotulo: 'Carteirinha do Conselho (Verso)' },
]

export const DOCUMENTOS_PJ: DocumentoDef[] = [
  { tipo: 'comprovante_endereco', rotulo: 'Comprovante de endereço' },
  { tipo: 'contrato_social', rotulo: 'Contrato Social' },
  { tipo: 'alvara_funcionamento', rotulo: 'Alvará de Funcionamento' },
  { tipo: 'alvara_vigilancia_sanitaria', rotulo: 'Alvará da Vigilância Sanitária' },
  { tipo: 'crm_frente', rotulo: 'Carteirinha do Conselho (Frente)' },
  { tipo: 'crm_verso', rotulo: 'Carteirinha do Conselho (Verso)' },
]

export function documentosObrigatorios(tipo: TipoPessoaOnboarding): DocumentoDef[] {
  return tipo === 'fisica' ? DOCUMENTOS_PF : DOCUMENTOS_PJ
}

export const STATUS_LABEL: Record<OnboardingStatus, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado para Indústria',
  em_analise: 'Em análise pela Indústria',
  correcao_solicitada: 'Correção solicitada',
  aprovado: 'Aprovado pela Indústria',
  reprovado: 'Reprovado pela Indústria',
}

// Cores neutras (Tailwind) por status — usado no badge.
export const STATUS_TOM: Record<OnboardingStatus, string> = {
  rascunho: 'bg-slate-100 text-slate-700 ring-slate-200',
  enviado: 'bg-blue-50 text-blue-700 ring-blue-200',
  em_analise: 'bg-amber-50 text-amber-700 ring-amber-200',
  correcao_solicitada: 'bg-orange-50 text-orange-700 ring-orange-200',
  aprovado: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  reprovado: 'bg-rose-50 text-rose-700 ring-rose-200',
}

export const EVENTO_LABEL: Record<string, string> = {
  criado: 'Cadastro criado',
  documento_enviado: 'Documento enviado',
  documento_removido: 'Documento removido',
  enviado_industria: 'Enviado para a Indústria',
  correcao_solicitada: 'Correção solicitada',
  reapresentado: 'Cadastro reapresentado',
  aprovado: 'Aprovado pela Indústria',
  reprovado: 'Reprovado pela Indústria',
  convertido: 'Convertido em Cliente ativo',
  email_enviado: 'Enviado por e-mail à Indústria',
}

// Linhas retornadas por onboarding_listar (RPC).
export type LinhaCadastro = {
  id: string
  tipo_pessoa: TipoPessoaOnboarding
  status: OnboardingStatus
  nome: string | null
  cpf_cnpj: string | null
  registro_conselho: string | null
  email: string | null
  hub_id: string | null
  hub_nome: string | null
  responsavel_nome: string | null
  enviado_em: string | null
  updated_at: string
  created_at: string
}

export type DetalheCadastro = {
  cadastro: import('@/types/database').HubClientOnboarding
  arquivos: Array<{
    id: string
    tipo_documento: TipoDocumentoOnboarding
    nome_arquivo: string
    storage_path: string
    mime_type: string | null
    tamanho: number | null
    uploaded_by_nome: string | null
    created_at: string
  }>
  eventos: Array<{
    id: string
    tipo_evento: string
    ator_nome: string | null
    observacao: string | null
    metadata: Record<string, unknown>
    created_at: string
  }>
  papel: 'hub' | 'industria'
}
