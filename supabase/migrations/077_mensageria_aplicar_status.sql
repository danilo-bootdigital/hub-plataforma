-- Migration 077: Mensageria — reconciliação de status de entrega (DEC-023 · E9.4)
-- ============================================================================
-- ADITIVO. SQL puro: SOMENTE a RPC communication_aplicar_status + grants.
-- Sem DDL de tabela/coluna/índice — o schema da 072 já suporta os 4 estados
-- de entrega (messages.status e message_events.evento) e o índice de busca
-- uq_comm_msg_provider_id (provider, provider_message_id) já existe.
--
-- Reconciliação dos status reportados pelo provider (já normalizados pelo adapter):
--   'enviada' | 'entregue' | 'lida' | 'falha'.
--
-- Monotonicidade POR ESTADO (não por timestamp — o provider pode reportar fora de
-- ordem): enfileirada=1 < enviada=2 < entregue=3 < lida=4.
--   - positivos (enviada/entregue/lida): aplica só se rank(novo) > rank(atual);
--   - falha: aplica só se o atual ∈ {enfileirada, enviada} (após entregue/lida é ignorada).
-- Guarda de direção: só mensagens OUTBOUND. Idempotência: duplicado/regressão são
-- no-op e NÃO geram message_event (append-only preservado — só INSERT na transição).
-- Não encontrada: retorna sem erro e sem efeito (a política de fila é do poller/E9.5).
--
-- Grants padrão 075: só service_role executa. Aplicar no HUB DEV via SQL Editor após 076.
-- ============================================================================

CREATE OR REPLACE FUNCTION communication_aplicar_status(
  p_provider            text,
  p_provider_message_id text,
  p_status              text,
  p_erro                text,
  p_ocorrido_em         timestamptz
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  m record;
  v_rank_atual int;
  v_rank_novo  int;
  v_aplica     boolean;
  v_quando     timestamptz := COALESCE(p_ocorrido_em, now());
BEGIN
  -- localizar a mensagem OUTBOUND por (provider, wamid); usa uq_comm_msg_provider_id
  SELECT id, hub_id, status, provider, enviada_em
    INTO m
    FROM communication_messages
   WHERE provider = p_provider
     AND provider_message_id = p_provider_message_id
     AND direction = 'outbound';

  IF m.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'resultado', 'mensagem_nao_encontrada');
  END IF;

  -- ranking por estado (não por tempo)
  v_rank_atual := CASE m.status
                    WHEN 'enfileirada' THEN 1 WHEN 'enviada' THEN 2
                    WHEN 'entregue' THEN 3 WHEN 'lida' THEN 4 ELSE 0 END;
  v_rank_novo  := CASE p_status
                    WHEN 'enviada' THEN 2 WHEN 'entregue' THEN 3 WHEN 'lida' THEN 4 ELSE 0 END;

  IF p_status = 'falha' THEN
    -- falha só de um estado ainda não-entregue
    v_aplica := m.status IN ('enfileirada', 'enviada');
  ELSE
    -- positivos: só avança (nunca regride, nunca reaplica o mesmo)
    v_aplica := v_rank_novo > v_rank_atual;
  END IF;

  IF NOT v_aplica THEN
    -- distingue duplicado (mesmo nível) de regressão (nível menor / falha tardia)
    RETURN jsonb_build_object(
      'ok', true,
      'resultado', CASE WHEN p_status <> 'falha' AND v_rank_novo = v_rank_atual
                        THEN 'ignorado_duplicado' ELSE 'ignorado_regressao' END,
      'message_id', m.id, 'status_anterior', m.status, 'status_novo', m.status);
  END IF;

  -- aplica a transição; backfill de enviada_em quando ainda nulo (recupera confirmacao_falhou)
  UPDATE communication_messages
     SET status = p_status,
         enviada_em = CASE WHEN enviada_em IS NULL AND p_status <> 'falha'
                           THEN v_quando ELSE enviada_em END
   WHERE id = m.id;

  -- ledger append-only: 1 event por transição real
  INSERT INTO communication_message_events (hub_id, message_id, evento, provider, erro, ocorrido_em)
  VALUES (m.hub_id, m.id, p_status, m.provider,
          CASE WHEN p_status = 'falha' THEN p_erro ELSE NULL END, v_quando);

  RETURN jsonb_build_object('ok', true, 'resultado', 'aplicado',
                            'message_id', m.id, 'status_anterior', m.status, 'status_novo', p_status);
END $$;

COMMENT ON FUNCTION communication_aplicar_status(text,text,text,text,timestamptz) IS
  'DEC-023 E9.4: reconcilia status de entrega (enviada/entregue/lida/falha) por (provider,wamid); monotônico por estado; idempotente; append-only em message_events.';

-- Exposição: só service_role (padrão da 075).
DO $$
DECLARE fn text := 'communication_aplicar_status(text,text,text,text,timestamptz)';
BEGIN
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn); END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn); END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn); END IF;
END $$;
