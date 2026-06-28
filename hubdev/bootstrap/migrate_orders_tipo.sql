-- =============================================================================
-- Fatia de adaptação (pré-Fatia 17) — discriminador Pré-pedido × Pedido
-- ADITIVO / IDEMPOTENTE. Aplicar via SQL Editor do HUB DEV (pnkgwfgjhijksfmofiot).
-- =============================================================================
-- Adiciona em `orders` APENAS o discriminador de documento:
--   - tipo : 'PRE_PEDIDO' | 'PEDIDO'  (NOT NULL, default 'PEDIDO')
-- Resolve o achado C1 (Pré-pedido e Pedido na mesma tabela sem distinção).
--
-- NÃO altera order_status, NÃO altera quote_status, NÃO altera RLS,
-- NÃO altera fluxo financeiro/estoque/faturamento/ERP, NÃO cria Pedido definitivo.
-- =============================================================================

-- 1) Coluna aditiva. NOT NULL + DEFAULT 'PEDIDO' faz o backfill das linhas
--    existentes automaticamente (toda linha pré-existente vira 'PEDIDO').
alter table orders add column if not exists tipo text not null default 'PEDIDO';

-- 2) Backfill explícito (defensivo) — caso a coluna já existisse como nullable
--    de alguma tentativa anterior.
update orders set tipo = 'PEDIDO' where tipo is null;

-- 3) CHECK restringindo aos dois valores. Guardado para idempotência.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_tipo_chk') then
    alter table orders
      add constraint orders_tipo_chk
      check (tipo in ('PRE_PEDIDO', 'PEDIDO'));
  end if;
end $$;

-- 4) Índice para as listagens (Pré-pedidos por org/tipo; Pedidos legados por org/tipo).
create index if not exists idx_orders_org_tipo on orders (organization_id, tipo);
