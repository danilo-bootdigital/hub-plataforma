-- =============================================================================
-- Sprint EXPAND — Vínculo Produto ↔ Portfólio N:N (DEC-013)
-- [ADITIVO PURO / IDEMPOTENTE] — fase EXPAND. NÃO aplicar junto de outras mudanças.
-- =============================================================================
-- Estratégia: Expand → Migrate → Contract (esta é a fase EXPAND).
-- Regras desta Sprint (não violar):
--   - Apenas ADICIONAR (tabela/índices). NÃO remover, NÃO renomear, NÃO migrar dados.
--   - NÃO altera a RLS de `products`, nem `portfolios`/`categorias`/`subcategorias`,
--     nem `hub_portfolios`, nem código/funções/triggers.
--   - NÃO toca `products.portfolio_id`/`categoria_id`/`subcategoria_id` (saem só no Contract).
--
-- Modelo (DEC-013): Produto é ÚNICO na Indústria e pode compor VÁRIOS Portfólios.
--   A relação Produto↔Portfólio é N:N, materializada aqui em `product_portfolios`
--   com unicidade (product_id, portfolio_id) — um Portfólio NÃO duplica o Produto.
--   Classificação (categoria/subcategoria) e PREÇO comercial vivem NO VÍNCULO;
--   durante a transição o preço efetivo = COALESCE(vínculo, products.preco_unitario).
--
-- Segurança: a tabela nasce com RLS HABILITADA e SEM policies → bloqueada por
--   padrão para os papéis da aplicação (acesso refinado por Hub vem na Fatia 5).
--   Backfill (Migrate) roda via SQL Editor/service_role, que ignora RLS.
--
-- Alvo: HUB DEV / Homologação (pnkgwfgjhijksfmofiot) — aplicar via SQL Editor.
-- =============================================================================

create table if not exists product_portfolios (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  product_id      uuid not null references products(id)    on delete cascade,
  portfolio_id    uuid not null references portfolios(id)  on delete cascade,
  categoria_id    uuid references categorias(id),          -- classificação DENTRO deste portfólio (opcional)
  subcategoria_id uuid references subcategorias(id),       -- opcional
  preco_unitario  numeric(12,2),                           -- preço comercial neste portfólio (nullable; fallback no produto)
  valor_caixa     numeric(12,2),                           -- opcional
  ativo           boolean not null default true,           -- produto pode sair de um portfólio sem sair de outro
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  constraint unique_produto_portfolio unique (product_id, portfolio_id)
);

-- Índices de apoio (aditivos, idempotentes)
create index if not exists idx_prodport_org          on product_portfolios(organization_id);
create index if not exists idx_prodport_product      on product_portfolios(product_id);
create index if not exists idx_prodport_portfolio    on product_portfolios(portfolio_id);
create index if not exists idx_prodport_portfolio_ativo
  on product_portfolios(portfolio_id) where ativo = true;

-- RLS habilitada SEM policies (bloqueia papéis da aplicação por padrão).
-- As policies (Indústria gerencia; Hub vê via Portfólio autorizado) entram na Fatia 5.
alter table product_portfolios enable row level security;
