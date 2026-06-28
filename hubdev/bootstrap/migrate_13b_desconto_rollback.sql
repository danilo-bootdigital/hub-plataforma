-- =============================================================================
-- Fatia 13B — ROLLBACK (reverte migrate_13b_desconto.sql)
-- Somente para revisão; aplicar via SQL Editor do HUB DEV (pnkgwfgjhijksfmofiot).
-- =============================================================================
-- Remove apenas o que a 13B adicionou em `quotes`. Não toca em campos existentes.
-- =============================================================================

alter table quotes drop constraint if exists quotes_desconto_tipo_chk;
alter table quotes drop column if exists desconto_valor;
alter table quotes drop column if exists desconto_tipo;
