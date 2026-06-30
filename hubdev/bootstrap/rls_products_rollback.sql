-- =============================================================================
-- ROLLBACK — RLS de products (reverte rls_products.sql)
-- Remove as policies novas e RECRIA a policy legada original `p_products`
-- (FOR ALL por organização). Volta products ao comportamento anterior.
-- Alvo: HUB DEV (pnkgwfgjhijksfmofiot) — aplicar via SQL Editor.
-- =============================================================================

drop policy if exists products_sel on products;
drop policy if exists products_ins on products;
drop policy if exists products_upd on products;
drop policy if exists products_del on products;

create policy "p_products" on products
  for all using (organization_id = get_organization_id());
