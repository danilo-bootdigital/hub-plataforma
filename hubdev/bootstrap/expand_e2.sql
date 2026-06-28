-- =============================================================================
-- Sprint EXPAND E2 — estruturas da DEC-011 (Perfis/Papéis/Operação)
-- [ADITIVO PURO / IDEMPOTENTE]  — somente para revisão; NÃO aplicar ainda.
-- =============================================================================
-- Regras desta Sprint (não violar):
--   - Apenas ADICIONAR (enums/valores/tabelas/colunas/índices). NÃO remover nada.
--   - NÃO migrar dados. NÃO alterar RLS. NÃO alterar código/funções/triggers.
--   - Colunas novas NULLABLE e sem default (backfill/NOT NULL ficam para Migrate).
--   - leads/deals/companies/quotes/orders/tasks: INTOCADAS.
-- Escopo aprovado: Representante (entidade); hub_permissoes (genérica);
--   cliente_responsaveis (distribuição por Cliente). Equipes ficam para E3.
-- Nomenclatura: domínio em PORTUGUÊS (enums de domínio em PT); estruturas novas
--   respeitam o padrão do schema atual (organization_id, criado_em, atualizado_em).
-- Alvo: HUB DEV / Homologação (pnkgwfgjhijksfmofiot) — aplicar via SQL Editor.
-- =============================================================================

-- 1) ENUMS NOVOS (idempotentes) ------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'hub_status') then
    create type hub_status as enum ('ATIVO','INATIVO','SUSPENSO','BLOQUEADO');
  end if;
  if not exists (select 1 from pg_type where typname = 'carteira_modo') then
    create type carteira_modo as enum ('ABERTA','DISTRIBUIDA');
  end if;
end $$;

-- 2) NOVOS VALORES DO ENUM user_role (aditivo; vendedor/atendimento/suporte
--    permanecem como compat até o Contract). Rodar isolado se o editor reclamar.
alter type user_role add value if not exists 'proprietario_hub';
alter type user_role add value if not exists 'assistente';

-- 3) TABELA: representantes (empresa parceira / CNPJ) --------------------------
create table if not exists representantes (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome            text not null,                 -- razão social
  nome_fantasia   text,
  cnpj            text,
  email           text,
  telefone        text,
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

-- 4) TABELA: hub_permissoes (concessões genéricas do Hub ao Assistente) --------
--    capacidade = capacidade concedida (texto controlado; genérico p/ expansão).
create table if not exists hub_permissoes (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  hub_id          uuid not null references hubs(id),
  assistente_id   uuid not null references profiles(id),
  capacidade      text not null,
  concedido_por   uuid references profiles(id),
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

-- 5) TABELA: cliente_responsaveis (distribuição por CLIENTE — âncora) ----------
--    1 responsável ATIVO por (cliente, hub). contacts permanece da Indústria.
create table if not exists cliente_responsaveis (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  hub_id          uuid not null references hubs(id),
  cliente_id      uuid not null references contacts(id),
  assistente_id   uuid not null references profiles(id),
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

-- 6) COLUNAS NOVAS (nullable, sem default — backfill no Migrate) ---------------
alter table hubs      add column if not exists status          hub_status;
alter table hubs      add column if not exists representante_id uuid references representantes(id);
alter table carteiras add column if not exists modo            carteira_modo;
alter table carteiras add column if not exists responsavel_id  uuid references profiles(id);
alter table profiles  add column if not exists hub_id          uuid references hubs(id);

-- 7) ÍNDICES DE APOIO (aditivos, idempotentes) --------------------------------
create index if not exists idx_representantes_org        on representantes(organization_id);
create index if not exists idx_hubs_representante        on hubs(representante_id);
create index if not exists idx_hubs_status               on hubs(status);
create index if not exists idx_carteiras_responsavel     on carteiras(responsavel_id);
create index if not exists idx_carteiras_modo            on carteiras(modo);
create index if not exists idx_profiles_hub              on profiles(hub_id);
create index if not exists idx_hub_permissoes_hub        on hub_permissoes(hub_id);
create index if not exists idx_hub_permissoes_assistente on hub_permissoes(assistente_id);
create unique index if not exists uq_hub_permissoes      on hub_permissoes(hub_id, assistente_id, capacidade);
create index if not exists idx_cliente_resp_hub          on cliente_responsaveis(hub_id);
create index if not exists idx_cliente_resp_cliente      on cliente_responsaveis(cliente_id);
create index if not exists idx_cliente_resp_assistente   on cliente_responsaveis(assistente_id);
create unique index if not exists uq_cliente_resp_ativo  on cliente_responsaveis(cliente_id, hub_id) where ativo;
