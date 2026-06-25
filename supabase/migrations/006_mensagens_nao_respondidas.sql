-- RPC para buscar mensagens nao respondidas (ultima recebida por conversa sem resposta posterior)
CREATE OR REPLACE FUNCTION mensagens_nao_respondidas(p_org_id UUID, p_limit INT DEFAULT 50)
RETURNS TABLE(
  conversa_id UUID,
  telefone_externo TEXT,
  lead_nome TEXT,
  lead_id UUID,
  conteudo TEXT,
  enviado_em TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT c.id, c.telefone_externo, l.nome, l.id, m.conteudo, m.enviado_em
  FROM conversations c
  JOIN LATERAL (
    SELECT m1.conteudo, m1.enviado_em
    FROM messages m1
    WHERE m1.conversation_id = c.id AND m1.direcao = 'recebida'
    ORDER BY m1.enviado_em DESC LIMIT 1
  ) m ON true
  LEFT JOIN leads l ON l.id = c.lead_id
  WHERE c.organization_id = p_org_id
    AND NOT EXISTS (
      SELECT 1 FROM messages m2
      WHERE m2.conversation_id = c.id
        AND m2.direcao = 'enviada'
        AND m2.enviado_em > m.enviado_em
    )
  ORDER BY m.enviado_em DESC
  LIMIT p_limit;
$$;
