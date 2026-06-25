-- RPC para buscar conversas sem resposta (última mensagem é recebida)
CREATE OR REPLACE FUNCTION conversas_sem_resposta(
  p_org_id UUID,
  p_minutos_limite INT DEFAULT 30
)
RETURNS TABLE(conversation_id UUID, minutos_sem_resposta INT)
LANGUAGE sql
SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT c.id AS conversation_id,
         EXTRACT(EPOCH FROM (now() - c.ultima_mensagem_em))::INT / 60 AS minutos_sem_resposta
  FROM conversations c
  WHERE c.organization_id = p_org_id
    AND p_org_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND c.status IN ('nao_atendida', 'em_atendimento')
    AND c.ultima_mensagem_em IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM messages m
      WHERE m.conversation_id = c.id
        AND m.organization_id = p_org_id
        AND m.direcao = 'recebida'
        AND m.enviado_em = c.ultima_mensagem_em
    )
    AND EXTRACT(EPOCH FROM (now() - c.ultima_mensagem_em)) / 60 >= p_minutos_limite
  ORDER BY c.ultima_mensagem_em ASC;
$$;
