// ============================================================
// Tipos explicitos para a Central de Atendimento WhatsApp
// Sub-fase 2.2.1
// ============================================================
// NAO usar any em componentes novos. Estes tipos sao compostos
// a partir de types/database.ts e lib/queries/*.
// ============================================================

import type { ConversaStatus, WhatsappStatus } from './database'

// ------------------------------------------------------------
// WhatsApp Instance (campos usados pela Central)
// ------------------------------------------------------------

export type WhatsappInstanciaResumo = {
  id: string
  nome: string
  status_conexao: WhatsappStatus
  numero: string | null
  vendedor_id: string | null
  compartilhado: boolean
  // evolution_instance_name nao e' usado pela Central (manter opcional para retrocompat)
  evolution_instance_name?: string | null
}

// ------------------------------------------------------------
// Conversa Completa (com dados desnormalizados para o ChatArea
// e PainelCliente). Vem do JOIN feito no page.tsx.
// ------------------------------------------------------------

export type ConversaCompleta = {
  id: string
  organization_id: string
  whatsapp_instance_id: string
  lead_id: string | null
  contato_id: string | null
  telefone_externo: string
  status: ConversaStatus
  responsavel_id: string | null
  ultima_mensagem_em: string | null
  nao_lidas: number
  arquivada_em: string | null
  nome_contato: string | null
  name_source: string | null
  whatsapp_push_name: string | null
  is_name_manually_edited: boolean
  criado_em: string
  atualizado_em: string
  // Relacoes desnormalizadas (1 nivel)
  responsavel: { id: string; nome: string } | null
  lead: { id: string; nome: string; telefone: string; email: string | null } | null
  contato: { id: string; nome: string; telefone: string; email: string | null } | null
  instancia: { id: string; nome: string } | null
}

// ------------------------------------------------------------
// Perfil (campos usados pela Central)
// ------------------------------------------------------------

export type PerfilCentral = {
  id: string
  cargo: 'admin' | 'gestor' | 'vendedor' | 'atendimento' | 'financeiro' | 'suporte'
  organization_id: string
  nome: string
}

// ------------------------------------------------------------
// Usuario (apenas para filtros)
// ------------------------------------------------------------

export type UsuarioResumo = {
  id: string
  nome: string
}

// ------------------------------------------------------------
// Tag de conversa
// ------------------------------------------------------------

export type TagConversa = {
  id: string
  nome: string
  cor: string
}

// ------------------------------------------------------------
// Filtros da Central parseados da URL
// ------------------------------------------------------------

export type CentralSearchParams = {
  conversaId?: string
  status?: string
  busca?: string
  instanciaId?: string
  responsavelId?: string
  somenteNaoLidas?: string
  semResponsavel?: string
  comLead?: string
  comContato?: string
  painel?: string
  offset?: string
}
