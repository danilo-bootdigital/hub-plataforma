-- Adicionar CPF/CNPJ em leads e contatos
ALTER TABLE leads ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;
