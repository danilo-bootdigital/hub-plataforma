-- =============================================================================
-- Sprint EXPAND E4 — Catálogo / Portfólio (DEC-012)
-- [ADITIVO PURO / IDEMPOTENTE]  — somente para revisão; NÃO aplicar ainda.
-- =============================================================================
-- Estratégia: Expand → Migrate → Contract (esta é a fase EXPAND).
-- Regras desta Sprint (não violar):
--   - Apenas ADICIONAR (tabelas/colunas/índices). NÃO remover nada.
--   - NÃO migrar dados. NÃO alterar RLS. NÃO alterar código/funções/triggers.
--   - Colunas novas em products NULLABLE (backfill/NOT NULL ficam para Migrate).
--   - Estruturas legadas INTOCADAS: suppliers, supplier_categories,
--     supplier_freight, freight_carriers, health_hubs.
--   - Autorização Hub↔Portfólio referencia a tabela OFICIAL `hubs` (Expand E1),
--     NUNCA `health_hubs` (DEC-008/DEC-012).
-- Modelo (DEC-012): Indústria → Portfólio → Categoria → Subcategoria → Produto.
--   Portfólio = agrupamento comercial; autorização Hub↔Portfólio = regra separada.
-- Nomenclatura: domínio em PORTUGUÊS; padrão do schema atual
--   (organization_id, criado_em, atualizado_em).
-- Alvo: HUB DEV / Homologação (pnkgwfgjhijksfmofiot) — aplicar via SQL Editor.
-- =============================================================================

-- 1) PORTFÓLIO — agrupamento comercial de produtos da Indústria
create table if not exists portfolios (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome            text not null,
  descricao       text,                                   -- nullable
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  constraint unique_portfolio_nome_por_org unique (organization_id, nome)
);

-- 2) CATEGORIA — classificação de 1º nível, dentro de um Portfólio
create table if not exists categorias (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  portfolio_id    uuid not null references portfolios(id),
  nome            text not null,
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now()
);

-- 3) SUBCATEGORIA — classificação de 2º nível, dentro de uma Categoria
create table if not exists subcategorias (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  categoria_id    uuid not null references categorias(id),
  nome            text not null,
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now()
);

-- 4) AUTORIZAÇÃO Hub ↔ Portfólio — regra operacional separada (N:N)
--    Indústria concede/revoga; Assistente herda do Hub. Usa `hubs` (oficial).
create table if not exists hub_portfolios (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  hub_id          uuid not null references hubs(id),
  portfolio_id    uuid not null references portfolios(id),
  status          text not null default 'ativo',          -- 'ativo' | 'revogado'
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  constraint unique_hub_portfolio unique (hub_id, portfolio_id)
);

-- 5) Vínculo do Produto ao catálogo oficial (NULLABLE; backfill = Migrate)
alter table products add column if not exists portfolio_id    uuid references portfolios(id);
alter table products add column if not exists categoria_id    uuid references categorias(id);
alter table products add column if not exists subcategoria_id uuid references subcategorias(id);

-- 6) Índices de apoio (aditivos, idempotentes)
create index if not exists idx_portfolios_org        on portfolios(organization_id);
create index if not exists idx_categorias_portfolio  on categorias(portfolio_id);
create index if not exists idx_categorias_org        on categorias(organization_id);
create index if not exists idx_subcategorias_categ   on subcategorias(categoria_id);
create index if not exists idx_subcategorias_org     on subcategorias(organization_id);
create index if not exists idx_hubport_hub           on hub_portfolios(hub_id);
create index if not exists idx_hubport_portfolio     on hub_portfolios(portfolio_id);
create index if not exists idx_hubport_org           on hub_portfolios(organization_id);
create index if not exists idx_products_portfolio    on products(portfolio_id)    where portfolio_id is not null;
create index if not exists idx_products_categoria    on products(categoria_id)    where categoria_id is not null;
create index if not exists idx_products_subcategoria on products(subcategoria_id) where subcategoria_id is not null;
