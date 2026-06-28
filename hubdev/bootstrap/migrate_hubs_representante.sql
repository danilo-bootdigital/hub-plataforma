-- =============================================================================
-- Cadastro de Hub: Hub × Representante como entidades distintas (ADITIVO / IDEMPOTENTE)
-- Aplicar via SQL Editor do HUB DEV (pnkgwfgjhijksfmofiot).
-- =============================================================================
-- Conceito: o HUB é a unidade operacional (entidade própria, perene); o
-- REPRESENTANTE é apenas o responsável atual (pode ser substituído sem trocar o Hub).
--
--   - hubs.nome           : "Nome do Hub" (coluna NOT NULL existente — reutilizada)
--   - nome_representante   : nome do responsável atual (NOVO, opcional no schema;
--                            obrigatoriedade garantida pela aplicação)
--   - nome_fantasia        : nome comercial da empresa do representante (NOVO, opcional)
--   - razao_social         : razão social da empresa (NOVO, opcional)
--   - observacoes          : texto livre, até 3.000 caracteres (NOVO, opcional)
--
-- `email`, `telefone`, `cnpj` JÁ existem na tabela. NÃO remove colunas,
-- NÃO altera nome/descricao/status/enum, NÃO altera RLS.
-- =============================================================================

alter table hubs add column if not exists nome_representante text;
alter table hubs add column if not exists nome_fantasia      text;
alter table hubs add column if not exists razao_social       text;
alter table hubs add column if not exists observacoes        text;

-- Limite de 3.000 caracteres em observacoes (guardado p/ idempotência).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'hubs_observacoes_len_chk') then
    alter table hubs
      add constraint hubs_observacoes_len_chk
      check (observacoes is null or char_length(observacoes) <= 3000);
  end if;
end $$;
