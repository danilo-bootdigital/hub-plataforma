-- ============================================================
-- Migração 041: Normalização de telefones existentes
-- Objetivo: Adicionar função SQL para normalizar telefones
-- ============================================================

-- Criar função para normalizar telefone (versão simples)
CREATE OR REPLACE FUNCTION normalizar_telefone(tel TEXT)
RETURNS TEXT AS $$
DECLARE
  digits TEXT;
BEGIN
  IF tel IS NULL THEN
    RETURN NULL;
  END IF;

  -- Extrair apenas dígitos
  digits := regexp_replace(tel, '[^0-9]', '', 'g');

  -- Remover DDI 55 se presente
  IF digits LIKE '55%' AND LENGTH(digits) >= 12 THEN
    RETURN SUBSTRING(digits FROM 3);
  END IF;

  RETURN digits;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Criar índice funcional para performance
CREATE INDEX IF NOT EXISTS idx_conversations_telefone_normalizado
ON conversations (normalizar_telefone(telefone_externo));

-- Criar índice funcional para contacts
CREATE INDEX IF NOT EXISTS idx_contacts_telefone_normalizado
ON contacts (normalizar_telefone(telefone));

-- Criar índice funcional para leads
CREATE INDEX IF NOT EXISTS idx_leads_telefone_normalizado
ON leads (normalizar_telefone(telefone));

-- Comentário na função
COMMENT ON FUNCTION normalizar_telefone IS 'Normaliza telefone removendo caracteres não numéricos e DDI 55';
