// Tipos/labels do rastreamento de Orçamento (Fase T-1). Módulo PURO (sem
// 'server-only'/'use server') — importável por client e server.

export type EventoOrcamentoUI = {
  id: string
  tipo_evento: string
  ator_nome: string | null
  ator_cargo: string | null
  descricao: string | null
  valor_anterior: unknown
  valor_novo: unknown
  created_at: string
}

// Rótulos legíveis por tipo de evento.
export const EVENTO_LABEL: Record<string, string> = {
  criado: 'Orçamento criado',
  status_alterado: 'Status alterado',
  cliente_alterado: 'Cliente alterado',
  item_adicionado: 'Produto adicionado',
  item_removido: 'Produto removido',
  quantidade_alterada: 'Quantidade alterada',
  preco_alterado: 'Preço alterado',
  desconto_aplicado: 'Desconto aplicado',
  observacao_adicionada: 'Observação atualizada',
  enviado_cliente: 'Enviado ao cliente',
  resposta_cliente: 'Cliente respondeu',
  receita_anexada: 'Receita anexada',
  receita_validada: 'Receita validada',
  pagamento_informado: 'Pagamento informado',
  pagamento_confirmado: 'Pagamento confirmado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  pedido_gerado: 'Pedido gerado',
  erro_validacao: 'Erro de validação',
}

const CARGO_LABEL: Record<string, string> = {
  admin: 'Administrador', gestor: 'Gestor',
  proprietario_hub: 'Proprietário do Hub', assistente: 'Assistente',
}

export function rotuloEvento(tipo: string): string {
  return EVENTO_LABEL[tipo] ?? tipo
}
export function rotuloCargo(cargo: string | null): string {
  return cargo ? (CARGO_LABEL[cargo] ?? cargo) : '—'
}
