-- Adicionar campo endereco na tabela contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS endereco TEXT;
