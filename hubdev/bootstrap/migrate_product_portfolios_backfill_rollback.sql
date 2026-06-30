-- =============================================================================
-- ROLLBACK — Backfill do vínculo Produto ↔ Portfólio (DEC-013)
-- Remove APENAS os vínculos que espelham o `products.portfolio_id` atual
-- (linhas geradas pelo backfill). NÃO toca em `products`. Não remove a tabela.
-- Alvo: HUB DEV / Homologação (pnkgwfgjhijksfmofiot) — aplicar via SQL Editor.
-- =============================================================================

delete from product_portfolios pp
using products p
where pp.product_id = p.id
  and pp.portfolio_id = p.portfolio_id;
