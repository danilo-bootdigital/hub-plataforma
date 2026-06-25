-- RPC para buscar última mensagem de cada conversa (evita query N+1)
CREATE OR REPLACE FUNCTION ultimas_mensagens_por_conversa(
  p_conversation_ids UUID[],
  p_org_id UUID
)
RETURNS TABLE(conversation_id UUID, conteudo TEXT)
LANGUAGE sql
SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT DISTINCT ON (m.conversation_id) m.conversation_id, m.conteudo
  FROM messages m
  WHERE m.conversation_id = ANY(p_conversation_ids)
    AND m.organization_id = p_org_id
  ORDER BY m.conversation_id, m.enviado_em DESC;
$$;
