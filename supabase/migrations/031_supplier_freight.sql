-- Tabela de frete por fornecedor e região
CREATE TABLE IF NOT EXISTS supplier_freight (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  regiao text NOT NULL,
  valor numeric(10,2) NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(supplier_id, regiao)
);

-- RLS
ALTER TABLE supplier_freight ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier_freight_org" ON supplier_freight
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));
