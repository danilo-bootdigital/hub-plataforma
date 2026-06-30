-- =============================================================================
-- Sprint EXPAND — RPC de Vínculo em massa Produto↔Portfólio (DEC-013 / DEC-014)
-- [ADITIVO / IDEMPOTENTE] — cria 2 funções. NÃO altera tabelas/RLS/Fornecedor.
-- =============================================================================
-- Vincula PRODUTOS JÁ EXISTENTES (por id) a um Portfólio, em lote:
--   - preço do vínculo HERDA preco_unitario/valor_caixa do produto (fallback DEC-013);
--   - classificação (categoria/subcategoria) OPCIONAL, aplicada a todos do lote;
--   - idempotente: já vinculado é ignorado (on conflict do nothing), não duplica;
--   - atômico (transação única); products.portfolio_id NÃO é usado.
-- Acesso ao vínculo só via RPC (RLS sem policies): autorização validada aqui.
-- Alvo: HUB DEV (pnkgwfgjhijksfmofiot) — aplicar via SQL Editor.
-- =============================================================================

create or replace function vincular_produtos_portfolio(
  p_portfolio_id    uuid,
  p_product_ids     uuid[],
  p_categoria_id    uuid default null,
  p_subcategoria_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid         uuid := auth.uid();
  v_org         uuid;
  v_cargo       text;
  v_pid         uuid;
  v_preco       numeric(12,2);
  v_vcaixa      numeric(12,2);
  v_rc          int;
  v_vinculados  int := 0;
  v_ignorados   int := 0;
  v_total       int := coalesce(array_length(p_product_ids, 1), 0);
begin
  if v_uid is null then raise exception 'Não autenticado.'; end if;
  select organization_id, cargo into v_org, v_cargo from profiles where id = v_uid;
  if v_org is null then raise exception 'Perfil não encontrado.'; end if;
  if v_cargo not in ('admin','gestor') then raise exception 'Sem permissão.'; end if;

  perform 1 from portfolios where id = p_portfolio_id and organization_id = v_org;
  if not found then raise exception 'Portfólio não encontrado ou de outra organização.'; end if;

  -- Classificação opcional: validar pertencimento ao portfólio.
  if p_categoria_id is not null then
    perform 1 from categorias where id = p_categoria_id and portfolio_id = p_portfolio_id and organization_id = v_org;
    if not found then raise exception 'Categoria não pertence a este portfólio.'; end if;
  end if;
  if p_subcategoria_id is not null then
    if p_categoria_id is null then raise exception 'Subcategoria informada sem categoria.'; end if;
    perform 1 from subcategorias where id = p_subcategoria_id and categoria_id = p_categoria_id and organization_id = v_org;
    if not found then raise exception 'Subcategoria não pertence à categoria informada.'; end if;
  end if;

  foreach v_pid in array coalesce(p_product_ids, '{}'::uuid[])
  loop
    -- Produto precisa pertencer à organização.
    select preco_unitario, valor_caixa into v_preco, v_vcaixa
      from products where id = v_pid and organization_id = v_org;
    if not found then v_ignorados := v_ignorados + 1; continue; end if;

    insert into product_portfolios (
      organization_id, product_id, portfolio_id,
      categoria_id, subcategoria_id, preco_unitario, valor_caixa, ativo
    ) values (
      v_org, v_pid, p_portfolio_id,
      p_categoria_id, p_subcategoria_id, v_preco, v_vcaixa, true
    )
    on conflict (product_id, portfolio_id) do nothing;

    get diagnostics v_rc = row_count;
    if v_rc > 0 then v_vinculados := v_vinculados + 1; else v_ignorados := v_ignorados + 1; end if;
  end loop;

  return jsonb_build_object('total', v_total, 'vinculados', v_vinculados, 'ignorados', v_ignorados);
end;
$$;

-- Leitura: ids de produtos já vinculados (ativos) a um portfólio — para a UI
-- saber o que já está dentro (RLS bloqueia leitura direta do vínculo).
create or replace function produtos_vinculados_portfolio(p_portfolio_id uuid)
returns uuid[]
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_cargo text;
begin
  if v_uid is null then raise exception 'Não autenticado.'; end if;
  select organization_id, cargo into v_org, v_cargo from profiles where id = v_uid;
  if v_org is null then raise exception 'Perfil não encontrado.'; end if;
  if v_cargo not in ('admin','gestor') then raise exception 'Sem permissão.'; end if;

  return (
    select coalesce(array_agg(pp.product_id), '{}'::uuid[])
    from product_portfolios pp
    where pp.portfolio_id = p_portfolio_id and pp.organization_id = v_org and pp.ativo = true
  );
end;
$$;

grant execute on function vincular_produtos_portfolio(uuid, uuid[], uuid, uuid) to authenticated;
grant execute on function produtos_vinculados_portfolio(uuid) to authenticated;
