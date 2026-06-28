-- =============================================================================
-- Migrate M1 — Fatia 01: reconhecimento dos novos papéis (proprietario_hub, assistente)
-- [APENAS o trigger de criação de usuário]  — somente para revisão; aplicar via SQL Editor.
-- =============================================================================
-- Objetivo: o trigger handle_new_user passa a ACEITAR os papéis novos no cargo
--   vindo de raw_user_meta_data. Hoje, qualquer cargo fora da lista cai em 'vendedor'
--   (default) — o que faria 'proprietario_hub'/'assistente' NÃO serem reconhecidos.
-- Aditivo/compatível: mantém todos os papéis atuais e o mesmo default ('vendedor').
-- NÃO altera RLS, dados, nem outras funções. Idempotente (create or replace).
-- Alvo: HUB DEV / Homologação (pnkgwfgjhijksfmofiot).
-- =============================================================================

create or replace function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
declare org_id uuid;
begin
  select id into org_id from organizations order by criado_em asc limit 1;
  if org_id is null then raise exception 'Nenhuma organização encontrada para vincular o usuário.'; end if;
  insert into profiles (id, organization_id, nome, email, cargo)
  values (new.id, org_id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)),
    new.email,
    case when new.raw_user_meta_data->>'cargo' in
      ('admin','gestor','vendedor','atendimento','financeiro','suporte','proprietario_hub','assistente')
      then (new.raw_user_meta_data->>'cargo')::user_role else 'vendedor'::user_role end);
  return new;
end; $$;
