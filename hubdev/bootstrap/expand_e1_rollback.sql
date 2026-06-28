-- =============================================================================
-- Sprint EXPAND E1 — ROLLBACK   [reverte expand_e1.sql, ordem inversa]
-- =============================================================================
-- Seguro porque a Expand E1 é aditiva e NÃO migra dados.
-- ATENÇÃO: descarta quaisquer dados de TESTE inseridos em hubs/carteiras e
--          qualquer valor preenchido em contacts.carteira_id. Não há dados de
--          produção envolvidos neste fluxo (HUB DEV / Homologação).
-- Aplicar via SQL Editor do HUB DEV (projeto pnkgwfgjhijksfmofiot).
-- =============================================================================

-- 1) Remover a coluna adicionada em contacts (índice cai junto com a coluna)
alter table contacts drop column if exists carteira_id;

-- 2) Remover tabelas novas (carteiras depende de hubs -> dropar carteiras antes)
drop table if exists carteiras;
drop table if exists hubs;
