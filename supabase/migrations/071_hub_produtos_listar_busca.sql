-- Migration 071: ampliar a busca (p_busca) do RPC hub_produtos_listar (follow-up #13)
-- ============================================================================
-- CREATE OR REPLACE idempotente. Antes, p_busca filtrava só nome/apresentação/
-- categoria/composição. Passa a cobrir também subcategoria, portfólio, via de
-- administração, volume e unidade — para a busca de produtos no Orçamento (DEC-013/017)
-- encontrar por esses termos. Assinatura, permissões, filtros, ordenação, paginação
-- e o conjunto de colunas retornadas: INALTERADOS.
--
-- Aplicar no HUB DEV (pnkgwfgjhijksfmofiot) via SQL Editor.
-- ============================================================================

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
    left join categorias c on c.id = pp.categoria_id
    left join subcategorias s on s.id = pp.subcategoria_id';

  v_where := 'pp.organization_id = $1 and pp.ativo = true and pf.ativo = true
    and ($7 or pf.id in (select hp.portfolio_id from hub_portfolios hp
                         where hp.hub_id = $6 and hp.status = ''ativo'' and hp.organization_id = $1))
    and ($2 is null or p.nome ilike ''%''||$2||''%'' or coalesce(p.apresentacao,'''') ilike ''%''||$2||''%''
                    or coalesce(c.nome,'''') ilike ''%''||$2||''%'' or coalesce(p.composicao,'''') ilike ''%''||$2||''%''
                    or coalesce(s.nome,'''') ilike ''%''||$2||''%'' or coalesce(pf.nome,'''') ilike ''%''||$2||''%''
                    or coalesce(p.via_administracao,'''') ilike ''%''||$2||''%''
                    or coalesce(p.volume,'''') ilike ''%''||$2||''%'' or coalesce(p.unidade,'''') ilike ''%''||$2||''%'')
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
             p.nome, p.descricao, p.composicao,
             c.nome as categoria, s.nome as subcategoria, pf.nome as portfolio,
             p.apresentacao, p.via_administracao, p.via_apresentacao,
             p.volume, p.unidade, p.quantidade_por_caixa, p.aplicadores,
             coalesce(pp.preco_unitario, p.preco_unitario) as preco,
             coalesce(pp.valor_caixa, p.valor_caixa) as valor_caixa,
             p.exige_receita, p.observacoes_receita, p.ativo '
      || v_from || ' where ' || v_where || ' order by ' || v_order || ' limit $8 offset $9) r'
    into v_rows using v_org, v_busca, p_categoria_id, p_portfolio_id, p_status, v_hub, v_ind, greatest(p_limit,1), greatest(p_offset,0);

  return jsonb_build_object('total', coalesce(v_total,0), 'rows', coalesce(v_rows,'[]'::jsonb));
end; $$;
