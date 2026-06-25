-- RPC para selecionar próximo vendedor de forma atômica (evita race condition)
CREATE OR REPLACE FUNCTION selecionar_proximo_vendedor(
  p_config_id UUID,
  p_total_vendedores INT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_idx INT;
BEGIN
  UPDATE lead_distribution_config
  SET proximo_vendedor_idx = proximo_vendedor_idx + 1
  WHERE id = p_config_id
  RETURNING proximo_vendedor_idx - 1 INTO v_idx;

  RETURN v_idx % p_total_vendedores;
END;
$$;
