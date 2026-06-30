-- =============================================================================
-- RLS do Catálogo (DEC-012 — Frente 4 / antecipada)
-- Habilita RLS + policies nas tabelas novas: portfolios, categorias,
-- subcategorias, hub_portfolios.
-- =============================================================================
-- Regra de acesso:
--   • Indústria (admin/gestor/financeiro): vê tudo da sua organização.
--   • Hub (proprietário/assistente): vê apenas Portfólios AUTORIZADOS ao seu Hub
--     (hub_portfolios.status='ativo'); Assistente herda via profiles.hub_id.
--   • Escrita (insert/update/delete): exclusiva da Indústria (admin/gestor).
-- Idempotente (drop policy if exists). Alvo: HUB DEV (pnkgwfgjhijksfmofiot),
-- aplicar via SQL Editor. NÃO altera código nem dados.
-- =============================================================================

-- Helper: hub do usuário logado (mesmo padrão de get_organization_id/get_user_role).
create or replace function get_hub_id() returns uuid
  language sql stable security definer set search_path = public as $$
  select hub_id from profiles where id = auth.uid() $$;

-- ── PORTFOLIOS ───────────────────────────────────────────────────────────
alter table portfolios enable row level security;

drop policy if exists portfolios_sel on portfolios;
create policy portfolios_sel on portfolios for select using (
  organization_id = get_organization_id()
  and (
    get_user_role() in ('admin','gestor','financeiro')
    or exists (
      select 1 from hub_portfolios hp
      where hp.portfolio_id = portfolios.id
        and hp.hub_id = get_hub_id()
        and hp.status = 'ativo'
    )
  )
);

drop policy if exists portfolios_ins on portfolios;
create policy portfolios_ins on portfolios for insert
  with check (organization_id = get_organization_id() and get_user_role() in ('admin','gestor'));

drop policy if exists portfolios_upd on portfolios;
create policy portfolios_upd on portfolios for update
  using (organization_id = get_organization_id() and get_user_role() in ('admin','gestor'))
  with check (organization_id = get_organization_id() and get_user_role() in ('admin','gestor'));

drop policy if exists portfolios_del on portfolios;
create policy portfolios_del on portfolios for delete
  using (organization_id = get_organization_id() and get_user_role() in ('admin','gestor'));

-- ── CATEGORIAS (filhas de Portfólio) ─────────────────────────────────────
alter table categorias enable row level security;

drop policy if exists categorias_sel on categorias;
create policy categorias_sel on categorias for select using (
  organization_id = get_organization_id()
  and (
    get_user_role() in ('admin','gestor','financeiro')
    or exists (
      select 1 from hub_portfolios hp
      where hp.portfolio_id = categorias.portfolio_id
        and hp.hub_id = get_hub_id()
        and hp.status = 'ativo'
    )
  )
);

drop policy if exists categorias_ins on categorias;
create policy categorias_ins on categorias for insert
  with check (organization_id = get_organization_id() and get_user_role() in ('admin','gestor'));

drop policy if exists categorias_upd on categorias;
create policy categorias_upd on categorias for update
  using (organization_id = get_organization_id() and get_user_role() in ('admin','gestor'))
  with check (organization_id = get_organization_id() and get_user_role() in ('admin','gestor'));

drop policy if exists categorias_del on categorias;
create policy categorias_del on categorias for delete
  using (organization_id = get_organization_id() and get_user_role() in ('admin','gestor'));

-- ── SUBCATEGORIAS (filhas de Categoria) ──────────────────────────────────
alter table subcategorias enable row level security;

drop policy if exists subcategorias_sel on subcategorias;
create policy subcategorias_sel on subcategorias for select using (
  organization_id = get_organization_id()
  and (
    get_user_role() in ('admin','gestor','financeiro')
    or exists (
      select 1 from categorias c
      join hub_portfolios hp on hp.portfolio_id = c.portfolio_id
      where c.id = subcategorias.categoria_id
        and hp.hub_id = get_hub_id()
        and hp.status = 'ativo'
    )
  )
);

drop policy if exists subcategorias_ins on subcategorias;
create policy subcategorias_ins on subcategorias for insert
  with check (organization_id = get_organization_id() and get_user_role() in ('admin','gestor'));

drop policy if exists subcategorias_upd on subcategorias;
create policy subcategorias_upd on subcategorias for update
  using (organization_id = get_organization_id() and get_user_role() in ('admin','gestor'))
  with check (organization_id = get_organization_id() and get_user_role() in ('admin','gestor'));

drop policy if exists subcategorias_del on subcategorias;
create policy subcategorias_del on subcategorias for delete
  using (organization_id = get_organization_id() and get_user_role() in ('admin','gestor'));

-- ── HUB_PORTFOLIOS (autorização) ─────────────────────────────────────────
alter table hub_portfolios enable row level security;

drop policy if exists hubport_sel on hub_portfolios;
create policy hubport_sel on hub_portfolios for select using (
  organization_id = get_organization_id()
  and (
    get_user_role() in ('admin','gestor','financeiro')
    or hub_id = get_hub_id()
  )
);

drop policy if exists hubport_ins on hub_portfolios;
create policy hubport_ins on hub_portfolios for insert
  with check (organization_id = get_organization_id() and get_user_role() in ('admin','gestor'));

drop policy if exists hubport_upd on hub_portfolios;
create policy hubport_upd on hub_portfolios for update
  using (organization_id = get_organization_id() and get_user_role() in ('admin','gestor'))
  with check (organization_id = get_organization_id() and get_user_role() in ('admin','gestor'));

drop policy if exists hubport_del on hub_portfolios;
create policy hubport_del on hub_portfolios for delete
  using (organization_id = get_organization_id() and get_user_role() in ('admin','gestor'));
