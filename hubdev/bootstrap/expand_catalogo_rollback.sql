-- =============================================================================
-- Sprint EXPAND E4 — Catálogo / Portfólio — ROLLBACK
-- [reverte expand_catalogo.sql, ordem inversa]
-- =============================================================================
-- Seguro porque a Expand E4 é aditiva e NÃO migra dados.
-- ATENÇÃO: descarta quaisquer dados de TESTE inseridos em
--          portfolios/categorias/subcategorias/hub_portfolios e zera os
--          vínculos preenchidos em products.(portfolio_id/categoria_id/subcategoria_id).
--          Não há dados de produção neste fluxo (HUB DEV / Homologação).
-- Alvo: HUB DEV / Homologação (pnkgwfgjhijksfmofiot) — aplicar via SQL Editor.
-- =============================================================================

-- 1) Remover colunas adicionadas em products (índices caem junto com a coluna)
alter table products drop column if exists subcategoria_id;
alter table products drop column if exists categoria_id;
alter table products drop column if exists portfolio_id;

-- 2) Remover tabelas novas (respeitando dependências de FK)
drop table if exists hub_portfolios;
drop table if exists subcategorias;
drop table if exists categorias;
drop table if exists portfolios;
