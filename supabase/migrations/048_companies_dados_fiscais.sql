-- Migration: 048_companies_dados_fiscais
-- Adiciona campos opcionais para dados fiscais em companies
-- Necessário para emissão de notas fiscais

-- Campos adicionados:
-- nome_fantasia: nome fantasia da empresa
-- inscricao_estadual: inscrição estadual
-- inscricao_municipal: inscrição municipal

ALTER TABLE companies ADD COLUMN IF NOT EXISTS nome_fantasia TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS inscricao_municipal TEXT;

-- Comentários para documentação
COMMENT ON COLUMN companies.nome_fantasia IS 'Nome fantasia da empresa (opcional)';
COMMENT ON COLUMN companies.inscricao_estadual IS 'Inscrição Estadual (opcional)';
COMMENT ON COLUMN companies.inscricao_municipal IS 'Inscrição Municipal (opcional)';

-- Índice para busca por CNPJ
CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON companies(cnpj);
