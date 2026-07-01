-- ROLLBACK — Página HUB "Produtos" (DEC-013/DEC-014)
-- Remove as funções. As colunas metadata são mantidas (aditivas/inócuas);
-- para removê-las (opcional), descomente as linhas ALTER abaixo.
drop function if exists hub_produtos_listar(text, uuid, uuid, text, text, text, int, int);
drop function if exists hub_produto_detalhe(uuid);
drop function if exists hub_produtos_filtros();
drop function if exists _hub_ctx();
-- alter table products           drop column if exists metadata;
-- alter table product_portfolios drop column if exists metadata;
