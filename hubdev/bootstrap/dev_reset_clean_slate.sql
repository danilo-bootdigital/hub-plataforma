-- ============================================================================
-- dev_reset_clean_slate.sql  —  LIMPEZA (CLEAN SLATE) do HUB DEV
-- ----------------------------------------------------------------------------
-- OBJETIVO: manter APENAS o usuário dev@bootdigital.com.br (admin da Indústria)
--   e zerar hubs, assistentes/proprietários, pedidos e todo o dado transacional
--   vinculado a eles. Ordem derivada do grafo completo de FKs (fecho transitivo
--   de profiles/hubs), validada contra o banco.
--
-- MANTIDOS (dados de referência/seed — apenas as colunas que apontam para os
--   usuários excluídos são anuladas):
--     dev@bootdigital.com.br, contacts (2), carteiras (1, desvinculada do hub),
--     product_validation_metadata, receita_checklists (+itens), lead_distribution_config,
--     e todo o catálogo (products/portfolios/etc., fora do fecho).
--
-- APAGADOS: 10 usuários (6 assistentes + 3 proprietários + 1 admin de QA),
--   3 hubs (cascata funcoes/funcao_permissoes/hub_ia_config), quotes (+itens/
--   eventos/receitas/tokens), deals, activities, conferencias_receita (+pendencias/
--   historico), hub_client_onboarding (+files/events), hub_portfolios, e os 66
--   audit_logs dos usuários excluídos (os do dev permanecem).
--
-- ONDE RODAR: SQL Editor do HUB DEV (pnkgwfgjhijksfmofiot). É a ÚNICA via:
--   quote_events e hub_client_onboarding_events são append-only (trigger recusa
--   DELETE/UPDATE inclusive para service role) e precisam ser desabilitados na tx.
--
-- SEGURANÇA: tudo em UMA transação. Qualquer erro faz ROLLBACK total (nada é
--   perdido) e a mensagem aponta a tabela. IRREVERSÍVEL só após o COMMIT.
-- ============================================================================

BEGIN;

-- 0) Trava de segurança.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE lower(email) = 'dev@bootdigital.com.br') THEN
    RAISE EXCEPTION 'dev@bootdigital.com.br não encontrado — abortando (projeto errado?).';
  END IF;
END $$;

-- 1) Desabilita TODOS os triggers append-only do schema (quote_events,
--    hub_client_onboarding_events, historico_decisoes_conferencia_receita,
--    receita_conferencias, e quaisquer outros do mesmo padrão).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl, t.tgname AS trg
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_proc  p ON p.oid = t.tgfoid
    WHERE NOT t.tgisinternal AND p.proname LIKE '%append_only%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE TRIGGER %I', r.tbl, r.trg);
  END LOOP;
END $$;

-- 2) Anula referências a usuários excluídos NOS DADOS QUE PERMANECEM.
UPDATE carteiras                   SET hub_id = NULL WHERE hub_id IS NOT NULL;
UPDATE carteiras                   SET responsavel_id = NULL
  WHERE responsavel_id IN (SELECT id FROM profiles WHERE lower(email) <> 'dev@bootdigital.com.br');
UPDATE contacts                    SET responsavel_operacional_id = NULL
  WHERE responsavel_operacional_id IN (SELECT id FROM profiles WHERE lower(email) <> 'dev@bootdigital.com.br');
UPDATE product_validation_metadata SET criado_por = NULL
  WHERE criado_por IN (SELECT id FROM profiles WHERE lower(email) <> 'dev@bootdigital.com.br');
UPDATE receita_checklists          SET criado_por = NULL
  WHERE criado_por IN (SELECT id FROM profiles WHERE lower(email) <> 'dev@bootdigital.com.br');
UPDATE lead_distribution_config    SET atualizado_por = NULL
  WHERE atualizado_por IN (SELECT id FROM profiles WHERE lower(email) <> 'dev@bootdigital.com.br');

-- 3) Dados transacionais (filhos/‘folhas’ primeiro; cascatas cuidam do resto).
DELETE FROM activities;                      -- autor_id NOT NULL -> profiles (folha)
DELETE FROM hub_client_onboarding;           -- cascata: files + events (trigger off)
DELETE FROM conferencias_receita;            -- cascata: conferencia_receita_pendencias + historico_decisoes
DELETE FROM quotes;                          -- cascata: quote_items, quote_events, quote_receitas, quote_tokens
DELETE FROM deals;                           -- após activities e quotes (que referenciam deals)
DELETE FROM hub_portfolios;                  -- hub_id NOT NULL -> hubs (RESTRICT)
DELETE FROM audit_logs
  WHERE usuario_id IN (SELECT id FROM profiles WHERE lower(email) <> 'dev@bootdigital.com.br');

-- 4) Usuários: remove todos menos o dev (cascata: profiles, notifications).
DELETE FROM auth.users WHERE lower(coalesce(email, '')) <> 'dev@bootdigital.com.br';

-- 5) Garante que o dev não fique preso a um hub (antes de apagar os hubs).
UPDATE profiles SET hub_id = NULL WHERE hub_id IS NOT NULL;

-- 6) Hubs (cascata: funcoes -> funcao_permissoes; hub_ia_config).
DELETE FROM hubs;

-- 7) Reabilita TODOS os triggers append-only.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl, t.tgname AS trg
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_proc  p ON p.oid = t.tgfoid
    WHERE NOT t.tgisinternal AND p.proname LIKE '%append_only%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE TRIGGER %I', r.tbl, r.trg);
  END LOOP;
END $$;

-- 8) Conferência (esperado: hubs=0, profiles=1, auth_users=1, quotes=0, deals=0,
--    hub_portfolios=0, funcoes=0, carteiras_com_hub=0, contacts=2).
SELECT
  (SELECT count(*) FROM hubs)                              AS hubs,
  (SELECT count(*) FROM profiles)                          AS profiles,
  (SELECT count(*) FROM auth.users)                        AS auth_users,
  (SELECT count(*) FROM quotes)                            AS quotes,
  (SELECT count(*) FROM deals)                             AS deals,
  (SELECT count(*) FROM conferencias_receita)              AS conferencias,
  (SELECT count(*) FROM hub_portfolios)                    AS hub_portfolios,
  (SELECT count(*) FROM funcoes)                           AS funcoes,
  (SELECT count(*) FROM carteiras WHERE hub_id IS NOT NULL) AS carteiras_com_hub,
  (SELECT count(*) FROM contacts)                          AS contacts;

-- Se o SELECT acima estiver como esperado:
COMMIT;
-- Caso contrário, troque por: ROLLBACK;
