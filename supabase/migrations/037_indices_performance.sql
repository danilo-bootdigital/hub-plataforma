-- Índices de performance em foreign keys sem índice
-- Evita sequential scans em JOINs, DELETEs com FK, e queries filtradas

-- contacts
CREATE INDEX IF NOT EXISTS idx_contacts_organization_id ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_empresa_id ON contacts(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contacts_responsavel_id ON contacts(responsavel_id);

-- companies
CREATE INDEX IF NOT EXISTS idx_companies_organization_id ON companies(organization_id);

-- deals
CREATE INDEX IF NOT EXISTS idx_deals_contato_id ON deals(contato_id);

-- tasks
CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_contato_id ON tasks(contato_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deal_id ON tasks(deal_id);

-- activities
CREATE INDEX IF NOT EXISTS idx_activities_contato_id ON activities(contato_id);

-- messages
CREATE INDEX IF NOT EXISTS idx_messages_organization_id ON messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_messages_responsavel_id ON messages(responsavel_id);

-- quotes
CREATE INDEX IF NOT EXISTS idx_quotes_organization_id ON quotes(organization_id);
CREATE INDEX IF NOT EXISTS idx_quotes_lead_id ON quotes(lead_id);
CREATE INDEX IF NOT EXISTS idx_quotes_deal_id ON quotes(deal_id);
CREATE INDEX IF NOT EXISTS idx_quotes_responsavel_id ON quotes(responsavel_id);

-- quote_items (CASCADE performance)
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);

-- orders
CREATE INDEX IF NOT EXISTS idx_orders_organization_id ON orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_responsavel_id ON orders(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_ganho ON orders(ganho);
CREATE INDEX IF NOT EXISTS idx_orders_criado_em ON orders(criado_em);

-- order_items (coluna product_id não existe nesta tabela)
-- CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- whatsapp_instances
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_organization_id ON whatsapp_instances(organization_id);

-- supplier_freight
CREATE INDEX IF NOT EXISTS idx_supplier_freight_organization_id ON supplier_freight(organization_id);

-- freight_carriers
CREATE INDEX IF NOT EXISTS idx_freight_carriers_organization_id ON freight_carriers(organization_id);

-- Unique constraint para prevenir leads duplicados por telefone na mesma org
CREATE UNIQUE INDEX IF NOT EXISTS leads_org_telefone_unique
  ON leads(organization_id, telefone)
  WHERE telefone IS NOT NULL;
