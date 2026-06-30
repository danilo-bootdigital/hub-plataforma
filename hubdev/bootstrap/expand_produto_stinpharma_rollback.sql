-- =============================================================================
-- ROLLBACK — Ficha de Produto StinPharma (expand_produto_stinpharma.sql)
-- Remove APENAS as colunas adicionadas pela migration de mesmo nome.
-- NÃO toca em colunas reaproveitadas (via_administracao, apresentacao, etc.).
-- Alvo: HUB DEV / Homologação (pnkgwfgjhijksfmofiot) — aplicar via SQL Editor.
-- =============================================================================

alter table products drop column if exists observacoes_receita;
alter table products drop column if exists exige_receita;
alter table products drop column if exists via_apresentacao;
alter table products drop column if exists aplicadores;
alter table products drop column if exists valor_caixa;
alter table products drop column if exists quantidade_por_caixa;
alter table products drop column if exists volume;
