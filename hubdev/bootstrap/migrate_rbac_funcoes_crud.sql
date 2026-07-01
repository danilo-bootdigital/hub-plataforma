-- =============================================================================
-- Sprint MIGRATE — RBAC: CRUD de Funções (DEC-015)
-- [IDEMPOTENTE] — RPCs SECURITY DEFINER para o Proprietário gerenciar as Funções
-- do seu Hub. Acesso ao vínculo só via RPC (funcoes/funcao_permissoes têm RLS sem
-- policies). Reusa _hub_ctx() (E7). Pré-req: expand_rbac_funcoes.sql aplicado.
-- Alvo: HUB DEV (pnkgwfgjhijksfmofiot) — aplicar via SQL Editor.
-- =============================================================================

-- Listar as Funções do Hub do chamador (com nº de usuários e permissões).
create or replace function funcoes_listar()
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_org uuid; v_cargo text; v_hub uuid; v_ind boolean;
begin
  if auth.uid() is null then raise exception 'Não autenticado.'; end if;
  select org, cargo, hub, is_industria into v_org, v_cargo, v_hub, v_ind from _hub_ctx();
  if v_cargo <> 'proprietario_hub' or v_hub is null then raise exception 'Apenas o Proprietário do Hub gerencia Funções.'; end if;

  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', f.id, 'nome', f.nome, 'descricao', f.descricao, 'ativo', f.ativo,
      'usuarios', (select count(*) from profiles p where p.funcao_id = f.id),
      'permissoes', (
        select coalesce(jsonb_object_agg(modulo, acoes), '{}'::jsonb)
        from (select modulo, jsonb_agg(acao order by acao) as acoes
              from funcao_permissoes where funcao_id = f.id group by modulo) q
      )
    ) order by f.nome), '[]'::jsonb)
    from funcoes f where f.hub_id = v_hub and f.organization_id = v_org
  );
end; $$;

-- Criar/atualizar Função + substituir permissões (transação única).
-- p_permissoes: array de objetos {"modulo": "...", "acao": "..."}.
create or replace function funcao_salvar(
  p_id uuid, p_nome text, p_descricao text, p_ativo boolean, p_permissoes jsonb
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_org uuid; v_cargo text; v_hub uuid; v_ind boolean; v_id uuid;
begin
  if auth.uid() is null then raise exception 'Não autenticado.'; end if;
  select org, cargo, hub, is_industria into v_org, v_cargo, v_hub, v_ind from _hub_ctx();
  if v_cargo <> 'proprietario_hub' or v_hub is null then raise exception 'Apenas o Proprietário do Hub gerencia Funções.'; end if;
  if coalesce(btrim(p_nome),'') = '' then raise exception 'Nome da função é obrigatório.'; end if;

  if p_id is null then
    begin
      insert into funcoes (organization_id, hub_id, nome, descricao, ativo)
      values (v_org, v_hub, btrim(p_nome), nullif(btrim(coalesce(p_descricao,'')),''), coalesce(p_ativo, true))
      returning id into v_id;
    exception when unique_violation then raise exception 'Já existe uma função com este nome.'; end;
  else
    update funcoes set nome = btrim(p_nome), descricao = nullif(btrim(coalesce(p_descricao,'')),''),
           ativo = coalesce(p_ativo, true), atualizado_em = now()
    where id = p_id and hub_id = v_hub and organization_id = v_org
    returning id into v_id;
    if v_id is null then raise exception 'Função não encontrada neste Hub.'; end if;
  end if;

  -- Substituir permissões
  delete from funcao_permissoes where funcao_id = v_id;
  insert into funcao_permissoes (funcao_id, modulo, acao)
  select v_id, e->>'modulo', e->>'acao'
  from jsonb_array_elements(coalesce(p_permissoes, '[]'::jsonb)) e
  on conflict (funcao_id, modulo, acao) do nothing;

  return v_id;
end; $$;

-- Excluir Função (bloqueia se houver usuários atribuídos).
create or replace function funcao_excluir(p_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_org uuid; v_cargo text; v_hub uuid; v_ind boolean; v_uso int;
begin
  if auth.uid() is null then raise exception 'Não autenticado.'; end if;
  select org, cargo, hub, is_industria into v_org, v_cargo, v_hub, v_ind from _hub_ctx();
  if v_cargo <> 'proprietario_hub' or v_hub is null then raise exception 'Apenas o Proprietário do Hub gerencia Funções.'; end if;

  perform 1 from funcoes where id = p_id and hub_id = v_hub and organization_id = v_org;
  if not found then raise exception 'Função não encontrada neste Hub.'; end if;

  select count(*) into v_uso from profiles where funcao_id = p_id;
  if v_uso > 0 then raise exception 'Não é possível excluir: % usuário(s) com esta função.', v_uso; end if;

  delete from funcoes where id = p_id and hub_id = v_hub;  -- cascade remove permissões
end; $$;

grant execute on function funcoes_listar() to authenticated;
grant execute on function funcao_salvar(uuid, text, text, boolean, jsonb) to authenticated;
grant execute on function funcao_excluir(uuid) to authenticated;
