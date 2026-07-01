-- =============================================================================
-- Sprint EXPAND — Página HUB "Produtos" (consulta operacional) — DEC-013/DEC-014
-- [ADITIVO / IDEMPOTENTE] — colunas metadata + 3 RPCs de leitura. NÃO altera
-- tabelas existentes (só ADD COLUMN), RLS ou Fornecedor.
-- =============================================================================
-- O HUB NÃO cadastra produtos; apenas consome os autorizados via Portfólios
-- liberados (hub_portfolios ativos). Leitura via RPC SECURITY DEFINER porque
-- product_portfolios tem RLS sem policies. Indústria (admin/gestor/financeiro)
-- enxerga tudo da org; Hub (proprietario_hub/assistente) só via Portfólio autorizado.
-- Campos específicos de cada Portfólio ficam em metadata (jsonb) — flexível.
-- Alvo: HUB DEV (pnkgwfgjhijksfmofiot) — aplicar via SQL Editor.
-- =============================================================================

alter table products           add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table product_portfolios add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Contexto do chamador (helper interno reutilizado pelas 3 RPCs).
-- Retorna (org, cargo, hub, is_industria). Sem SECURITY DEFINER próprio: chamado
-- de dentro das RPCs definer.
create or replace function _hub_ctx()
returns table(org uuid, cargo text, hub uuid, is_industria boolean)
language sql stable security definer set search_path = public, pg_temp as $$
  select p.organization_id, p.cargo, p.hub_id,
         (p.cargo in ('admin','gestor','financeiro'))
  from profiles p where p.id = auth.uid();
$$;

-- ── Listagem paginada (server-side: busca/filtros/ordenação/paginação) ────
create or replace function hub_produtos_listar(
  p_busca         text default null,
  p_categoria_id  uuid default null,
  p_portfolio_id  uuid default null,
  p_status        text default null,     -- 'ativo' | 'inativo' | null
  p_order_by      text default 'nome',
  p_order_dir     text default 'asc',
  p_limit         int  default 25,
  p_offset        int  default 0
) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_org uuid; v_cargo text; v_hub uuid; v_ind boolean;
  v_from text; v_where text; v_order text; v_col text; v_dir text;
  v_total int; v_rows jsonb; v_busca text := nullif(btrim(coalesce(p_busca,'')),'');
begin
  if auth.uid() is null then raise exception 'Não autenticado.'; end if;
  select org, cargo, hub, is_industria into v_org, v_cargo, v_hub, v_ind from _hub_ctx();
  if v_org is null then raise exception 'Perfil não encontrado.'; end if;
  if v_cargo not in ('admin','gestor','financeiro','proprietario_hub','assistente') then
    raise exception 'Sem permissão.';
  end if;

  v_from := 'from product_portfolios pp
    join products p   on p.id  = pp.product_id
    join portfolios pf on pf.id = pp.portfolio_id
    left join categorias c on c.id = pp.categoria_id';

  v_where := 'pp.organization_id = $1 and pp.ativo = true and pf.ativo = true
    and ($7 or pf.id in (select hp.portfolio_id from hub_portfolios hp
                         where hp.hub_id = $6 and hp.status = ''ativo'' and hp.organization_id = $1))
    and ($2 is null or p.nome ilike ''%''||$2||''%'' or coalesce(p.apresentacao,'''') ilike ''%''||$2||''%''
                    or coalesce(c.nome,'''') ilike ''%''||$2||''%'' or coalesce(p.composicao,'''') ilike ''%''||$2||''%'')
    and ($3 is null or pp.categoria_id = $3)
    and ($4 is null or pp.portfolio_id = $4)
    and ($5 is null or p.ativo = ($5 = ''ativo''))';

  v_col := case p_order_by
    when 'categoria' then 'c.nome' when 'portfolio' then 'pf.nome'
    when 'apresentacao' then 'p.apresentacao' when 'via_administracao' then 'p.via_administracao'
    when 'volume' then 'p.volume' when 'unidade' then 'p.unidade'
    when 'preco' then 'coalesce(pp.preco_unitario,p.preco_unitario)'
    when 'status' then 'p.ativo' else 'p.nome' end;
  v_dir := case when lower(coalesce(p_order_dir,'asc')) = 'desc' then 'desc' else 'asc' end;
  v_order := v_col || ' ' || v_dir || ' nulls last, p.nome asc';

  execute 'select count(*) ' || v_from || ' where ' || v_where
    into v_total using v_org, v_busca, p_categoria_id, p_portfolio_id, p_status, v_hub, v_ind;

  execute 'select coalesce(jsonb_agg(to_jsonb(r)), ''[]''::jsonb) from (
      select pp.id as vinculo_id, p.id as product_id, pf.id as portfolio_id,
             p.nome, c.nome as categoria, pf.nome as portfolio, p.apresentacao,
             p.via_administracao, p.volume, p.unidade,
             coalesce(pp.preco_unitario, p.preco_unitario) as preco, p.ativo '
      || v_from || ' where ' || v_where || ' order by ' || v_order || ' limit $8 offset $9) r'
    into v_rows using v_org, v_busca, p_categoria_id, p_portfolio_id, p_status, v_hub, v_ind, greatest(p_limit,1), greatest(p_offset,0);

  return jsonb_build_object('total', coalesce(v_total,0), 'rows', coalesce(v_rows,'[]'::jsonb));
end; $$;

-- ── Detalhe de uma oferta (produto × portfólio) para o drawer ─────────────
create or replace function hub_produto_detalhe(p_vinculo_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_org uuid; v_cargo text; v_hub uuid; v_ind boolean; v_res jsonb;
begin
  if auth.uid() is null then raise exception 'Não autenticado.'; end if;
  select org, cargo, hub, is_industria into v_org, v_cargo, v_hub, v_ind from _hub_ctx();
  if v_org is null then raise exception 'Perfil não encontrado.'; end if;

  select jsonb_build_object(
    'vinculo_id', pp.id, 'product_id', p.id, 'portfolio_id', pf.id,
    'nome', p.nome, 'descricao', p.descricao,
    'categoria', c.nome, 'subcategoria', s.nome, 'portfolio', pf.nome,
    'apresentacao', p.apresentacao, 'via_administracao', p.via_administracao,
    'via_apresentacao', p.via_apresentacao, 'volume', p.volume,
    'quantidade_por_caixa', p.quantidade_por_caixa, 'aplicadores', p.aplicadores,
    'unidade', p.unidade, 'composicao', p.composicao,
    'preco', coalesce(pp.preco_unitario, p.preco_unitario),
    'valor_caixa', coalesce(pp.valor_caixa, p.valor_caixa),
    'exige_receita', p.exige_receita, 'observacoes_receita', p.observacoes_receita,
    'ativo', p.ativo,
    'produto_metadata', p.metadata, 'oferta_metadata', pp.metadata
  ) into v_res
  from product_portfolios pp
  join products p on p.id = pp.product_id
  join portfolios pf on pf.id = pp.portfolio_id
  left join categorias c on c.id = pp.categoria_id
  left join subcategorias s on s.id = pp.subcategoria_id
  where pp.id = p_vinculo_id and pp.organization_id = v_org
    and (v_ind or pf.id in (select hp.portfolio_id from hub_portfolios hp
                            where hp.hub_id = v_hub and hp.status = 'ativo' and hp.organization_id = v_org));

  if v_res is null then raise exception 'Produto não encontrado ou não autorizado.'; end if;
  return v_res;
end; $$;

-- ── Opções de filtro (Portfólios/Categorias visíveis ao chamador) ─────────
create or replace function hub_produtos_filtros()
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_org uuid; v_cargo text; v_hub uuid; v_ind boolean;
begin
  if auth.uid() is null then raise exception 'Não autenticado.'; end if;
  select org, cargo, hub, is_industria into v_org, v_cargo, v_hub, v_ind from _hub_ctx();
  if v_org is null then raise exception 'Perfil não encontrado.'; end if;

  return jsonb_build_object(
    'portfolios', (
      select coalesce(jsonb_agg(jsonb_build_object('id', pf.id, 'nome', pf.nome) order by pf.nome), '[]'::jsonb)
      from portfolios pf
      where pf.organization_id = v_org and pf.ativo = true
        and (v_ind or pf.id in (select hp.portfolio_id from hub_portfolios hp
                                where hp.hub_id = v_hub and hp.status = 'ativo' and hp.organization_id = v_org))
    ),
    'categorias', (
      select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'nome', c.nome) order by c.nome), '[]'::jsonb)
      from categorias c join portfolios pf on pf.id = c.portfolio_id
      where c.organization_id = v_org and c.ativo = true
        and (v_ind or pf.id in (select hp.portfolio_id from hub_portfolios hp
                                where hp.hub_id = v_hub and hp.status = 'ativo' and hp.organization_id = v_org))
    )
  );
end; $$;

grant execute on function _hub_ctx() to authenticated;
grant execute on function hub_produtos_listar(text, uuid, uuid, text, text, text, int, int) to authenticated;
grant execute on function hub_produto_detalhe(uuid) to authenticated;
grant execute on function hub_produtos_filtros() to authenticated;
