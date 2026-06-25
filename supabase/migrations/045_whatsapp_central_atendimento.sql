-- ============================================================
-- Migração 045: Central de Atendimento WhatsApp - DPRIME
-- Suporte ao redesign 3 colunas (KPIs, filtros, painel, soft archive)
-- ============================================================
-- Itens validados no banco real em 2026-06-XX:
--   ✅ enum conversa_status existe com valores:
--      nao_atendida | em_atendimento | aguardando_cliente | finalizada
--   ✅ messages.lida_em existe (TIMESTAMPTZ nullable)
--   ✅ messages.direcao ∈ {enviada, recebida}
--   ✅ messages.enviado_em existe (TIMESTAMPTZ)
--   ✅ Backfill: 64 conversas impactadas (ate 85 msgs/conversa)
-- ============================================================

-- ============================================================
-- 1. Colunas em conversations
-- ============================================================

-- 1.1 Contador de nao lidas (atualizado via trigger secao 5)
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS nao_lidas INT NOT NULL DEFAULT 0;

-- 1.2 Soft delete: NULL = ativa, data = arquivada
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS arquivada_em TIMESTAMPTZ;

-- 1.3 Cache do nome resolvido
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS nome_contato TEXT;

-- 1.4 Origem do nome: manual | contact | pushname | lead | phone | unknown
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS name_source TEXT;

-- 1.5 pushName vindo da Evolution API
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS whatsapp_push_name TEXT;

-- 1.6 Flag para impedir sobrescrita do nome quando editado manualmente
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS is_name_manually_edited BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 2. Vinculo entre tarefas e conversas
-- ============================================================
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL;

-- ============================================================
-- 3. Indices para performance
-- ============================================================

-- 3.1 Nao lidas (parcial, otimiza KPIs e badge)
CREATE INDEX IF NOT EXISTS idx_conversations_nao_lidas
  ON conversations(nao_lidas) WHERE nao_lidas > 0;

-- 3.2 Conversas ativas (parcial, otimiza filtro "apenas ativas")
CREATE INDEX IF NOT EXISTS idx_conversations_arquivada_em
  ON conversations(arquivada_em) WHERE arquivada_em IS NULL;

-- 3.3 Filtro composto: instancia + status (usado em KPIs por status)
CREATE INDEX IF NOT EXISTS idx_conversations_instancia_status
  ON conversations(whatsapp_instance_id, status);

-- 3.4 Busca por nome de contato
CREATE INDEX IF NOT EXISTS idx_conversations_nome_contato
  ON conversations(nome_contato);

-- 3.5 Vinculo conversa -> tarefa
CREATE INDEX IF NOT EXISTS idx_tasks_conversation_id
  ON tasks(conversation_id) WHERE conversation_id IS NOT NULL;

-- ============================================================
-- 4. Comentarios de documentacao
-- ============================================================
COMMENT ON COLUMN conversations.nao_lidas IS
  'Contador de mensagens recebidas e ainda nao respondidas. Zerado automaticamente quando vendedor envia mensagem (ver trigger trg_atualizar_nao_lidas).';

COMMENT ON COLUMN conversations.arquivada_em IS
  'Soft delete: NULL = conversa ativa; com data = arquivada (oculta da lista padrao).';

COMMENT ON COLUMN conversations.nome_contato IS
  'Cache do nome de exibicao. Origem registrada em name_source.';

COMMENT ON COLUMN conversations.name_source IS
  'Origem do nome: manual | contact | pushname | lead | phone | unknown';

COMMENT ON COLUMN conversations.whatsapp_push_name IS
  'pushName mais recente vindo da Evolution API';

COMMENT ON COLUMN conversations.is_name_manually_edited IS
  'Se true, webhook e triggers NAO sobrescrevem nome_contato.';

COMMENT ON COLUMN tasks.conversation_id IS
  'Vinculo opcional com a conversa que originou a tarefa.';

-- ============================================================
-- 5. TRIGGER: manter nao_lidas sincronizado
-- ============================================================
-- Regra documentada (validada com usuario em 2026-06-XX):
--
--   Ao inserir mensagem com direcao = 'recebida':
--     -> incrementa nao_lidas + 1
--     -> atualiza ultima_mensagem_em
--
--   Ao inserir mensagem com direcao = 'enviada':
--     -> ZERA nao_lidas (regra confirmada)
--     -> atualiza ultima_mensagem_em
--     -> se status = 'nao_atendida', muda para 'em_atendimento'
--        (transicao valida: 'nao_atendida' existe no enum)
-- ============================================================

CREATE OR REPLACE FUNCTION fn_atualizar_nao_lidas_conversa()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.direcao = 'recebida' THEN
    -- Chegou mensagem do cliente: incrementa contador
    UPDATE conversations
    SET nao_lidas = nao_lidas + 1,
        ultima_mensagem_em = NEW.enviado_em,
        atualizado_em = now()
    WHERE id = NEW.conversation_id;

  ELSIF NEW.direcao = 'enviada' THEN
    -- Vendedor respondeu: zera contador e marca como em atendimento
    UPDATE conversations
    SET nao_lidas = 0,
        ultima_mensagem_em = NEW.enviado_em,
        status = CASE
          WHEN status = 'nao_atendida'::conversa_status
          THEN 'em_atendimento'::conversa_status
          ELSE status
        END,
        atualizado_em = now()
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizar_nao_lidas ON messages;

CREATE TRIGGER trg_atualizar_nao_lidas
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION fn_atualizar_nao_lidas_conversa();

-- ============================================================
-- 6. Backfill: inicializar nao_lidas a partir do historico
-- ============================================================
-- Estimativa: 64 conversas impactadas, algumas com 80+ msgs nao lidas.
-- Limitado a 99 para evitar numeros absurdos na UI inicial.
-- Sera executado uma unica vez na aplicacao da migration.
-- ============================================================
UPDATE conversations c
SET nao_lidas = LEAST(COALESCE(sub.qtd, 0), 99)
FROM (
  SELECT m.conversation_id, COUNT(*) AS qtd
  FROM messages m
  WHERE m.direcao = 'recebida'
    AND m.lida_em IS NULL
  GROUP BY m.conversation_id
) sub
WHERE c.id = sub.conversation_id;
