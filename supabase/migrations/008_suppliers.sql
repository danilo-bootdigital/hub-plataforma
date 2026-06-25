-- Criar tabela de fornecedores
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  nome text NOT NULL,
  cnpj text,
  telefone text,
  email text,
  observacoes text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON suppliers(organization_id);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ver fornecedores da org" ON suppliers
  FOR SELECT USING (organization_id = get_organization_id());

CREATE POLICY "inserir fornecedores" ON suppliers
  FOR INSERT WITH CHECK (organization_id = get_organization_id());

CREATE POLICY "atualizar fornecedores" ON suppliers
  FOR UPDATE USING (organization_id = get_organization_id());

CREATE POLICY "excluir fornecedores" ON suppliers
  FOR DELETE USING (organization_id = get_organization_id());

-- Adicionar supplier_id na tabela products
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES suppliers(id);

-- Adicionar supplier_id na tabela quotes (orçamento travado por fornecedor)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES suppliers(id);
