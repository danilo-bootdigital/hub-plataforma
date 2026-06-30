-- =============================================================================
-- ROLLBACK — Vínculo Produto ↔ Portfólio N:N (expand_product_portfolios.sql)
-- Remove APENAS a tabela criada pela migration de mesmo nome (e seus índices/RLS,
-- que caem junto com a tabela). NÃO toca em products, portfolios, categorias,
-- subcategorias nem hub_portfolios.
-- Alvo: HUB DEV / Homologação (pnkgwfgjhijksfmofiot) — aplicar via SQL Editor.
-- =============================================================================

drop table if exists product_portfolios;
