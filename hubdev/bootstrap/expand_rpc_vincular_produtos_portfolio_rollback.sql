-- ROLLBACK — RPC de Vínculo em massa Produto↔Portfólio (DEC-013/DEC-014)
-- Remove as funções. NÃO toca dados nem outras tabelas.
drop function if exists vincular_produtos_portfolio(uuid, uuid[], uuid, uuid);
drop function if exists produtos_vinculados_portfolio(uuid);
