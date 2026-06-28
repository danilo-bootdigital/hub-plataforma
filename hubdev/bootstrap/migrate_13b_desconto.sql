-- =============================================================================
-- Fatia 13B — desconto por tipo no Orçamento (ADITIVO / IDEMPOTENTE)
-- Somente para revisão; aplicar via SQL Editor do HUB DEV (pnkgwfgjhijksfmofiot).
-- =============================================================================
-- Adiciona em `quotes` APENAS o necessário para desconto por tipo:
--   - desconto_tipo  : 'PERCENTUAL' | 'VALOR' (nullable = sem desconto definido)
--   - desconto_valor : numeric(12,2) — usado quando tipo = 'VALOR'
-- O percentual continua em `desconto_geral` (já existente). Mutuamente exclusivos
-- (apenas um não-zero), controlados pela aplicação na Fatia 13B.
-- NÃO altera campos existentes (valor_subtotal, desconto_geral, observacoes,
-- valor_total), NÃO remove nada, NÃO altera RLS.
-- =============================================================================

alter table quotes add column if not exists desconto_tipo  text;
alter table quotes add column if not exists desconto_valor numeric(12,2) not null default 0;

-- CHECK do tipo (permite NULL = sem desconto definido). Guardado para idempotência.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'quotes_desconto_tipo_chk') then
    alter table quotes
      add constraint quotes_desconto_tipo_chk
      check (desconto_tipo in ('PERCENTUAL', 'VALOR'));
  end if;
end $$;
