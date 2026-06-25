-- Índice para queries de relatório por data
CREATE INDEX IF NOT EXISTS conversations_org_criado_em_idx ON conversations(organization_id, criado_em);

-- RPC: métricas de atendimento por vendedor
CREATE OR REPLACE FUNCTION metricas_atendimento_whatsapp(
  p_org_id UUID,
  p_inicio TIMESTAMPTZ DEFAULT now() - interval '30 days',
  p_fim TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE(
  vendedor_id UUID,
  vendedor_nome TEXT,
  total_conversas BIGINT,
  conversas_finalizadas BIGINT,
  conversas_sem_resposta BIGINT,
  tempo_medio_primeira_resposta_min NUMERIC,
  total_mensagens_enviadas BIGINT
)
LANGUAGE sql
SECURITY DEFINER SET search_path = public
STABLE
AS $$
  WITH validacao AS (
    SELECT 1 WHERE p_org_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  ),
  conversas_periodo AS (
    SELECT c.id, c.responsavel_id, c.status, c.criado_em
    FROM conversations c, validacao
    WHERE c.organization_id = p_org_id
      AND c.criado_em BETWEEN p_inicio AND p_fim
      AND c.responsavel_id IS NOT NULL
  ),
  primeira_resposta AS (
    SELECT
      cp.id AS conversation_id,
      cp.responsavel_id,
      (SELECT MIN(m.enviado_em) FROM messages m WHERE m.conversation_id = cp.id AND m.organization_id = p_org_id AND m.direcao = 'recebida') AS primeira_msg_recebida,
      (SELECT MIN(m.enviado_em) FROM messages m WHERE m.conversation_id = cp.id AND m.organization_id = p_org_id AND m.direcao = 'enviada') AS primeira_resposta_enviada
    FROM conversas_periodo cp
  ),
  msgs_enviadas AS (
    SELECT m.responsavel_id, COUNT(*) AS total
    FROM messages m, validacao
    WHERE m.organization_id = p_org_id
      AND m.direcao = 'enviada'
      AND m.enviado_em BETWEEN p_inicio AND p_fim
      AND m.responsavel_id IS NOT NULL
    GROUP BY m.responsavel_id
  )
  SELECT
    p.id AS vendedor_id,
    p.nome AS vendedor_nome,
    COUNT(DISTINCT cp.id) AS total_conversas,
    COUNT(DISTINCT cp.id) FILTER (WHERE cp.status = 'finalizada') AS conversas_finalizadas,
    COUNT(DISTINCT cp.id) FILTER (WHERE cp.status = 'nao_atendida') AS conversas_sem_resposta,
    ROUND(AVG(
      CASE WHEN pr.primeira_resposta_enviada IS NOT NULL AND pr.primeira_msg_recebida IS NOT NULL
        THEN EXTRACT(EPOCH FROM (pr.primeira_resposta_enviada - pr.primeira_msg_recebida)) / 60
        ELSE NULL
      END
    )::NUMERIC, 1) AS tempo_medio_primeira_resposta_min,
    COALESCE(me.total, 0) AS total_mensagens_enviadas
  FROM profiles p
  LEFT JOIN conversas_periodo cp ON cp.responsavel_id = p.id
  LEFT JOIN primeira_resposta pr ON pr.conversation_id = cp.id
  LEFT JOIN msgs_enviadas me ON me.responsavel_id = p.id
  WHERE p.organization_id = p_org_id
    AND p.ativo = true
    AND p.cargo IN ('vendedor', 'atendimento', 'gestor', 'admin')
    AND EXISTS (SELECT 1 FROM validacao)
  GROUP BY p.id, p.nome, me.total
  ORDER BY total_conversas DESC;
$$;
