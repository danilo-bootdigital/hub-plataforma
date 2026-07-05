-- Migration 070: Portfólio por item do orçamento (remoção da seleção de Portfólio)
-- ============================================================================
-- ADITIVO PURO. O orçamento deixa de ter 1 Portfólio escolhido pelo usuário: cada
-- ITEM passa a gravar seu portfolio_id automaticamente (derivado do produto vindo
-- da busca). `quotes.portfolio_id` continua gravado (= portfólio do 1º item) para
-- compatibilidade com PDF/tabela/detalhe. Segurança/preço por vínculo inalterados.
--
-- Aplicar no HUB DEV (pnkgwfgjhijksfmofiot) via SQL Editor antes do deploy.
-- ============================================================================

ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS portfolio_id uuid REFERENCES portfolios(id);
CREATE INDEX IF NOT EXISTS idx_quote_items_portfolio ON quote_items(portfolio_id);

COMMENT ON COLUMN quote_items.portfolio_id IS 'DEC-013/017: portfólio de origem do item (vínculo product_portfolios). Gravado automaticamente; o usuário não escolhe portfólio. Itens de um mesmo orçamento podem vir de portfólios diferentes.';
