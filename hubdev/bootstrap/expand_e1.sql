-- =============================================================================
-- Sprint EXPAND E1 — núcleo Hub + Carteiras   [ADITIVO PURO / IDEMPOTENTE]
-- =============================================================================
-- Estratégia: Expand → Migrate → Contract (esta é a fase EXPAND).
-- Regras desta Sprint (não violar):
--   - Apenas ADICIONAR estruturas/colunas. NÃO remover tabela/coluna.
--   - NÃO migrar dados. NÃO alterar código. NÃO alterar RLS existente.
--   - NÃO substituir entidades legadas.
--   - Única tabela existente alterada: contacts (+ carteira_id nullable).
--   - leads/deals/companies/quotes/orders/tasks: INTOCADAS.
--   - Lead NÃO faz parte do Hub Plataforma; `leads` é compat temporária,
--     removida apenas na fase Contract (após "Solicitação de Novo Cliente").
-- Alvo: HUB DEV / Homologação (Supabase cloud, projeto pnkgwfgjhijksfmofiot).
-- Aplicar via SQL Editor do HUB DEV. NÃO é a Baseline 001.
-- =============================================================================

-- 1) Estrutura de HUB (NOVA — não confundir com a legada health_hubs, intocada)
--    A Carteira pertence à Indústria (organization) e apenas autoriza um Hub.
create table if not exists hubs (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome            text not null,
  codigo          text,                                  -- nullable
  descricao       text,                                  -- nullable
  cnpj            text,                                  -- nullable
  email           text,                                  -- nullable
  telefone        text,                                  -- nullable
  logo_url        text,                                  -- nullable
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

-- 2) Estrutura de CARTEIRAS + relacionamento Carteira -> Hub
create table if not exists carteiras (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  hub_id          uuid references hubs(id),              -- relacionamento Carteira -> Hub (nullable)
  nome            text not null,
  descricao       text,                                  -- nullable
  ordem           integer not null default 0,
  observacoes     text,                                  -- nullable
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

-- 3) Única alteração em tabela existente: contacts.carteira_id (nullable, sem migração)
alter table contacts add column if not exists carteira_id uuid references carteiras(id);

-- 4) Índices de apoio (aditivos, idempotentes)
create index if not exists idx_hubs_org           on hubs(organization_id);
create index if not exists idx_carteiras_hub      on carteiras(hub_id);
create index if not exists idx_carteiras_org      on carteiras(organization_id);
create index if not exists idx_contacts_carteira  on contacts(carteira_id);
