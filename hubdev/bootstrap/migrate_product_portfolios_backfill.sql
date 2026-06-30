-- =============================================================================
-- Sprint MIGRATE — Backfill do vínculo Produto ↔ Portfólio (DEC-013)
-- [IDEMPOTENTE] — espelha a verdade atual; NÃO altera comportamento da aplicação.
-- =============================================================================
-- Contexto: a aplicação ainda lê `products.portfolio_id`. Este backfill apenas
--   POPULA `product_portfolios` a partir dos Produtos que já têm `portfolio_id`,
--   copiando classificação e preço para o vínculo. Pré-requisito: a tabela
--   `product_portfolios` (expand_product_portfolios.sql) já aplicada.
--
-- Regras:
--   - NÃO toca em `products` (nem em qualquer outra tabela).
--   - Idempotente: `on conflict (product_id, portfolio_id) do nothing` —
--     reaplicar não duplica nem sobrescreve vínculos existentes.
--   - Produtos sem `portfolio_id` são ignorados (continuam sem vínculo).
--   - Preço/valor da caixa copiados como valor do vínculo (autoritativo no Contract);
--     enquanto isso o fallback COALESCE(vínculo, produto) preserva o preço atual.
--
-- Alvo: HUB DEV / Homologação (pnkgwfgjhijksfmofiot) — aplicar via SQL Editor.
-- =============================================================================

insert into product_portfolios (
  organization_id, product_id, portfolio_id,
  categoria_id, subcategoria_id, preco_unitario, valor_caixa, ativo
)
select
  p.organization_id, p.id, p.portfolio_id,
  p.categoria_id, p.subcategoria_id, p.preco_unitario, p.valor_caixa, p.ativo
from products p
where p.portfolio_id is not null
on conflict (product_id, portfolio_id) do nothing;

-- Conferência (apenas leitura): devem bater.
--   select count(*) from products where portfolio_id is not null;          -- esperado
--   select count(*) from product_portfolios;                               -- após backfill
