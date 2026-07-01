-- =============================================================================
-- DEV — Exclusão definitiva de usuário (limpeza de ambiente)
-- [IDEMPOTENTE] — cria RPC de verificação de vínculos. NÃO altera tabelas.
-- =============================================================================
-- Exceção para DEV/organização inicial. Em produção o padrão é DESATIVAR.
-- contar_vinculos_usuario: percorre dinamicamente TODOS os FKs que referenciam
-- profiles(id) (exceto audit_logs, que é log) e conta linhas do usuário-alvo —
-- cobre "qualquer outro vínculo operacional" sem hardcode de colunas. Também
-- sinaliza se o usuário é Proprietário de um Hub (não pode ser removido — DEC-015).
-- Só Administrador da Indústria; alvo precisa ser da mesma organização.
-- Alvo: HUB DEV (pnkgwfgjhijksfmofiot) — aplicar via SQL Editor.
-- =============================================================================

create or replace function contar_vinculos_usuario(p_user_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid(); v_cargo text; v_org uuid;
  v_alvo_org uuid; v_alvo_cargo text; v_alvo_hub uuid;
  r record; v_qtd bigint; v_itens jsonb := '[]'::jsonb; v_total bigint := 0;
begin
  if v_uid is null then raise exception 'Não autenticado.'; end if;
  select cargo, organization_id into v_cargo, v_org from profiles where id = v_uid;
  if v_cargo <> 'admin' then raise exception 'Apenas Administrador da Indústria.'; end if;

  select organization_id, cargo, hub_id into v_alvo_org, v_alvo_cargo, v_alvo_hub
  from profiles where id = p_user_id;
  if v_alvo_org is null or v_alvo_org <> v_org then
    raise exception 'Usuário não encontrado ou de outra organização.';
  end if;

  for r in
    select c.conrelid::regclass::text as tabela, a.attname as coluna
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f'
      and c.confrelid = 'public.profiles'::regclass
      and array_length(c.conkey, 1) = 1
      and c.conrelid::regclass::text not in ('audit_logs')
  loop
    execute format('select count(*) from %s where %I = $1', r.tabela, r.coluna)
      into v_qtd using p_user_id;
    if v_qtd > 0 then
      v_total := v_total + v_qtd;
      v_itens := v_itens || jsonb_build_object('tabela', r.tabela, 'coluna', r.coluna, 'qtd', v_qtd);
    end if;
  end loop;

  return jsonb_build_object(
    'total', v_total,
    'itens', v_itens,
    'proprietario_de_hub', (v_alvo_cargo = 'proprietario_hub' and v_alvo_hub is not null),
    'cargo', v_alvo_cargo
  );
end; $$;

grant execute on function contar_vinculos_usuario(uuid) to authenticated;
