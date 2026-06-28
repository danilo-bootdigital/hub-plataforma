-- =============================================================================
-- Migrate M1 — Fatia 02: ROLLBACK (reverte migrate_m1_hub_carteira.sql)
-- Somente para revisão; aplicar via SQL Editor do HUB DEV (pnkgwfgjhijksfmofiot).
-- =============================================================================
-- Reverte RLS e constraints adicionados na Fatia 02. NÃO remove tabelas/colunas
-- (estas pertencem à Expand E1/E2 e permanecem).
-- =============================================================================

-- 2) Reverter constraints de status/modo
alter table carteiras alter column modo  drop not null;
alter table carteiras alter column modo  drop default;
alter table hubs      alter column status drop not null;
alter table hubs      alter column status drop default;

-- 1) Reverter RLS
drop policy if exists "p_carteiras" on carteiras;
drop policy if exists "p_hubs" on hubs;
alter table carteiras disable row level security;
alter table hubs      disable row level security;
