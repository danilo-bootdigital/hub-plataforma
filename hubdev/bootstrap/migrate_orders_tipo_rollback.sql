-- =============================================================================
-- ROLLBACK — reverte migrate_orders_tipo.sql
-- Somente para revisão; aplicar via SQL Editor do HUB DEV (pnkgwfgjhijksfmofiot).
-- =============================================================================
-- Remove apenas o que a adaptação adicionou em `orders`. Não toca em nada mais.
-- =============================================================================

drop index if exists idx_orders_org_tipo;
alter table orders drop constraint if exists orders_tipo_chk;
alter table orders drop column if exists tipo;
