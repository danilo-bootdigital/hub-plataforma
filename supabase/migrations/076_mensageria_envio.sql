-- Migration 076: Mensageria — envio outbound (DEC-023 · E9)
-- ============================================================================
-- ADITIVO. Idempotente. Texto apenas, dentro da janela de atendimento (E9).
--
-- (1) coluna communication_messages.idempotency_key (nullable) + índice único parcial
--     (hub_id, idempotency_key) → idempotência do ENVIO (o provider_message_id só existe
--     após a resposta da Meta, então uq_comm_msg_provider_id não cobre double-send).
-- (2) RPC communication_registrar_envio: cria message outbound 'enfileirada' (idempotente),
--     event('enfileirada'); na conversa: unread_count=0, last_message_at=GREATEST,
--     status novo→em_atendimento. Retorna jsonb p/ o dispatcher (message_id, provider,
--     account_external_id, to, ja_existia).
-- (3) RPC communication_confirmar_envio: seta provider_message_id + status='enviada' + event.
-- (4) RPC communication_registrar_falha: status='falha' + event('falha').
--
-- Grants padrão 075: só service_role executa. Aplicar no HUB DEV via SQL Editor após 072-075.
-- ============================================================================

ALTER TABLE communication_messages ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS uq_comm_msg_idempotency
  ON communication_messages(hub_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- registrar_envio: enfileira 1 mensagem outbound (idempotente por idempotency_key)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION communication_registrar_envio(
  p_conversation_id uuid,
  p_corpo           text,
  p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  c record; v_acc record; v_ext_user text; v_msg uuid;
BEGIN
  SELECT id, hub_id, account_id, channel_identity_id, status
    INTO c FROM communication_conversations WHERE id = p_conversation_id;
  IF c.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'conversa_nao_encontrada');
  END IF;

  SELECT external_account_id, provider INTO v_acc FROM communication_accounts WHERE id = c.account_id;
  SELECT external_user_id INTO v_ext_user FROM communication_channel_identities WHERE id = c.channel_identity_id;

  INSERT INTO communication_messages
    (hub_id, conversation_id, direction, tipo, corpo, provider, status, idempotency_key)
  VALUES
    (c.hub_id, c.id, 'outbound', 'texto', p_corpo, v_acc.provider, 'enfileirada', p_idempotency_key)
  ON CONFLICT (hub_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
  RETURNING id INTO v_msg;

  IF v_msg IS NULL THEN
    -- replay idempotente: mensagem já enfileirada com essa chave
    SELECT id INTO v_msg FROM communication_messages
     WHERE hub_id = c.hub_id AND idempotency_key = p_idempotency_key;
    RETURN jsonb_build_object('ok', true, 'ja_existia', true, 'message_id', v_msg,
                              'provider', v_acc.provider, 'account_external_id', v_acc.external_account_id, 'to', v_ext_user);
  END IF;

  INSERT INTO communication_message_events (hub_id, message_id, evento, provider)
  VALUES (c.hub_id, v_msg, 'enfileirada', v_acc.provider);

  -- envio humano: zera unread, avança conversa e atualiza recência (mesma transação)
  UPDATE communication_conversations
     SET unread_count    = 0,
         last_message_at = GREATEST(COALESCE(last_message_at, now()), now()),
         status          = CASE WHEN status = 'novo' THEN 'em_atendimento' ELSE status END
   WHERE id = c.id;

  RETURN jsonb_build_object('ok', true, 'ja_existia', false, 'message_id', v_msg,
                            'provider', v_acc.provider, 'account_external_id', v_acc.external_account_id, 'to', v_ext_user);
END $$;

-- ---------------------------------------------------------------------------
-- confirmar_envio: resposta 200 da Meta (wamid) → 'enviada' (guarda: só de 'enfileirada')
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION communication_confirmar_envio(
  p_message_id          uuid,
  p_provider_message_id text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_hub uuid; v_provider text;
BEGIN
  UPDATE communication_messages
     SET provider_message_id = p_provider_message_id, status = 'enviada', enviada_em = now()
   WHERE id = p_message_id AND status = 'enfileirada'
   RETURNING hub_id, provider INTO v_hub, v_provider;
  IF FOUND THEN
    INSERT INTO communication_message_events (hub_id, message_id, evento, provider)
    VALUES (v_hub, p_message_id, 'enviada', v_provider);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- registrar_falha: erro de envio → 'falha' (guarda: só de 'enfileirada')
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION communication_registrar_falha(
  p_message_id uuid,
  p_erro       text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_hub uuid; v_provider text;
BEGIN
  UPDATE communication_messages
     SET status = 'falha'
   WHERE id = p_message_id AND status = 'enfileirada'
   RETURNING hub_id, provider INTO v_hub, v_provider;
  IF FOUND THEN
    INSERT INTO communication_message_events (hub_id, message_id, evento, provider, erro)
    VALUES (v_hub, p_message_id, 'falha', v_provider, p_erro);
  END IF;
END $$;

COMMENT ON FUNCTION communication_registrar_envio(uuid,text,text) IS 'DEC-023 E9: enfileira mensagem outbound (idempotente); zera unread, novo→em_atendimento, last_message_at.';
COMMENT ON FUNCTION communication_confirmar_envio(uuid,text) IS 'DEC-023 E9: confirma envio (wamid) → status enviada + event.';
COMMENT ON FUNCTION communication_registrar_falha(uuid,text) IS 'DEC-023 E9: marca falha de envio → status falha + event.';

-- Exposição: só service_role (padrão da 075).
DO $$
DECLARE fns text[] := ARRAY[
  'communication_registrar_envio(uuid,text,text)',
  'communication_confirmar_envio(uuid,text)',
  'communication_registrar_falha(uuid,text)'
]; fn text;
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn); END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn); END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn); END IF;
  END LOOP;
END $$;
