-- SMOKE 057 — Conferência Operacional de Receita (DEC-019, Sprint 1)
-- Rodar no SQL Editor do HUB DEV (pnkgwfgjhijksfmofiot) DEPOIS de aplicar a 057.
-- Roda em transação e faz ROLLBACK ao final: NÃO deixa dados.
-- Observação: no SQL Editor você é superuser → RLS é BYPASSADA aqui. Este smoke valida
-- estrutura + constraints + trigger append-only + CHECKs. O teste de RLS cross-org em
-- runtime é feito pela Aplicação Web (sessão autenticada), não neste script.

BEGIN;

DO $$
DECLARE
  v_org uuid; v_quote uuid; v_qr uuid; v_conf uuid; v_user uuid; v_ok boolean;
  t text;
BEGIN
  -- A) Catálogo: tabelas
  FOREACH t IN ARRAY ARRAY['receita_checklists','receita_checklist_itens','receita_modelos','receita_conferencias','receita_conferencia_pendencias']
  LOOP
    IF to_regclass('public.'||t) IS NULL THEN RAISE EXCEPTION 'FALTA tabela %', t; END IF;
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = ('public.'||t)::regclass) THEN
      RAISE EXCEPTION 'RLS desabilitada em %', t;
    END IF;
  END LOOP;

  -- Colunas novas em quote_receitas
  FOREACH t IN ARRAY ARRAY['checklist_id','status_analise_ia','score_ultima_conferencia']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name='quote_receitas' AND column_name=t) THEN
      RAISE EXCEPTION 'FALTA coluna quote_receitas.%', t;
    END IF;
  END LOOP;

  -- Constraints e trigger
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_receita_aprovacao_humana') THEN RAISE EXCEPTION 'FALTA constraint aprovacao'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_quote_receitas_status_fluxo') THEN RAISE EXCEPTION 'FALTA check status_fluxo'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_receita_conferencias_append_only') THEN RAISE EXCEPTION 'FALTA trigger append-only'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='receita_conferencias' AND policyname='receita_conferencias insert') THEN RAISE EXCEPTION 'FALTA policy insert conferencias'; END IF;
  RAISE NOTICE 'A) Catalogo/RLS/constraints/trigger/policies: OK';

  v_org  := (SELECT id FROM organizations LIMIT 1);
  IF v_org IS NULL THEN RAISE NOTICE 'sem organizations — testes de dados pulados'; RETURN; END IF;
  v_user := (SELECT id FROM profiles WHERE organization_id = v_org LIMIT 1);

  -- B) Coerência de escopo: escopo=portfolio com produto_id deve FALHAR
  v_ok := false;
  BEGIN
    INSERT INTO receita_checklists(organization_id,nome,escopo,portfolio_id,produto_id)
    VALUES (v_org,'SMOKE','portfolio', NULL, (SELECT id FROM products LIMIT 1));
  EXCEPTION WHEN check_violation THEN v_ok := true; END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FALHOU: chk_checklist_escopo_alvo nao bloqueou'; END IF;
  RAISE NOTICE 'B) coerencia de escopo: OK (bloqueado)';

  v_quote := (SELECT id FROM quotes WHERE organization_id = v_org LIMIT 1);
  IF v_quote IS NULL THEN RAISE NOTICE 'sem quotes — testes C/D/E pulados'; RETURN; END IF;

  -- C) status_fluxo novo valor aceito + constraint de aprovacao humana
  INSERT INTO quote_receitas(organization_id,quote_id,status_fluxo)
  VALUES (v_org, v_quote, 'em_conferencia') RETURNING id INTO v_qr;
  RAISE NOTICE 'C1) status_fluxo=em_conferencia aceito';

  v_ok := false;
  BEGIN
    UPDATE quote_receitas SET status_fluxo='aprovada_operacionalmente', validada_por=NULL WHERE id=v_qr;
  EXCEPTION WHEN check_violation THEN v_ok := true; END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FALHOU: aprovacao sem validada_por permitida'; END IF;
  RAISE NOTICE 'C2) aprovacao sem usuario: OK (bloqueado)';

  IF v_user IS NOT NULL THEN
    UPDATE quote_receitas SET status_fluxo='aprovada_operacionalmente', validada_por=v_user WHERE id=v_qr;
    RAISE NOTICE 'C3) aprovacao com validada_por: OK (permitido)';
  END IF;

  -- D) append-only: UPDATE e DELETE em receita_conferencias devem FALHAR
  INSERT INTO receita_conferencias(organization_id,quote_receita_id,quote_id,status_analise,score)
  VALUES (v_org, v_qr, v_quote, 'sem_pendencias_aparentes', 100) RETURNING id INTO v_conf;

  v_ok := false;
  BEGIN UPDATE receita_conferencias SET score=50 WHERE id=v_conf; EXCEPTION WHEN others THEN v_ok := true; END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FALHOU: UPDATE em conferencia permitido'; END IF;

  v_ok := false;
  BEGIN DELETE FROM receita_conferencias WHERE id=v_conf; EXCEPTION WHEN others THEN v_ok := true; END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FALHOU: DELETE em conferencia permitido'; END IF;
  RAISE NOTICE 'D) append-only: OK (update/delete bloqueados)';

  -- E) CHECK de score e status_analise
  v_ok := false;
  BEGIN
    INSERT INTO receita_conferencias(organization_id,quote_receita_id,quote_id,score)
    VALUES (v_org, v_qr, v_quote, 101);
  EXCEPTION WHEN check_violation THEN v_ok := true; END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FALHOU: score>100 permitido'; END IF;

  v_ok := false;
  BEGIN
    INSERT INTO receita_conferencias(organization_id,quote_receita_id,quote_id,status_analise)
    VALUES (v_org, v_qr, v_quote, 'validada_pela_ia');
  EXCEPTION WHEN check_violation THEN v_ok := true; END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FALHOU: status_analise invalido permitido'; END IF;
  RAISE NOTICE 'E) CHECK score/status_analise: OK';

  RAISE NOTICE '==== SMOKE 057: TODOS OS TESTES PASSARAM ====';
END $$;

ROLLBACK;  -- descarta todos os dados de teste (inclui a conferencia append-only)
