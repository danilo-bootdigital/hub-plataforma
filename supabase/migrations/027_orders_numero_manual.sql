-- Permitir que o número do pedido seja definido manualmente (mesmo do orçamento)
-- Remover o default serial para que o número seja passado explicitamente
ALTER TABLE orders ALTER COLUMN numero DROP DEFAULT;
