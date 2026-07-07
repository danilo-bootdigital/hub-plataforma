-- Migration 075: Mensageria — restringe EXECUTE das RPCs ao service_role (DEC-023 · Fatia 0)
-- ============================================================================
-- CORRETIVA e idempotente. No Supabase, novas funções em public recebem EXECUTE para
-- anon/authenticated/service_role via ALTER DEFAULT PRIVILEGES — logo, o `REVOKE ... FROM
-- PUBLIC` das migrations 073/074 NÃO removeu os grants DIRETOS de anon/authenticated.
--
-- As RPCs communication_inbound_claim e communication_persistir_mensagem são SECURITY
-- DEFINER (bypassam RLS) e só o service_role (poller) pode executá-las. Esta migration
-- revoga anon/authenticated/PUBLIC e concede apenas ao service_role.
--
-- Guardas por existência de role → funciona no Supabase (roles existem) e no Postgres
-- efêmero de teste (roles ausentes → REVOKE/GRANT desses são pulados).
-- Aplicar no HUB DEV (pnkgwfgjhijksfmofiot) via SQL Editor, DEPOIS de 073 e 074.
-- ============================================================================

DO $$
DECLARE
  fns text[] := ARRAY[
    'communication_inbound_claim(int,int,int)',
    'communication_persistir_mensagem(text,text,text,text,text,text,text,text,timestamptz)'
  ];
  fn text;
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    END IF;
  END LOOP;
END $$;
