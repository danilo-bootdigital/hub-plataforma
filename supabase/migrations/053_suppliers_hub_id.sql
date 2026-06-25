-- Migration 053: add hub_id to suppliers
-- Adicionar campo hub_id com Foreign Key para health_hubs
ALTER TABLE suppliers ADD COLUMN hub_id uuid REFERENCES health_hubs(id);

COMMENT ON COLUMN suppliers.hub_id IS 'Hub de Saúde associado ao fornecedor';
