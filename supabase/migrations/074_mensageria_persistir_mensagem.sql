-- Migration 074: Mensageria — RPC de persistência de mensagem (DEC-023 · Fatia 0, Etapa 8B.2)
-- ============================================================================
-- ADITIVO. Idempotente (CREATE OR REPLACE). NÃO cria tabela/coluna.
--
-- communication_persistir_mensagem(...): persiste UMA mensagem de entrada normalizada
-- em UMA TRANSAÇÃO (função = 1 transação), de forma idempotente:
--   1. resolve communication_account por (provider, external_account_id) → hub_id + channel;
--      conta inexistente → retorna 'conta_nao_encontrada' (nada é criado);
--   2. upsert communication_channel_identities (ON CONFLICT hub_id,channel,provider,external_user_id);
--   3. upsert communication_conversations (ON CONFLICT account_id,channel_identity_id);
--   4. upsert communication_conversation_participants (ON CONFLICT parcial conversation_id,channel_identity_id);
--   5. insert communication_messages (ON CONFLICT parcial provider,provider_message_id DO NOTHING);
--      se já existia → retorna 'duplicada' (NÃO cria event nem reincrementa unread);
--   6. insert communication_message_events('recebida');
--   7. UPDATE conversation: unread_count+1 e last_message_at = GREATEST(...)  — MESMA transação.
--
-- Escopo 8B.2: NÃO baixa mídia, NÃO cria message_attachments, NÃO envia, NÃO agenda cron.
-- Mensagens de mídia criam apenas a message (tipo + corpo/legenda). Retorno: texto
-- 'criada' | 'duplicada' | 'conta_nao_encontrada'.
-- Aplicar no HUB DEV (pnkgwfgjhijksfmofiot) via SQL Editor.
-- ============================================================================

CREATE OR REPLACE FUNCTION communication_persistir_mensagem(
  p_provider            text,
  p_account_external_id text,
  p_external_user_id    text,
  p_telefone            text,
  p_display_name        text,
  p_tipo                text,
  p_corpo               text,
  p_provider_message_id text,
  p_ocorrido_em         timestamptz DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acc_id   uuid;
  v_hub      uuid;
  v_channel  text;
  v_identity uuid;
  v_conv     uuid;
  v_part     uuid;
  v_msg      uuid;
  v_time     timestamptz;
BEGIN
  -- (1) resolver conta conectada
  SELECT id, hub_id, channel INTO v_acc_id, v_hub, v_channel
    FROM communication_accounts
   WHERE provider = p_provider AND external_account_id = p_account_external_id;
  IF v_acc_id IS NULL THEN
    RETURN 'conta_nao_encontrada';
  END IF;

  v_time := COALESCE(p_ocorrido_em, now());

  -- (2) identidade do participante externo (idempotente)
  INSERT INTO communication_channel_identities (hub_id, channel, provider, external_user_id, telefone, display_name)
  VALUES (v_hub, v_channel, p_provider, p_external_user_id, p_telefone, p_display_name)
  ON CONFLICT (hub_id, channel, provider, external_user_id) DO UPDATE
    SET telefone     = COALESCE(EXCLUDED.telefone, communication_channel_identities.telefone),
        display_name = COALESCE(EXCLUDED.display_name, communication_channel_identities.display_name)
  RETURNING id INTO v_identity;

  -- (3) conversa (idempotente por account_id + channel_identity_id)
  INSERT INTO communication_conversations (hub_id, account_id, channel, channel_identity_id)
  VALUES (v_hub, v_acc_id, v_channel, v_identity)
  ON CONFLICT (account_id, channel_identity_id) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_conv;

  -- (4) participante externo (idempotente; índice parcial)
  INSERT INTO communication_conversation_participants (hub_id, conversation_id, tipo, channel_identity_id, papel)
  VALUES (v_hub, v_conv, 'externo', v_identity, 'cliente')
  ON CONFLICT (conversation_id, channel_identity_id) WHERE channel_identity_id IS NOT NULL DO NOTHING;
  SELECT id INTO v_part
    FROM communication_conversation_participants
   WHERE conversation_id = v_conv AND channel_identity_id = v_identity;

  -- (5) mensagem (idempotente por provider + provider_message_id)
  INSERT INTO communication_messages
    (hub_id, conversation_id, direction, sender_participant_id, tipo, corpo, provider, provider_message_id, status, enviada_em)
  VALUES
    (v_hub, v_conv, 'inbound', v_part, p_tipo, p_corpo, p_provider, p_provider_message_id, 'recebida', v_time)
  ON CONFLICT (provider, provider_message_id) WHERE provider_message_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_msg;

  IF v_msg IS NULL THEN
    RETURN 'duplicada';  -- entrega repetida: não cria event nem reincrementa unread
  END IF;

  -- (6) evento de ciclo de vida
  INSERT INTO communication_message_events (hub_id, message_id, evento, provider, ocorrido_em)
  VALUES (v_hub, v_msg, 'recebida', p_provider, v_time);

  -- (7) contadores da conversa na MESMA transação (só para mensagem nova)
  UPDATE communication_conversations
     SET unread_count    = unread_count + 1,
         last_message_at = GREATEST(COALESCE(last_message_at, v_time), v_time)
   WHERE id = v_conv;

  RETURN 'criada';
END $$;

COMMENT ON FUNCTION communication_persistir_mensagem(text,text,text,text,text,text,text,text,timestamptz) IS
  'DEC-023 Etapa 8B.2: persiste 1 mensagem de entrada (identity/conversation/participant/message/message_event + unread/last_message) em 1 transação, idempotente. Sem mídia/attachment. Retorna criada|duplicada|conta_nao_encontrada.';

-- Exposição: só service role (poller). Remove EXECUTE default de PUBLIC.
REVOKE ALL ON FUNCTION communication_persistir_mensagem(text,text,text,text,text,text,text,text,timestamptz) FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION communication_persistir_mensagem(text,text,text,text,text,text,text,text,timestamptz) TO service_role;
  END IF;
END $$;
