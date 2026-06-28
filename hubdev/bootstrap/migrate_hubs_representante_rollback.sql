-- =============================================================================
-- ROLLBACK — reverte migrate_hubs_representante.sql
-- Somente para revisão; aplicar via SQL Editor do HUB DEV (pnkgwfgjhijksfmofiot).
-- Remove apenas o que a migration adicionou em `hubs`.
-- =============================================================================

alter table hubs drop constraint if exists hubs_observacoes_len_chk;
alter table hubs drop column if exists observacoes;
alter table hubs drop column if exists razao_social;
alter table hubs drop column if exists nome_fantasia;
alter table hubs drop column if exists nome_representante;
