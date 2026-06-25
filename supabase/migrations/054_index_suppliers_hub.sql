-- Migration 054: index on suppliers.hub_id
-- Criar índice para performance em consultas por hub
CREATE INDEX idx_suppliers_hub_id ON suppliers(hub_id) WHERE hub_id IS NOT NULL;
