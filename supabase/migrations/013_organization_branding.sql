-- Dados de branding da organização
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS nome_fantasia text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS endereco text;
