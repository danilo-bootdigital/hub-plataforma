-- =============================================================================
-- Migrate M1 — Fatia 02 (FIX): default + NOT NULL de hubs.status e carteiras.modo
-- Complementar a migrate_m1_hub_carteira.sql (cujo trecho de constraints não aplicou).
-- Somente para revisão; aplicar via SQL Editor do HUB DEV (pnkgwfgjhijksfmofiot).
-- =============================================================================
-- Seguro e idempotente: backfill defensivo (tabelas vazias → 0 linhas), depois
-- default e NOT NULL. NÃO recria tabelas/colunas. NÃO altera RLS, código ou regras.
-- Ordem: backfill ANTES do NOT NULL (default só vale para novas linhas).
-- =============================================================================

-- ---- hubs.status -----------------------------------------------------------
-- 1) backfill defensivo
update hubs set status = 'ATIVO'::hub_status where status is null;
-- 2) default
alter table hubs alter column status set default 'ATIVO'::hub_status;
-- 3) NOT NULL
alter table hubs alter column status set not null;

-- ---- carteiras.modo --------------------------------------------------------
-- 4) backfill defensivo
update carteiras set modo = 'ABERTA'::carteira_modo where modo is null;
-- 5) default
alter table carteiras alter column modo set default 'ABERTA'::carteira_modo;
-- 6) NOT NULL
alter table carteiras alter column modo set not null;

-- ---- 7) VALIDAÇÃO FINAL -----------------------------------------------------
-- (a) status/modo: esperado is_nullable = NO e column_default preenchido
select table_name, column_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('hubs','carteiras')
  and column_name in ('status','modo')
order by table_name, column_name;

-- (b) RLS ativa: esperado relrowsecurity = true nas duas tabelas
select relname, relrowsecurity
from pg_class
where relname in ('hubs','carteiras')
order by relname;

-- (c) policies: esperado p_hubs e p_carteiras
select tablename, policyname, cmd
from pg_policies
where tablename in ('hubs','carteiras')
order by tablename;
