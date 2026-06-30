-- =============================================================================
-- ROLLBACK — RPC de Importação para Portfólio (DEC-013 / DEC-014)
-- Remove a função e o índice de apoio. NÃO toca em dados nem em outras tabelas.
-- Alvo: HUB DEV (pnkgwfgjhijksfmofiot) — aplicar via SQL Editor.
-- =============================================================================

drop function if exists
  importar_produtos_portfolio(uuid, jsonb, text, boolean, jsonb, jsonb);

drop index if exists idx_products_org_nome_norm;
