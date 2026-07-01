-- =============================================================================
-- Sprint EXPAND — Identidade/Marca do Hub (DEC-017)
-- [ADITIVO / IDEMPOTENTE] — só ADD COLUMN. NÃO remove nada.
-- =============================================================================
-- A identidade do PDF de orçamento é do HUB (não da Indústria). O Hub passa a
-- ter dados de marca próprios (logo + contatos) usados no cabeçalho/rodapé do
-- PDF enviado ao cliente. A Indústria (Stin Pharma) entrará depois como
-- "Laboratório" (fabricante), não como remetente.
-- Alvo: HUB DEV (pnkgwfgjhijksfmofiot) — SQL Editor.
-- =============================================================================

alter table hubs add column if not exists logo_url  text;
alter table hubs add column if not exists telefone  text;
alter table hubs add column if not exists email     text;
alter table hubs add column if not exists site      text;
alter table hubs add column if not exists instagram text;
alter table hubs add column if not exists cnpj      text;
alter table hubs add column if not exists endereco  text;
