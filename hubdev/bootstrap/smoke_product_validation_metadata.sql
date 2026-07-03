-- SMOKE 061 — product_validation_metadata (DEC-019 MVP-5′)
-- Rodar no SQL Editor do HUB DEV DEPOIS de aplicar a 061. Transação + ROLLBACK: não deixa dados.
-- Superuser no SQL Editor → RLS bypassada; valida estrutura + CHECKs + UNIQUE.

BEGIN;

DO $$
DECLARE v_org uuid; v_prod uuid; v_ok boolean;
BEGIN
  -- A) tabela + RLS
  IF to_regclass('public.product_validation_metadata') IS NULL THEN RAISE EXCEPTION 'FALTA tabela product_validation_metadata'; END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.product_validation_metadata'::regclass) THEN
    RAISE EXCEPTION 'RLS desabilitada'; END IF;
  RAISE NOTICE 'A) tabela/RLS: OK';

  v_org  := (SELECT id FROM organizations LIMIT 1);
  v_prod := (SELECT id FROM products WHERE organization_id = v_org LIMIT 1);
  IF v_org IS NULL OR v_prod IS NULL THEN RAISE NOTICE 'sem org/produto — testes de dados pulados'; RETURN; END IF;

  -- B) inserts válidos por tipo
  INSERT INTO product_validation_metadata(organization_id, product_id, chave, tipo, valores)
    VALUES (v_org, v_prod, 'medicamento_aliases', 'lista', ARRAY['Tirzepatida','Mounjaro']);
  INSERT INTO product_validation_metadata(organization_id, product_id, chave, tipo, valor_num)
    VALUES (v_org, v_prod, 'limite_maximo_por_receita', 'numero', 3);
  RAISE NOTICE 'B) inserts lista/numero: OK';

  -- C) UNIQUE(product_id, chave)
  v_ok := false;
  BEGIN
    INSERT INTO product_validation_metadata(organization_id, product_id, chave, tipo, valores)
      VALUES (v_org, v_prod, 'medicamento_aliases', 'lista', ARRAY['Zepbound']);
  EXCEPTION WHEN unique_violation THEN v_ok := true; END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FALHOU: UNIQUE(product_id,chave) nao bloqueou'; END IF;
  RAISE NOTICE 'C) UNIQUE(product_id,chave): OK (bloqueado)';

  -- D) chave restrita por CHECK
  v_ok := false;
  BEGIN
    INSERT INTO product_validation_metadata(organization_id, product_id, chave, tipo, valores)
      VALUES (v_org, v_prod, 'chave_invalida', 'lista', ARRAY['x']);
  EXCEPTION WHEN check_violation THEN v_ok := true; END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FALHOU: chave invalida aceita'; END IF;
  RAISE NOTICE 'D) chave restrita: OK (bloqueado)';

  -- E) CHECK tipo x coluna: tipo 'numero' com valores (lista) deve FALHAR
  v_ok := false;
  BEGIN
    INSERT INTO product_validation_metadata(organization_id, product_id, chave, tipo, valores)
      VALUES (v_org, v_prod, 'vias_permitidas', 'numero', ARRAY['subcutanea']);
  EXCEPTION WHEN check_violation THEN v_ok := true; END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FALHOU: tipo=numero com valores aceito'; END IF;
  RAISE NOTICE 'E) CHECK tipo x coluna: OK (bloqueado)';

  RAISE NOTICE '==== SMOKE 061: TODOS OS TESTES PASSARAM ====';
END $$;

ROLLBACK;
