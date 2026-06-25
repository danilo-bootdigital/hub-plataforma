-- Adicionar campos de transportadora e região do frete no orçamento
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS carrier_id uuid REFERENCES freight_carriers(id) ON DELETE SET NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS frete_regiao text;
