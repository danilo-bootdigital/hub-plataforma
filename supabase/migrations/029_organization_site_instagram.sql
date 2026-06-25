-- Adicionar campos site e instagram à organização
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS site text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS instagram text;
