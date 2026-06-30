-- =============================================================================
-- ROLLBACK — RLS do Catálogo (reverte rls_catalogo.sql)
-- =============================================================================
-- Remove as policies e DESLIGA o RLS das 4 tabelas novas, voltando ao estado
-- da Expand E4 (sem RLS). Equivale à "opção A". A função get_hub_id() é mantida
-- (inócua); descomente a última linha para removê-la também.
-- Alvo: HUB DEV (pnkgwfgjhijksfmofiot) — aplicar via SQL Editor.
-- =============================================================================

drop policy if exists portfolios_sel on portfolios;
drop policy if exists portfolios_ins on portfolios;
drop policy if exists portfolios_upd on portfolios;
drop policy if exists portfolios_del on portfolios;
alter table portfolios disable row level security;

drop policy if exists categorias_sel on categorias;
drop policy if exists categorias_ins on categorias;
drop policy if exists categorias_upd on categorias;
drop policy if exists categorias_del on categorias;
alter table categorias disable row level security;

drop policy if exists subcategorias_sel on subcategorias;
drop policy if exists subcategorias_ins on subcategorias;
drop policy if exists subcategorias_upd on subcategorias;
drop policy if exists subcategorias_del on subcategorias;
alter table subcategorias disable row level security;

drop policy if exists hubport_sel on hub_portfolios;
drop policy if exists hubport_ins on hub_portfolios;
drop policy if exists hubport_upd on hub_portfolios;
drop policy if exists hubport_del on hub_portfolios;
alter table hub_portfolios disable row level security;

-- drop function if exists get_hub_id();
