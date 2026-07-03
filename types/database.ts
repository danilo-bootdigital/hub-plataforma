// Tipos que espelham o schema do Supabase (001_schema_completo.sql)
// Para regenerar via CLI: npx supabase gen types typescript --project-id SEU-ID > types/database.ts

export type UserRole = 'admin' | 'gestor' | 'vendedor' | 'atendimento' | 'financeiro' | 'suporte' | 'proprietario_hub' | 'assistente'
export type LeadOrigem = 'whatsapp' | 'instagram_lead_ad' | 'facebook_lead_ad' | 'site' | 'indicacao' | 'evento' | 'manual'
export type LeadStatus = 'novo' | 'em_atendimento' | 'qualificado' | 'descartado'
export type TaskTipo = 'ligacao' | 'email' | 'reuniao' | 'whatsapp'
export type WhatsappStatus = 'conectado' | 'desconectado' | 'aguardando_qr'
export type MessageDirecao = 'enviada' | 'recebida'
export type MessageTipoMidia = 'texto' | 'audio' | 'imagem' | 'video' | 'documento' | 'sticker' | 'localizacao'
export type MessageStatus = 'enviada' | 'entregue' | 'lida' | 'falhou'
export type DistribuicaoModo = 'manual' | 'rotativo' | 'por_carga'
export type QuoteStatus =
  | 'rascunho'
  | 'aguardando_aprovacao_interna'
  | 'aprovado_internamente'
  | 'rejeitado_internamente'
  | 'enviado_ao_cliente'
  | 'aguardando_confirmacao_vendedor'
  | 'aprovado_pelo_cliente'
  | 'recusado_pelo_cliente'

export type OrderStatus =
  | 'pendente'
  | 'em_producao'
  | 'pronto'
  | 'enviado'
  | 'entregue'
  | 'concluido'
  | 'cancelado'

export type HubStatus = 'ATIVO' | 'INATIVO' | 'SUSPENSO' | 'BLOQUEADO'

export type Hub = {
  id: string
  organization_id: string
  nome: string
  descricao: string | null
  status: HubStatus
  ativo: boolean
  // Identidade/Marca do Hub (Expand — DEC-017): usada no PDF de orçamento.
  logo_url: string | null
  telefone: string | null
  email: string | null
  site: string | null
  instagram: string | null
  cnpj: string | null
  endereco: string | null
  criado_em: string
  atualizado_em: string
}

export type Carteira = {
  id: string
  organization_id: string
  nome: string
  descricao: string | null
  observacoes: string | null
  ordem: number
  ativo: boolean
  hub_id: string | null
  criado_em: string
  atualizado_em: string
}

export type Organization = {
  id: string
  nome: string
  slug: string
  plano: string
  ativo: boolean
  nome_fantasia: string | null
  cnpj: string | null
  logo_url: string | null
  telefone: string | null
  email: string | null
  endereco: string | null
  criado_em: string
  atualizado_em: string
}

export type Profile = {
  id: string
  organization_id: string
  nome: string
  email: string
  telefone: string | null
  cargo: UserRole
  disponivel: boolean
  ativo: boolean
  ultimo_status_em: string | null
  criado_em: string
  atualizado_em: string
}

export type Lead = {
  id: string
  organization_id: string
  nome: string | null
  email: string | null
  telefone: string | null
  empresa: string | null
  cpf_cnpj: string | null
  endereco: string | null
  origem: LeadOrigem
  status: LeadStatus
  responsavel_id: string | null
  foto_perfil_url: string | null
  contato_anterior_id: string | null
  whatsapp_instance_id: string | null
  observacoes: string | null
  ultima_interacao_em: string | null
  criado_em: string
  atualizado_em: string
}

export type Company = {
  id: string
  organization_id: string
  nome: string
  cnpj: string | null
  site: string | null
  telefone: string | null
  endereco: string | null
  // Migration 048: dados fiscais
  nome_fantasia: string | null
  inscricao_estadual: string | null
  inscricao_municipal: string | null
  criado_em: string
  atualizado_em: string
}

export type Contact = {
  id: string
  organization_id: string
  nome: string
  email: string | null
  telefone: string | null
  cargo: string | null
  cpf_cnpj: string | null
  empresa_id: string | null
  responsavel_id: string | null
  // Carteira oficial da Indústria (obrigatória — DEC-017) e responsável operacional no Hub.
  carteira_id: string | null
  responsavel_operacional_id: string | null
  foto_perfil_url: string | null
  endereco: string | null
  endereco_numero: string | null
  endereco_complemento: string | null
  endereco_bairro: string | null
  endereco_cep: string | null
  endereco_cidade: string | null
  endereco_estado: string | null
  observacoes: string | null
  // Migration 047: dados profissionais
  tipo_pessoa: string | null
  categoria_cliente: string | null
  tipo_conselho: string | null
  numero_conselho: string | null
  uf_conselho: string | null
  especialidade: string | null
  criado_em: string
  atualizado_em: string
}

export type Pipeline = {
  id: string
  organization_id: string
  nome: string
  descricao: string | null
  padrao: boolean
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export type PipelineStage = {
  id: string
  organization_id: string
  pipeline_id: string
  nome: string
  ordem: number
  cor: string
  oculto: boolean
  tipo_especial: 'fechado' | 'perdido' | null
  criado_em: string
  atualizado_em: string
}

export type Deal = {
  id: string
  organization_id: string
  titulo: string
  valor_estimado: number | null
  contato_id: string | null
  responsavel_id: string | null
  pipeline_id: string
  estagio_id: string
  lead_id: string | null
  data_fechamento_prevista: string | null
  origem_lead: LeadOrigem | null
  motivo_perda: string | null
  ganho: boolean | null
  observacoes: string | null
  criado_em: string
  atualizado_em: string
}

export type Task = {
  id: string
  organization_id: string
  titulo: string
  descricao: string | null
  tipo: TaskTipo
  data_vencimento: string | null
  concluida: boolean
  responsavel_id: string
  lead_id: string | null
  contato_id: string | null
  deal_id: string | null
  // Migration 045: vinculo opcional com conversa de origem
  conversation_id: string | null
  criado_em: string
  atualizado_em: string
}

export type Activity = {
  id: string
  organization_id: string
  tipo: string
  descricao: string
  lead_id: string | null
  deal_id: string | null
  contato_id: string | null
  autor_id: string
  criado_em: string
}

export type WhatsappInstance = {
  id: string
  organization_id: string
  nome: string
  numero: string | null
  evolution_instance_name: string | null
  vendedor_id: string | null
  compartilhado: boolean
  status_conexao: WhatsappStatus
  criado_em: string
  atualizado_em: string
}

export type ConversaStatus = 'nao_atendida' | 'em_atendimento' | 'aguardando_cliente' | 'finalizada'

export type Conversation = {
  id: string
  organization_id: string
  whatsapp_instance_id: string
  lead_id: string | null
  contato_id: string | null
  deal_id: string | null
  telefone_externo: string
  status: ConversaStatus
  responsavel_id: string | null
  ultima_mensagem_em: string | null
  // Migration 045: Central de Atendimento WhatsApp
  nao_lidas: number
  arquivada_em: string | null
  nome_contato: string | null
  name_source: string | null
  whatsapp_push_name: string | null
  is_name_manually_edited: boolean
  criado_em: string
  atualizado_em: string
}

export type Message = {
  id: string
  organization_id: string
  conversation_id: string
  message_id_externo: string | null
  direcao: MessageDirecao
  tipo_midia: MessageTipoMidia
  conteudo: string | null
  url_midia: string | null
  telefone_remetente: string | null
  telefone_destinatario: string | null
  responsavel_id: string | null
  status: MessageStatus
  enviado_em: string
  entregue_em: string | null
  lida_em: string | null
}

export type MessageTemplate = {
  id: string
  organization_id: string
  nome: string
  conteudo: string
  categoria: string | null
  criado_por: string
  criado_em: string
  atualizado_em: string
}

export type ConversationExport = {
  id: string
  organization_id: string
  conversation_id: string
  lead_id: string | null
  exportado_por: string
  formato: 'png' | 'txt'
  periodo_inicio: string | null
  periodo_fim: string | null
  total_mensagens: number | null
  criado_em: string
}

export type Supplier = {
  id: string
  organization_id: string
  nome: string
  cnpj: string | null
  telefone: string | null
  email: string | null
  observacoes: string | null
  criado_em: string
}

export type SupplierCategory = {
  id: string
  organization_id: string
  supplier_id: string
  nome: string
  criado_em: string
}

export type Product = {
  id: string
  organization_id: string
  supplier_id: string | null
  category_id: string | null
  // Catálogo oficial (DEC-012) — aditivo; legado supplier_id/category_id preservado.
  portfolio_id: string | null
  categoria_id: string | null
  subcategoria_id: string | null
  nome: string
  descricao: string | null
  composicao: string | null
  apresentacao: string | null
  via_administracao: string | null
  preco_unitario: number
  unidade: string
  ativo: boolean
  // Ficha de Produto StinPharma (Expand — versão de apresentação, nullable)
  volume: string | null
  quantidade_por_caixa: number | null
  valor_caixa: number | null
  aplicadores: string | null
  via_apresentacao: string | null
  exige_receita: boolean | null
  observacoes_receita: string | null
  criado_em: string
  atualizado_em: string
}

// Catálogo oficial (DEC-012): Indústria → Portfólio → Categoria → Subcategoria → Produto
export type Portfolio = {
  id: string
  organization_id: string
  nome: string
  descricao: string | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export type Categoria = {
  id: string
  organization_id: string
  portfolio_id: string
  nome: string
  ativo: boolean
  criado_em: string
}

export type Subcategoria = {
  id: string
  organization_id: string
  categoria_id: string
  nome: string
  ativo: boolean
  criado_em: string
}

// Autorização operacional Hub ↔ Portfólio (regra separada — DEC-012)
export type HubPortfolio = {
  id: string
  organization_id: string
  hub_id: string
  portfolio_id: string
  status: string // 'ativo' | 'revogado'
  criado_em: string
  atualizado_em: string
}

// Vínculo N:N Produto ↔ Portfólio (DEC-013): o mesmo Produto pode compor vários
// Portfólios; classificação e preço comercial vivem AQUI (por Portfólio).
// Durante a transição, preço efetivo = COALESCE(preco_unitario do vínculo, products.preco_unitario).
export type ProductPortfolio = {
  id: string
  organization_id: string
  product_id: string
  portfolio_id: string
  categoria_id: string | null
  subcategoria_id: string | null
  preco_unitario: number | null
  valor_caixa: number | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export type Quote = {
  id: string
  organization_id: string
  supplier_id: string | null
  numero: number
  lead_id: string | null
  deal_id: string | null
  contato_id: string | null
  responsavel_id: string
  status: QuoteStatus
  valor_subtotal: number
  desconto_geral: number
  frete: number
  carrier_id: string | null
  frete_regiao: string | null
  endereco_entrega: string | null
  forma_pagamento: string | null
  valor_total: number
  aprovacao_interna_por: string | null
  aprovacao_interna_em: string | null
  aprovacao_interna_comentario: string | null
  validade_em: string | null
  cliente_aprovado_em: string | null
  cliente_recusado_em: string | null
  vendedor_confirmado_em: string | null
  ultima_alteracao_validada_em: string | null
  observacoes: string | null
  // Migration 049: dados para emissão da nota fiscal
  nota_tipo_pessoa: string | null
  nota_nome: string | null
  nota_documento: string | null
  nota_razao_social: string | null
  nota_nome_fantasia: string | null
  nota_endereco: string | null
  nota_ie: string | null
  nota_im: string | null
  criado_em: string
  atualizado_em: string
}

// Migration 056: Receita do orçamento (modelo/rascunho + arquivo assinado no Storage)
// Migration 057 (DEC-019): + 'em_conferencia' | 'aprovada_operacionalmente' | 'precisa_revisao_humana'
export type ReceitaStatusFluxo =
  | 'rascunho'
  | 'modelo_gerado'
  | 'enviada'
  | 'recebida'
  | 'em_conferencia'
  | 'validada'
  | 'aprovada_operacionalmente'
  | 'rejeitada'
  | 'precisa_revisao_humana'

// Migration 057 (DEC-019): pré-análise (motor de regras) — nunca aprova
export type ReceitaStatusAnalise =
  | 'sem_pendencias_aparentes'
  | 'pendencias_encontradas'
  | 'ilegivel'
  | 'divergente_do_orcamento'
  | 'precisa_de_revisao_humana'

export type ReceitaMotivo =
  | 'crm_ausente'
  | 'crm_uf_ausente'
  | 'assinatura_ausente'
  | 'paciente_ausente'
  | 'cpf_ausente_obrigatorio'
  | 'produto_divergente'
  | 'concentracao_divergente'
  | 'quantidade_divergente'
  | 'posologia_ausente'
  | 'data_ausente'
  | 'receita_vencida'
  | 'documento_ilegivel'
  | 'limite_maximo_excedido'
  | 'outro'

export type ChecklistEscopo = 'organizacao' | 'portfolio' | 'produto'
export type ChecklistTipoRegra = 'presenca' | 'formato' | 'comparacao_orcamento' | 'valor_esperado' | 'limite_maximo'
export type ReceitaItemSeveridade = 'info' | 'aviso' | 'critico'

export type QuoteReceita = {
  id: string
  organization_id: string
  quote_id: string
  texto_modelo: string | null
  status_fluxo: ReceitaStatusFluxo
  arquivo_path: string | null
  arquivo_nome: string | null
  arquivo_tipo: string | null
  arquivo_tamanho: number | null
  enviado_em: string | null
  validada_por: string | null
  validada_em: string | null
  validacao_comentario: string | null
  // Migration 057 (DEC-019)
  checklist_id: string | null
  status_analise_ia: ReceitaStatusAnalise | null
  score_ultima_conferencia: number | null
  criado_por: string | null
  criado_em: string
  atualizado_em: string
}

// Migration 057 (DEC-019) — Conferência Operacional de Receita
export type ReceitaChecklist = {
  id: string
  organization_id: string
  nome: string
  escopo: ChecklistEscopo
  portfolio_id: string | null
  produto_id: string | null
  tipo_documento: string | null
  versao: number
  ativo: boolean
  criado_por: string | null
  criado_em: string
  atualizado_em: string
}

export type ReceitaChecklistItem = {
  id: string
  checklist_id: string
  chave: string
  rotulo: string
  obrigatorio: boolean
  tipo_regra: ChecklistTipoRegra
  config_json: Record<string, unknown>
  motivo: ReceitaMotivo | null
  severidade: ReceitaItemSeveridade
  peso: number
  ordem: number
}

export type ReceitaModelo = {
  id: string
  organization_id: string
  produto_id: string
  nome: string
  arquivo_path: string | null
  campos_referencia_json: Record<string, unknown>
  observacoes: string | null
  ativo: boolean
  criado_por: string | null
  criado_em: string
}

export type ReceitaConferencia = {
  id: string
  organization_id: string
  quote_receita_id: string
  quote_id: string
  checklist_id: string | null
  checklist_versao: number | null
  provedor_ocr: string | null
  provedor_ia: string | null
  modelo_ia: string | null
  prompt_versao: string | null
  texto_ocr: string | null
  extracao_json: Record<string, unknown> | null
  explicacao_ia: string | null
  status_analise: ReceitaStatusAnalise | null
  score: number | null
  confianca_extracao: number | null
  tokens_entrada: number | null
  tokens_saida: number | null
  custo_estimado: number | null
  criado_por: string | null
  criado_em: string
}

export type ReceitaConferenciaPendencia = {
  id: string
  conferencia_id: string
  origem: 'regra' | 'extracao'
  chave: string | null
  motivo: ReceitaMotivo | null
  tipo: 'campo_ausente' | 'divergencia' | 'formato_invalido' | 'ilegivel' | 'suspeita'
  severidade: ReceitaItemSeveridade
  mensagem: string | null
  esperado: string | null
  encontrado: string | null
}

// Migration 060 (DEC-019 emenda MVP-5′) — Conferência de Receita STANDALONE
// (independente do orçamento; arquitetura simplificada, sem Event Sourcing).
export type ConferenciaStatusAtual =
  | 'criada'
  | 'aguardando_decisao'
  | 'aprovada'
  | 'reprovada'
  | 'devolvida_para_correcao'
  | 'erro'

export type ConferenciaStatusProcessamento = 'pendente' | 'processando' | 'concluido' | 'erro'

// Documental-only: sem 'divergente_do_orcamento'.
export type ConferenciaResultadoAnalise =
  | 'sem_pendencias_aparentes'
  | 'pendencias_encontradas'
  | 'ilegivel'
  | 'precisa_de_revisao_humana'

export type ConferenciaDecisao = 'aprovada' | 'reprovada' | 'devolvida_para_correcao'

export type ConferenciaReceita = {
  id: string
  organization_id: string
  hub_id: string | null
  product_id: string
  storage_path: string | null
  arquivo_nome: string | null
  arquivo_tipo: string | null
  arquivo_tamanho: number | null
  checklist_id: string | null
  checklist_versao: number | null
  status_atual: ConferenciaStatusAtual
  status_processamento: ConferenciaStatusProcessamento
  resultado_analise: ConferenciaResultadoAnalise | null
  provedor_ia: string | null
  modelo_ia: string | null
  prompt_versao: string | null
  extracao_json: Record<string, unknown> | null
  explicacao_ia: string | null
  score: number | null
  confianca_extracao: number | null
  decidido_por: string | null
  decidido_em: string | null
  observacao_decisao: string | null
  criado_por: string | null
  criado_em: string
  atualizado_em: string
}

export type ConferenciaReceitaPendencia = {
  id: string
  conferencia_id: string
  origem: 'regra' | 'extracao'
  chave: string | null
  motivo: ReceitaMotivo | null
  tipo: 'campo_ausente' | 'divergencia' | 'formato_invalido' | 'ilegivel' | 'suspeita'
  severidade: ReceitaItemSeveridade
  mensagem: string | null
  esperado: string | null
  encontrado: string | null
}

export type HistoricoDecisaoConferenciaReceita = {
  id: string
  conferencia_id: string
  decisao: ConferenciaDecisao
  observacao: string | null
  decidido_por: string
  decidido_em: string
}

// Migration 061 (DEC-019 MVP-5′ / DEC-012) — catálogo keyed de metadados de validação por produto.
export type ProductValidationChave =
  | 'medicamento_aliases'
  | 'concentracoes_permitidas'
  | 'vias_permitidas'
  | 'limite_maximo_por_receita'
export type ProductValidationTipo = 'lista' | 'numero' | 'texto'
export type ProductValidationMetadata = {
  id: string
  organization_id: string
  product_id: string
  chave: ProductValidationChave
  tipo: ProductValidationTipo
  valores: string[] | null
  valor_num: number | null
  valor_texto: string | null
  ativo: boolean
  criado_por: string | null
  criado_em: string
}

export type QuoteItem = {
  id: string
  quote_id: string
  product_id: string | null
  descricao: string
  unidade: string | null
  quantidade: number
  preco_unitario: number
  desconto_item: number
  subtotal: number
}

export type Order = {
  id: string
  organization_id: string
  quote_id: string
  numero: number
  status: OrderStatus
  lead_id: string | null
  contato_id: string | null
  responsavel_id: string
  valor_total: number
  observacoes: string | null
  // Migration 050: dados para emissão da nota fiscal
  nota_tipo_pessoa: string | null
  nota_nome: string | null
  nota_documento: string | null
  nota_razao_social: string | null
  nota_nome_fantasia: string | null
  nota_endereco: string | null
  nota_ie: string | null
  nota_im: string | null
  criado_em: string
  atualizado_em: string
}

export type OrderItem = {
  id: string
  order_id: string
  product_id: string | null
  descricao: string
  quantidade: number
  preco_unitario: number
  desconto_item: number
  subtotal: number
}

export type LeadDistributionConfig = {
  id: string
  organization_id: string
  modo: DistribuicaoModo
  apenas_disponiveis: boolean
  limite_por_vendedor: number | null
  proximo_vendedor_idx: number
  atualizado_por: string | null
  atualizado_em: string
}

export type SystemConfig = {
  id: string
  organization_id: string
  chave: string
  valor: string
  tipo_valor: 'texto' | 'numero' | 'booleano' | 'json'
  descricao: string | null
  atualizado_por: string | null
  atualizado_em: string
}

export type AuditLog = {
  id: string
  organization_id: string
  usuario_id: string | null
  acao: string
  tabela_afetada: string | null
  registro_id: string | null
  dados_anteriores: Record<string, unknown> | null
  dados_novos: Record<string, unknown> | null
  ip: string | null
  criado_em: string
}

export type DealStageLog = {
  id: string
  organization_id: string
  deal_id: string
  usuario_id: string
  estagio_anterior_id: string | null
  estagio_novo_id: string
  criado_em: string
}

export type QuoteToken = {
  id: string
  quote_id: string
  token_hash: string
  status: 'pendente' | 'aprovado' | 'recusado' | 'expirado' | 'revogado'
  cliente_ip: string | null
  cliente_ua: string | null
  criado_em: string
  expira_em: string
  usado_em: string | null
}

// ============================================================
// Sub-fase 2.1: tipos auxiliares para a Central de Atendimento
// WhatsApp. NAO espelham schema - sao compostos para UI.
// ============================================================

/**
 * KPIs do WhatsApp exibidos nos 5 cards clicaveis do header.
 * Espelha o retorno de lib/queries/kpis-whatsapp.ts.
 */
export type KPIWhatsApp = {
  abertas: number
  naoLidas: number
  emAtendimento: number
  aguardandoCliente: number
  finalizadasHoje: number
}

/**
 * Totais agregados do cliente para o painel lateral.
 * Espelha o retorno de lib/queries/totais-cliente.ts.
 */
export type TotaisCliente = {
  totalCompras: number
  totalPedidos: number
  totalOrcamentos: number
  totalOrcamentosValor: number
  totalEmAberto: number
}

/**
 * Filtros aceitos pela query de conversas e pela URL.
 * Todos os campos sao opcionais; combinacoes sao permitidas.
 * Espelha o parametro de lib/queries/conversas.ts.
 */
export type FiltrosConversa = {
  busca?: string
  status?: ConversaStatus | null
  responsavelId?: string | null
  tagIds?: string[]
  instanciaId?: string | null
  somenteNaoLidas?: boolean
  semResponsavel?: boolean
  comLead?: boolean | null
  comContato?: boolean | null
  arquivada?: boolean
}
