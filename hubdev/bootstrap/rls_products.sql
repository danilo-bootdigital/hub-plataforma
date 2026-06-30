-- =============================================================================
-- RLS de products por Portfólio autorizado (DEC-012 — Frente 4-final)
-- =============================================================================
-- Substitui a policy legada `p_products` (FOR ALL por organização) por policies
-- que distinguem Indústria × Hub PELO CARGO (get_user_role), não por hub_id —
-- pois existe assistente sem hub vinculado.
--   • Hub (proprietario_hub/assistente): SELECT apenas de produtos cujo
--     portfolio_id está autorizado ao seu Hub (hub_portfolios.status='ativo');
--     assistente sem hub vê nada; Hub NÃO escreve produtos.
--   • Indústria e papéis legados (admin/gestor/financeiro/vendedor/atendimento/
--     suporte): veem e escrevem tudo (comportamento legado preservado).
-- RLS já está habilitado em products. Idempotente. Aplicar via SQL Editor no
-- HUB DEV (pnkgwfgjhijksfmofiot). NÃO altera código nem dados.
-- =============================================================================

drop policy if exists "p_products" on products;
drop policy if exists products_sel on products;
drop policy if exists products_ins on products;
drop policy if exists products_upd on products;
drop policy if exists products_del on products;

create policy products_sel on products for select using (
  organization_id = get_organization_id()
  and (
    get_user_role() not in ('proprietario_hub','assistente')
    or (
      portfolio_id is not null
      and exists (
        select 1 from hub_portfolios hp
        where hp.portfolio_id = products.portfolio_id
          and hp.hub_id = get_hub_id()
          and hp.status = 'ativo'
      )
    )
  )
);

create policy products_ins on products for insert
  with check (organization_id = get_organization_id()
              and get_user_role() not in ('proprietario_hub','assistente'));

create policy products_upd on products for update
  using (organization_id = get_organization_id()
         and get_user_role() not in ('proprietario_hub','assistente'))
  with check (organization_id = get_organization_id()
              and get_user_role() not in ('proprietario_hub','assistente'));

create policy products_del on products for delete
  using (organization_id = get_organization_id()
         and get_user_role() not in ('proprietario_hub','assistente'));
