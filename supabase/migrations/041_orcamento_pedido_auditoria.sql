-- ============================================================
-- MIGRATION: Auditoria e aprovação de orçamentos/pedidos
-- ============================================================

-- Adicionar campos de aprovação do cliente no orçamento
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS aprovado_cliente_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS aprovado_cliente_por UUID REFERENCES profiles(id);

-- ============================================================
-- Tabela de auditoria detalhada para alterações de pedidos
-- ============================================================
CREATE TABLE IF NOT EXISTS pedido_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES quotes(id),
  usuario_id UUID NOT NULL REFERENCES profiles(id),
  administrador_id UUID REFERENCES profiles(id),
  acao TEXT NOT NULL,
  campos_alterados JSONB,
  dados_anteriores JSONB,
  dados_novos JSONB,
  motivo TEXT,
  ip TEXT,
  sessao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pedido_audit_logs_order_id ON pedido_audit_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_pedido_audit_logs_organization_id ON pedido_audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_pedido_audit_logs_quote_id ON pedido_audit_logs(quote_id);
CREATE INDEX IF NOT EXISTS idx_pedido_audit_logs_criado_em ON pedido_audit_logs(criado_em DESC);

-- RLS
ALTER TABLE pedido_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pedido_audit_logs_org_select" ON pedido_audit_logs
  FOR SELECT USING (organization_id = get_organization_id());

CREATE POLICY "pedido_audit_logs_org_insert" ON pedido_audit_logs
  FOR INSERT WITH CHECK (organization_id = get_organization_id());

CREATE POLICY "pedido_audit_logs_org_update" ON pedido_audit_logs
  FOR UPDATE USING (organization_id = get_organization_id());

CREATE POLICY "pedido_audit_logs_org_delete" ON pedido_audit_logs
  FOR DELETE USING (organization_id = get_organization_id());

-- ============================================================
-- Comentários para documentação
-- ============================================================
COMMENT ON TABLE pedido_audit_logs IS 'Registra todas as alterações em pedidos, incluindo campos alterados, valores anteriores e novos, usuário responsável, administrador que autorizou, motivo e IP';
COMMENT ON COLUMN pedido_audit_logs.acao IS 'Tipo de ação: CRIACAO, EDICAO, ALTERACAO_STATUS, CANCELAMENTO, EXCLUSAO';
COMMENT ON COLUMN pedido_audit_logs.campos_alterados IS 'JSON com lista de campos alterados e seus valores anterior e novo';
COMMENT ON COLUMN pedido_audit_logs.administrador_id IS 'Administrador que autorizou a alteração (quando aplicável)';
COMMENT ON COLUMN pedido_audit_logs.motivo IS 'Motivo informado para a alteração';
