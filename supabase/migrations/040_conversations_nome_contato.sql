-- ============================================================
-- Migração 040: Campos para resolução de nomes de contatos
-- Objetivo: Suportar a nova lógica de resolução de nomes no /whatsapp
-- Regra: Nunca sobrescrever nomes editados manualmente
-- ============================================================

-- Adicionar campo nome_contato na tabela conversations (cache do nome resolvido)
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS nome_contato TEXT;

-- Adicionar campo name_source para indicar origem do nome
-- Valores possíveis: manual | contact | pushname | lead | conversation | phone | unknown
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS name_source TEXT;

-- Adicionar campo whatsapp_push_name para armazenar pushName da Evolution API
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS whatsapp_push_name TEXT;

-- Adicionar campo is_name_manually_edited para impedir que webhook sobrescreva
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS is_name_manually_edited BOOLEAN NOT NULL DEFAULT false;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_conversations_nome_contato ON conversations(nome_contato);
CREATE INDEX IF NOT EXISTS idx_conversations_name_source ON conversations(name_source);
CREATE INDEX IF NOT EXISTS idx_conversations_whatsapp_push_name ON conversations(whatsapp_push_name);

-- ============================================================
-- Backfill inicial: usar nome do lead quando disponível
-- ============================================================
UPDATE conversations c
SET nome_contato = l.nome,
    name_source = 'lead',
    atualizado_em = now()
FROM leads l
WHERE c.lead_id = l.id
  AND c.organization_id = l.organization_id
  AND (c.nome_contato IS NULL OR c.nome_contato = '')
  AND l.nome IS NOT NULL
  AND l.nome != '';

-- ============================================================
-- Backfill: usar nome do contato vinculado por telefone
-- ============================================================
UPDATE conversations c
SET nome_contato = ct.nome,
    name_source = 'contact',
    atualizado_em = now()
FROM contacts ct
WHERE ct.organization_id = c.organization_id
  AND ct.telefone IS NOT NULL
  AND ct.telefone != ''
  AND c.telefone_externo IS NOT NULL
  AND c.telefone_externo != ''
  AND regexp_replace(ct.telefone, '\D', '', 'g') LIKE '%' || regexp_replace(c.telefone_externo, '\D', '', 'g')
  AND (c.nome_contato IS NULL OR c.nome_contato = '' OR c.nome_contato = 'Não identificado')
  AND ct.nome IS NOT NULL
  AND ct.nome != '';

-- ============================================================
-- Comentários nos campos para documentação
-- ============================================================
COMMENT ON COLUMN conversations.nome_contato IS 'Nome de exibição resolvido (cache)';
COMMENT ON COLUMN conversations.name_source IS 'Origem do nome: manual | contact | pushname | lead | conversation | phone | unknown';
COMMENT ON COLUMN conversations.whatsapp_push_name IS 'pushName/profileName mais recente vindo da Evolution API';
COMMENT ON COLUMN conversations.is_name_manually_edited IS 'Indica se o nome foi editado manualmente (não sobrescrever)';
