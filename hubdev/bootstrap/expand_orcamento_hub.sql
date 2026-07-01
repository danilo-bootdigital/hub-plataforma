-- =============================================================================
-- Sprint EXPAND — Orçamento do Hub (por Portfólio) — DEC-013/014/016/017
-- [ADITIVO / IDEMPOTENTE] — só ADD COLUMN + índices. NÃO remove nada.
-- =============================================================================
-- O orçamento passa a ser fluxo do HUB, por Portfólio autorizado:
--   - quotes.portfolio_id  → Portfólio do orçamento (1 orçamento = 1 Portfólio)
--   - quotes.hub_id        → Hub que emitiu (escopo/rastreio)
--   - quotes.prazo_entrega, quotes.observacoes_cliente, quotes.transportadora (texto livre)
--   - quotes.supplier_id passa a ser LEGADO/nullable (não é mais exigido).
-- Preço do item vem de product_portfolios (aplicado na server action, não aqui).
-- Sem Contract: nada de NOT NULL/drop. Alvo: HUB DEV (pnkgwfgjhijksfmofiot) — SQL Editor.
-- =============================================================================

alter table quotes add column if not exists portfolio_id       uuid references portfolios(id);
alter table quotes add column if not exists hub_id             uuid references hubs(id);
alter table quotes add column if not exists prazo_entrega      text;
alter table quotes add column if not exists observacoes_cliente text;
alter table quotes add column if not exists transportadora     text;

-- supplier_id vira legado/opcional (idempotente; sem erro se já for nullable).
alter table quotes alter column supplier_id drop not null;

create index if not exists idx_quotes_portfolio on quotes(portfolio_id);
create index if not exists idx_quotes_hub        on quotes(hub_id);
