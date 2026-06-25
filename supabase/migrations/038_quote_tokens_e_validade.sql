-- Migration: Adicionar campos de controle e tabela de tokens (CORRIGIDA)
-- Data: 2026-06-20
-- Descrição: Campos para validade e controle de aprovação pública

-- 1. Adicionar campos de controle na tabela quotes
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS validade_em DATE,
ADD COLUMN IF NOT EXISTS cliente_aprovado_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cliente_recusado_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS vendedor_confirmado_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ultima_alteracao_validada_em TIMESTAMPTZ;

-- 2. Criar tabela de tokens para aprovação pública
CREATE TABLE IF NOT EXISTS quote_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  cliente_ip INET,
  cliente_ua TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  expira_em TIMESTAMPTZ NOT NULL,
  usado_em TIMESTAMPTZ
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_quote_tokens_quote_id ON quote_tokens(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_tokens_status ON quote_tokens(status);
CREATE INDEX IF NOT EXISTS idx_quote_tokens_expira_em ON quote_tokens(expira_em);

-- 4. Adicionar constraint de verificação para status válidos
ALTER TABLE quote_tokens
ADD CONSTRAINT quote_tokens_status_valid
CHECK (status IN ('pendente', 'aprovado', 'recusado', 'expirado', 'revogado'));

-- 5. Adicionar constraint para garantir que apenas um token pendente exista por orçamento
CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_tokens_unique_pendente
ON quote_tokens(quote_id)
WHERE status = 'pendente';

-- 6. Adicionar constraint para garantir que apenas um token aprovado exista por orçamento
CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_tokens_unique_aprovado
ON quote_tokens(quote_id)
WHERE status = 'aprovado';

-- 7. Adicionar constraint para garantir que apenas um token recusado exista por orçamento
CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_tokens_unique_recusado
ON quote_tokens(quote_id)
WHERE status = 'recusado';

-- 8. Adicionar comentários para documentação
COMMENT ON TABLE quote_tokens IS 'Tabela de tokens para aprovação pública de orçamentos';
COMMENT ON COLUMN quote_tokens.token_hash IS 'Hash seguro do token (SHA256)';
COMMENT ON COLUMN quote_tokens.status IS 'Status do token: pendente, aprovado, recusado, expirado, revogado';
COMMENT ON COLUMN quote_tokens.expira_em IS 'Data e hora de expiração do token';
COMMENT ON COLUMN quote_tokens.usado_em IS 'Data e hora em que o token foi usado';