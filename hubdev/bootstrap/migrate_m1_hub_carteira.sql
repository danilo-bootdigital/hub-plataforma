-- =============================================================================
-- Migrate M1 — Fatia 02: infraestrutura mínima de Hub + Carteira (RLS + constraints)
-- Somente para revisão; aplicar via SQL Editor do HUB DEV (pnkgwfgjhijksfmofiot).
-- =============================================================================
-- CONTEXTO: as tabelas `hubs` e `carteiras`, o vínculo `carteiras.hub_id` e os
--   campos (status, modo, responsavel_id, representante_id) JÁ EXISTEM (Expand E1/E2).
--   Esta fatia NÃO recria nada — apenas adiciona o que falta para suportar o fluxo:
--     (1) RLS mínima (isolamento por Indústria), no MESMO padrão das demais tabelas;
--     (2) constraints de integridade para status (Hub) e modo (Carteira).
-- NÃO migra dados de negócio. NÃO cria telas/CRUD. NÃO altera código.
-- Idempotente (drop policy if exists + alter ... if; updates defensivos em tabelas vazias).
-- =============================================================================

-- 1) RLS — isolamento por Indústria (organization_id = get_organization_id())
--    Mesmo padrão já usado em organizations/profiles/contacts/deals/etc.
alter table hubs      enable row level security;
alter table carteiras enable row level security;

drop policy if exists "p_hubs" on hubs;
create policy "p_hubs" on hubs for all using (organization_id = get_organization_id());

drop policy if exists "p_carteiras" on carteiras;
create policy "p_carteiras" on carteiras for all using (organization_id = get_organization_id());

-- 2) Constraints mínimas — status do Hub e modo da Carteira sempre preenchidos.
--    (tabelas vazias; o UPDATE é defensivo/idempotente para eventual linha de teste)
alter table hubs      alter column status set default 'ATIVO'::hub_status;
update hubs           set status = 'ATIVO'::hub_status   where status is null;
alter table hubs      alter column status set not null;

alter table carteiras alter column modo  set default 'ABERTA'::carteira_modo;
update carteiras      set modo = 'ABERTA'::carteira_modo where modo is null;
alter table carteiras alter column modo  set not null;
