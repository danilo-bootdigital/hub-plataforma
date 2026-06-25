-- RPC para trocar ordem de duas etapas atomicamente
CREATE OR REPLACE FUNCTION trocar_ordem_etapas(
  p_etapa_a UUID,
  p_etapa_b UUID,
  p_org_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ordem_a INT;
  v_ordem_b INT;
BEGIN
  SELECT ordem INTO v_ordem_a FROM pipeline_stages WHERE id = p_etapa_a AND organization_id = p_org_id;
  SELECT ordem INTO v_ordem_b FROM pipeline_stages WHERE id = p_etapa_b AND organization_id = p_org_id;

  IF v_ordem_a IS NULL OR v_ordem_b IS NULL THEN
    RAISE EXCEPTION 'Etapa não encontrada';
  END IF;

  UPDATE pipeline_stages SET ordem = v_ordem_b, atualizado_em = now() WHERE id = p_etapa_a AND organization_id = p_org_id;
  UPDATE pipeline_stages SET ordem = v_ordem_a, atualizado_em = now() WHERE id = p_etapa_b AND organization_id = p_org_id;
END;
$$;
