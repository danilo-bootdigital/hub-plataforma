-- Permitir whatsapp_instance_id NULL em conversations
-- (necessário para quando instância é excluída e conversas são desvinculadas)
ALTER TABLE conversations
  ALTER COLUMN whatsapp_instance_id DROP NOT NULL;

-- Remover unique constraint antigo (por instância + telefone)
-- A nova lógica busca conversas por organization_id + telefone
DROP INDEX IF EXISTS conversations_instance_telefone_unique;

-- Novo unique: uma conversa por telefone por organização
CREATE UNIQUE INDEX IF NOT EXISTS conversations_org_telefone_unique
  ON conversations (organization_id, telefone_externo);
