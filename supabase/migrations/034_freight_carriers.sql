-- Tabela de transportadoras por fornecedor
CREATE TABLE IF NOT EXISTS freight_carriers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  nome text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(supplier_id, nome)
);

-- RLS
ALTER TABLE freight_carriers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "freight_carriers_org" ON freight_carriers
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Adicionar carrier_id na tabela de frete
ALTER TABLE supplier_freight ADD COLUMN carrier_id uuid REFERENCES freight_carriers(id) ON DELETE CASCADE;

-- Remover constraint antiga (supplier_id, regiao) e criar nova (carrier_id, regiao)
ALTER TABLE supplier_freight DROP CONSTRAINT IF EXISTS supplier_freight_supplier_id_regiao_key;
ALTER TABLE supplier_freight ADD CONSTRAINT supplier_freight_carrier_regiao_key UNIQUE(carrier_id, regiao);
