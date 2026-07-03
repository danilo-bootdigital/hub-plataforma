-- SMOKE 060 — Conferência de Receita STANDALONE (DEC-019 emenda MVP-5′)
-- Arquitetura simplificada (sem Event Sourcing).
-- Rodar no SQL Editor do HUB DEV (pnkgwfgjhijksfmofiot) DEPOIS de aplicar a 060.
-- Roda em transação e faz ROLLBACK ao final: NÃO deixa dados.
-- No SQL Editor você é superuser → RLS é BYPASSADA aqui. Este smoke valida
-- estrutura + trigger append-only do histórico + constraints + CHECKs. O teste de
-- RLS cross-org em runtime é feito pela Aplicação Web (sessão autenticada).

BEGIN;

DO $$
DECLARE
  v_org uuid; v_prod uuid; v_user uuid; v_conf uuid; v_ok boolean; v_txt text;
  t text; r record;
BEGIN
  -- A) Catálogo: tabelas + RLS
  FOREACH t IN ARRAY ARRAY['conferencias_receita','conferencia_receita_pendencias','historico_decisoes_conferencia_receita']
  LOOP
    IF to_regclass('public.'||t) IS NULL THEN RAISE EXCEPTION 'FALTA tabela %', t; END IF;
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = ('public.'||t)::regclass) THEN
      RAISE EXCEPTION 'RLS desabilitada em %', t;
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_historico_decisoes_append_only') THEN RAISE EXCEPTION 'FALTA trigger append-only do historico'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='historico_decisoes_conferencia_receita' AND policyname='historico_decisoes insert') THEN RAISE EXCEPTION 'FALTA policy insert historico'; END IF;
  RAISE NOTICE 'A) catalogo/RLS/trigger/policies: OK';

  -- B) CHECK de checklist estendido aceita limite_maximo / limite_maximo_excedido
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_checklist_item_tipo_regra' AND pg_get_constraintdef(oid) ILIKE '%limite_maximo%') THEN
    RAISE EXCEPTION 'FALTA limite_maximo no CHECK tipo_regra'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_checklist_item_motivo' AND pg_get_constraintdef(oid) ILIKE '%limite_maximo_excedido%') THEN
    RAISE EXCEPTION 'FALTA limite_maximo_excedido no CHECK motivo'; END IF;
  RAISE NOTICE 'B) CHECK checklist estendido: OK';

  v_org  := (SELECT id FROM organizations LIMIT 1);
  v_prod := (SELECT id FROM products LIMIT 1);
  v_user := (SELECT id FROM profiles WHERE organization_id = v_org LIMIT 1);
  IF v_org IS NULL OR v_prod IS NULL THEN
    RAISE NOTICE 'sem organizations/products — testes de dados pulados'; RETURN;
  END IF;

  -- C) Criar conferência + defaults
  INSERT INTO conferencias_receita(organization_id, product_id, criado_por)
  VALUES (v_org, v_prod, v_user) RETURNING id INTO v_conf;
  SELECT status_atual, status_processamento INTO r FROM conferencias_receita WHERE id=v_conf;
  IF r.status_atual <> 'criada' OR r.status_processamento <> 'pendente' THEN
    RAISE EXCEPTION 'FALHOU: defaults (% / %)', r.status_atual, r.status_processamento;
  END IF;
  RAISE NOTICE 'C) criada com defaults: OK';

  -- D) Pré-análise escrita direto pela aplicação
  UPDATE conferencias_receita
     SET status_processamento='concluido', status_atual='aguardando_decisao',
         resultado_analise='pendencias_encontradas', score=80, confianca_extracao=0.900,
         provedor_ia='claude', modelo_ia='claude-opus-4-8',
         storage_path='conferencia/'||v_org||'/'||v_conf||'/receita.pdf'
   WHERE id=v_conf;
  SELECT status_atual, status_processamento, resultado_analise, score, storage_path INTO r FROM conferencias_receita WHERE id=v_conf;
  IF r.status_processamento<>'concluido' OR r.resultado_analise<>'pendencias_encontradas' OR r.score<>80 OR r.storage_path NOT LIKE 'conferencia/%' THEN
    RAISE EXCEPTION 'FALHOU: pre-analise (% / % / %)', r.status_processamento, r.resultado_analise, r.score;
  END IF;
  RAISE NOTICE 'D) pre-analise (motor/score/storage): OK';

  -- E) Pendência detalhada (motor)
  INSERT INTO conferencia_receita_pendencias(conferencia_id, origem, chave, motivo, tipo, severidade, mensagem, esperado, encontrado)
  VALUES (v_conf, 'regra', 'quantidade', 'limite_maximo_excedido', 'formato_invalido', 'critico',
          'Quantidade acima do limite máximo por receita (5 > 3)', '<= 3', '5');
  IF (SELECT count(*) FROM conferencia_receita_pendencias WHERE conferencia_id=v_conf) <> 1 THEN
    RAISE EXCEPTION 'FALHOU: pendencia nao inserida'; END IF;
  RAISE NOTICE 'E) pendencia detalhada: OK';

  -- F) resultado_analise NÃO aceita divergente_do_orcamento (documental-only)
  v_ok := false;
  BEGIN
    UPDATE conferencias_receita SET resultado_analise='divergente_do_orcamento' WHERE id=v_conf;
  EXCEPTION WHEN check_violation THEN v_ok := true; END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FALHOU: divergente_do_orcamento aceito (deveria ser documental-only)'; END IF;
  RAISE NOTICE 'F) documental-only (sem divergente_do_orcamento): OK';

  -- G) Status de decisão SEM autor humano deve FALHAR (chk_conferencia_decisao_humana)
  v_ok := false;
  BEGIN
    UPDATE conferencias_receita SET status_atual='aprovada', decidido_por=NULL WHERE id=v_conf;
  EXCEPTION WHEN check_violation THEN v_ok := true; END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FALHOU: decisao sem autor humano permitida'; END IF;
  RAISE NOTICE 'G) status de decisao exige autor humano: OK (bloqueado)';

  -- H) Histórico exige usuário (NOT NULL) — a IA não decide
  v_ok := false;
  BEGIN
    INSERT INTO historico_decisoes_conferencia_receita(conferencia_id, decisao, decidido_por)
    VALUES (v_conf, 'aprovada', NULL);
  EXCEPTION WHEN not_null_violation THEN v_ok := true; END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FALHOU: decisao no historico sem usuario permitida'; END IF;
  RAISE NOTICE 'H) historico exige usuario: OK (bloqueado)';

  IF v_user IS NOT NULL THEN
    -- I) Decisão válida: snapshot na principal + registro imutável no histórico
    UPDATE conferencias_receita
       SET status_atual='aprovada', decidido_por=v_user, decidido_em=now(), observacao_decisao='conferido'
     WHERE id=v_conf;
    INSERT INTO historico_decisoes_conferencia_receita(conferencia_id, decisao, observacao, decidido_por)
    VALUES (v_conf, 'aprovada', 'conferido', v_user);
    SELECT status_atual, decidido_por INTO r FROM conferencias_receita WHERE id=v_conf;
    IF r.status_atual<>'aprovada' OR r.decidido_por<>v_user THEN RAISE EXCEPTION 'FALHOU: snapshot decisao'; END IF;
    IF (SELECT count(*) FROM historico_decisoes_conferencia_receita WHERE conferencia_id=v_conf)<>1 THEN
      RAISE EXCEPTION 'FALHOU: historico nao registrado'; END IF;
    RAISE NOTICE 'I) decisao humana (snapshot + historico): OK';

    -- J) Append-only no histórico: UPDATE e DELETE devem FALHAR
    v_ok := false;
    BEGIN UPDATE historico_decisoes_conferencia_receita SET decisao='reprovada' WHERE conferencia_id=v_conf; EXCEPTION WHEN others THEN v_ok := true; END;
    IF NOT v_ok THEN RAISE EXCEPTION 'FALHOU: UPDATE no historico permitido'; END IF;
    v_ok := false;
    BEGIN DELETE FROM historico_decisoes_conferencia_receita WHERE conferencia_id=v_conf; EXCEPTION WHEN others THEN v_ok := true; END;
    IF NOT v_ok THEN RAISE EXCEPTION 'FALHOU: DELETE no historico permitido'; END IF;
    RAISE NOTICE 'J) historico append-only: OK (update/delete bloqueados)';
  ELSE
    RAISE NOTICE 'I/J) sem profiles na org — testes de decisao/append-only pulados';
  END IF;

  -- K) CHECK de score (>100) rejeitado
  v_ok := false;
  BEGIN UPDATE conferencias_receita SET score=101 WHERE id=v_conf; EXCEPTION WHEN check_violation THEN v_ok := true; END;
  IF NOT v_ok THEN RAISE EXCEPTION 'FALHOU: score>100 aceito'; END IF;
  RAISE NOTICE 'K) CHECK score<=100: OK';

  RAISE NOTICE '==== SMOKE 060: TODOS OS TESTES PASSARAM ====';
END $$;

ROLLBACK;  -- descarta todos os dados de teste (inclui historico append-only)
