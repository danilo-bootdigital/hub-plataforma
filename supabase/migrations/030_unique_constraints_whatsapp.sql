-- Prevenir conversas duplicadas para o mesmo telefone na mesma instância
CREATE UNIQUE INDEX IF NOT EXISTS conversations_instance_telefone_unique
  ON conversations (whatsapp_instance_id, telefone_externo);

-- Prevenir mensagens duplicadas pelo ID externo
CREATE UNIQUE INDEX IF NOT EXISTS messages_externo_unique
  ON messages (organization_id, message_id_externo)
  WHERE message_id_externo IS NOT NULL;
