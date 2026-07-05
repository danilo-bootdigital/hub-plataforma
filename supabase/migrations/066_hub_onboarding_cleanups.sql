-- Migration 066: Cleanups do Cadastro de Clientes (DEC-020) — code review
-- ============================================================================
-- CORRETIVO/EFICIÊNCIA. Idempotente (CREATE OR REPLACE). Não altera dados/estruturas.
--
--  #7  onboarding_listar duplicava o CTE inteiro (count + rows). Reescrito com
--      count(*) OVER() num único CTE — total e linhas sempre consistentes.
--  #6  onboarding_arquivo_valido: checagem leve de escopo p/ URL assinada de documento
--      (evita carregar o detalhe completo — cadastro + arquivos + eventos — só para
--      validar que um storage_path pertence ao cadastro). Escopo por perfil idêntico
--      ao onboarding_detalhe (Hub ⇒ hub_id; Indústria ⇒ industry_id).
--
-- Aplicar no HUB DEV (pnkgwfgjhijksfmofiot) via SQL Editor ANTES de fazer deploy da app
-- (o server action usa a nova RPC, com fallback para o detalhe se ela ainda não existir).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- #7 onboarding_listar — CTE único com count(*) OVER()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION onboarding_listar(
  p_status text DEFAULT NULL, p_busca text DEFAULT NULL, p_cpf text DEFAULT NULL,
  p_cnpj text DEFAULT NULL, p_conselho text DEFAULT NULL, p_email text DEFAULT NULL,
  p_hub_id uuid DEFAULT NULL, p_limit int DEFAULT 25, p_offset int DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; v_industria boolean; v_total bigint; v_rows jsonb;
BEGIN
  SELECT * INTO c FROM fn_hco_caller();
  v_industria := c.cargo IN ('admin','gestor');

  WITH base AS (
    SELECT o.*,
           cr.nome AS responsavel_nome,
           h.nome  AS hub_nome,
           count(*) OVER() AS _total          -- total de linhas que casam o WHERE (antes do LIMIT)
    FROM hub_client_onboarding o
    LEFT JOIN profiles cr ON cr.id = o.criado_por
    LEFT JOIN hubs h ON h.id = o.hub_id
    WHERE (
      (v_industria AND o.industry_id = c.organization_id)
      OR (NOT v_industria AND o.hub_id = c.hub_id)
    )
    AND (p_status   IS NULL OR o.status = p_status)
    AND (p_hub_id   IS NULL OR o.hub_id = p_hub_id)
    AND (p_cpf      IS NULL OR o.cpf ILIKE '%'||p_cpf||'%')
    AND (p_cnpj     IS NULL OR o.cnpj ILIKE '%'||p_cnpj||'%')
    AND (p_conselho IS NULL OR o.registro_conselho ILIKE '%'||p_conselho||'%')
    AND (p_email    IS NULL OR o.email ILIKE '%'||p_email||'%')
    AND (p_busca    IS NULL OR o.nome_completo ILIKE '%'||p_busca||'%'
                            OR o.razao_social ILIKE '%'||p_busca||'%'
                            OR o.nome_fantasia ILIKE '%'||p_busca||'%')
    ORDER BY o.updated_at DESC
    LIMIT GREATEST(p_limit,1) OFFSET GREATEST(p_offset,0)
  )
  SELECT COALESCE(max(_total), 0),
         COALESCE(jsonb_agg(jsonb_build_object(
           'id', id, 'tipo_pessoa', tipo_pessoa, 'status', status,
           'nome', COALESCE(nome_completo, nome_fantasia, razao_social),
           'cpf_cnpj', COALESCE(cnpj, cpf), 'registro_conselho', registro_conselho,
           'email', email, 'hub_id', hub_id, 'hub_nome', hub_nome,
           'responsavel_nome', responsavel_nome,
           'enviado_em', enviado_em, 'updated_at', updated_at, 'created_at', created_at
         ) ORDER BY updated_at DESC), '[]'::jsonb)
  INTO v_total, v_rows
  FROM base;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END $$;

-- ----------------------------------------------------------------------------
-- #6 onboarding_arquivo_valido — checagem leve de escopo para URL assinada
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION onboarding_arquivo_valido(p_id uuid, p_path text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; o record;
BEGIN
  SELECT * INTO c FROM fn_hco_caller();
  SELECT * INTO o FROM hub_client_onboarding WHERE id = p_id;
  IF o.id IS NULL THEN RETURN false; END IF;

  IF c.cargo IN ('admin','gestor') THEN
    IF o.industry_id IS DISTINCT FROM c.organization_id THEN RETURN false; END IF;
  ELSE
    IF o.hub_id IS DISTINCT FROM c.hub_id THEN RETURN false; END IF;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM hub_client_onboarding_files f
     WHERE f.onboarding_id = p_id AND f.storage_path = p_path
  );
END $$;

COMMENT ON FUNCTION onboarding_arquivo_valido(uuid, text) IS
  'DEC-020: valida (escopo por perfil + pertencimento) se p_path é um documento do cadastro p_id, para autorizar a URL assinada sem carregar o detalhe completo.';
