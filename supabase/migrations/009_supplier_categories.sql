-- Categorias de fornecedor
CREATE TABLE IF NOT EXISTS supplier_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  nome text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON supplier_categories(organization_id, supplier_id);

ALTER TABLE supplier_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ver categorias da org" ON supplier_categories
  FOR SELECT USING (organization_id = get_organization_id());

CREATE POLICY "inserir categorias" ON supplier_categories
  FOR INSERT WITH CHECK (organization_id = get_organization_id());

CREATE POLICY "atualizar categorias" ON supplier_categories
  FOR UPDATE USING (organization_id = get_organization_id());

CREATE POLICY "excluir categorias" ON supplier_categories
  FOR DELETE USING (organization_id = get_organization_id());

-- Adicionar category_id na tabela products
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES supplier_categories(id);
