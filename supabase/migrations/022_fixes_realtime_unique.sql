-- Habilitar Realtime para tabela deals
ALTER PUBLICATION supabase_realtime ADD TABLE deals;

-- Constraint para impedir leads duplicados por telefone na mesma organização
CREATE UNIQUE INDEX IF NOT EXISTS leads_org_telefone_unique
  ON leads(organization_id, telefone)
  WHERE telefone IS NOT NULL;
