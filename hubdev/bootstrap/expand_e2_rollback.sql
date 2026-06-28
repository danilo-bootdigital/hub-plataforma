-- =============================================================================
-- Sprint EXPAND E2 — ROLLBACK   [reverte expand_e2.sql, ordem inversa]
-- Somente para revisão; NÃO aplicar ainda.
-- =============================================================================
-- Seguro: a Expand E2 é aditiva e NÃO migra dados.
-- ATENÇÃO: descarta dados de TESTE eventualmente inseridos nas estruturas novas.
-- LIMITAÇÃO: valores adicionados ao enum user_role (proprietario_hub, assistente)
--   NÃO são removíveis sem recriar o tipo — ficam INERTES após o rollback; a
--   remoção definitiva (junto de vendedor/atendimento/suporte) ocorre no Contract.
-- Alvo: HUB DEV (pnkgwfgjhijksfmofiot) — via SQL Editor.
-- =============================================================================

-- 1) Remover índices explícitos (os demais caem com tabelas/colunas)
drop index if exists uq_cliente_resp_ativo;
drop index if exists idx_cliente_resp_assistente;
drop index if exists idx_cliente_resp_cliente;
drop index if exists idx_cliente_resp_hub;
drop index if exists uq_hub_permissoes;
drop index if exists idx_hub_permissoes_assistente;
drop index if exists idx_hub_permissoes_hub;
drop index if exists idx_profiles_hub;
drop index if exists idx_carteiras_modo;
drop index if exists idx_carteiras_responsavel;
drop index if exists idx_hubs_status;
drop index if exists idx_hubs_representante;
drop index if exists idx_representantes_org;

-- 2) Remover colunas adicionadas
alter table profiles  drop column if exists hub_id;
alter table carteiras drop column if exists responsavel_id;
alter table carteiras drop column if exists modo;
alter table hubs      drop column if exists representante_id;
alter table hubs      drop column if exists status;

-- 3) Remover tabelas novas (ordem inversa de dependência)
drop table if exists cliente_responsaveis;
drop table if exists hub_permissoes;
drop table if exists representantes;

-- 4) Remover enums novos (já sem colunas que os usem)
drop type if exists carteira_modo;
drop type if exists hub_status;

-- (user_role: valores 'proprietario_hub'/'assistente' permanecem — ver cabeçalho.)
