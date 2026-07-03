// DEC-019 / Sprint 2 — Motor de Regras (determinístico, sem IA, sem persistência).
// Contrato PURO de entrada/saída. NÃO importa @/types (mantém os testes isolados de
// aliases). Os tipos de banco (ReceitaConferencia etc.) vivem em types/database.ts e
// são usados na persistência (Sprint 6), não aqui.

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

export type Severidade = 'info' | 'aviso' | 'critico'
// 'limite_maximo' (MVP-5′, DEC-019 emenda): quantidade vs. limite máximo por receita do produto.
// Regra DOCUMENTAL (não compara com orçamento) — usada no fluxo standalone.
export type TipoRegra = 'presenca' | 'formato' | 'comparacao_orcamento' | 'valor_esperado' | 'limite_maximo'
export type TipoPendencia = 'campo_ausente' | 'divergencia' | 'formato_invalido' | 'ilegivel' | 'suspeita'
export type StatusAnalise =
  | 'sem_pendencias_aparentes'
  | 'pendencias_encontradas'
  | 'ilegivel'
  | 'divergente_do_orcamento'
  | 'precisa_de_revisao_humana'
export type Escopo = 'organizacao' | 'portfolio' | 'produto'
export type AlvoComparacao = 'produto' | 'concentracao' | 'quantidade' | 'paciente'

// Configuração por item (deriva do config_json do banco; aqui tipada de forma frouxa)
export interface ItemConfig {
  campo?: string            // qual campo da extração ler (default: chave do item)
  regex?: string            // regra 'formato'
  validadeDias?: number     // regra 'formato': idade máxima de uma data
  valores?: string[]        // regra 'valor_esperado': conjunto permitido
  contem?: boolean          // 'valor_esperado': casa por TOKEN/substring (não exige igualdade exata) — p/ campos compostos (ex.: "via sc / subcutânea")
  origemValores?: string    // nome da CHAVE em product_validation_metadata (ex.: 'medicamento_aliases',
                            // 'concentracoes_permitidas', 'vias_permitidas', 'limite_maximo_por_receita').
                            // A composição hidrata `valores` (tipo lista) ou `limiteMaximo` (tipo numero).
                            // Só a composição lê isto; o MOTOR não conhece metadados de produto.
  alvo?: AlvoComparacao     // regra 'comparacao_orcamento'
  tolerancia?: number       // comparação de quantidade (absoluta)
  limiteMaximo?: number     // regra 'limite_maximo': quantidade máxima por receita do produto
}

export interface ChecklistItem {
  chave: string
  rotulo: string
  obrigatorio: boolean
  tipoRegra: TipoRegra
  config: ItemConfig
  motivo: ReceitaMotivo | null
  severidade: Severidade
  peso: number
}

export interface Checklist {
  id?: string
  escopo: Escopo
  portfolioId?: string | null
  produtoId?: string | null
  versao?: number
  itens: ChecklistItem[]
}

// --- Dados de entrada (a IA só EXTRAI; o motor DECIDE) ---
export interface ItemExtraido {
  descricao?: string | null
  concentracao?: string | null
  quantidade?: number | null
}

export interface ExtracaoReceita {
  campos: Record<string, string | number | null | undefined>
  itens: ItemExtraido[]
  confianca: number // 0..1
}

export interface ItemOrcamento {
  descricao: string
  concentracao?: string | null
  quantidade: number
}

export interface OrcamentoContexto {
  itens: ItemOrcamento[]
  nomeCliente?: string | null
}

// --- Saída ---
export interface Pendencia {
  origem: 'regra' | 'extracao'
  chave: string | null
  motivo: ReceitaMotivo | null
  tipo: TipoPendencia
  severidade: Severidade
  mensagem: string
  esperado?: string | null
  encontrado?: string | null
}

export interface ResultadoConferencia {
  status: StatusAnalise
  score: number // 0..100
  pendencias: Pendencia[]
}

export interface EntradaMotor {
  checklist: Checklist
  extracao: ExtracaoReceita
  orcamento: OrcamentoContexto
  hoje: string // ISO 'YYYY-MM-DD' — injetado (determinismo; sem Date.now interno)
  limiarConfianca?: number // default 0.5
  limiarIlegivel?: number // default 0.3
}
