-- ============================================================
-- Integração Lead → Pipeline: criação automática de deal
-- ============================================================

-- Coluna lead_id em deals para vincular deal ao lead de origem
ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id);

CREATE INDEX ON deals(lead_id);

-- ============================================================
-- Tabela de logs de movimentação de deals no pipeline
-- ============================================================
CREATE TABLE deal_stage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES profiles(id),
  estagio_anterior_id UUID REFERENCES pipeline_stages(id),
  estagio_novo_id UUID NOT NULL REFERENCES pipeline_stages(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON deal_stage_logs(deal_id, criado_em DESC);
CREATE INDEX ON deal_stage_logs(organization_id, criado_em DESC);

ALTER TABLE deal_stage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logs da organizacao" ON deal_stage_logs
  FOR ALL USING (organization_id = get_organization_id());

-- ============================================================
-- Unique parcial: impedir deal duplicado para o mesmo lead ativo
-- ============================================================
CREATE UNIQUE INDEX deals_lead_id_ativo_unique
  ON deals(lead_id)
  WHERE lead_id IS NOT NULL AND ganho IS NULL;
