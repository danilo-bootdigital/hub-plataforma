-- =============================================================================
-- Sprint EXPAND — RPC de Importação para Portfólio (DEC-013 / DEC-014)
-- [ADITIVO / IDEMPOTENTE] — cria função + índice. NÃO altera tabelas/RLS/Fornecedor.
-- =============================================================================
-- Regras desta importação (não violar):
--   - ATÔMICA: ou importa 100% das linhas, ou 0% (nenhuma escrita parcial).
--   - Produtos PODEM ser criados automaticamente (dedup por nome normalizado).
--   - Categorias/Subcategorias NÃO são criadas automaticamente: se a planilha
--     citar uma que não existe no Portfólio, vira PENDÊNCIA (bloqueia a importação).
--     O admin resolve fora da RPC (selecionar existente => mapa; criar manual =>
--     actions criarCategoria/criarSubcategoria) e re-roda o preview.
--   - products.portfolio_id NÃO é usado (vínculo vive só em product_portfolios).
--   - Acesso a product_portfolios é SOMENTE por esta RPC (RLS sem policies):
--     por isso a função valida autorização internamente (auth.uid -> profiles).
-- Alvo: HUB DEV (pnkgwfgjhijksfmofiot) — aplicar via SQL Editor.
-- =============================================================================

-- Índice de apoio ao dedup por nome normalizado (NÃO-único: não quebra com
-- nomes legados duplicados; serve só para performance da busca).
create index if not exists idx_products_org_nome_norm
  on products (organization_id, lower(btrim(nome)));

create or replace function importar_produtos_portfolio(
  p_portfolio_id       uuid,
  p_linhas             jsonb,                        -- array de objetos (1 por linha)
  p_modo               text    default 'atualizar',  -- 'atualizar' | 'preservar'
  p_dry_run            boolean default false,         -- true = preview (nunca persiste)
  p_mapa_categorias    jsonb   default '{}'::jsonb,  -- { "<nome na planilha>": "<categoria_id>" }
  p_mapa_subcategorias jsonb   default '{}'::jsonb   -- { "<cat>::<sub> da planilha>": "<subcategoria_id>" }
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid          uuid := auth.uid();
  v_org          uuid;
  v_cargo        text;
  v_rec          record;
  v_nome         text;
  v_nome_norm    text;
  v_cattxt       text;
  v_subtxt       text;
  v_preco        numeric(12,2);
  v_vcaixa       numeric(12,2);
  v_qtd          int;
  v_receita      boolean;
  v_product_id   uuid;
  v_cat_id       uuid;
  v_sub_id       uuid;
  v_vinc_id      uuid;
  v_existe_prod  boolean;
  v_seen         text[] := '{}';   -- nomes de produto já vistos NESTA planilha (proíbe repetição)
  v_pend_cat     text[] := '{}';   -- chaves de categoria já marcadas como pendência (dedup)
  v_pend_sub     text[] := '{}';   -- chaves de subcategoria já marcadas como pendência (dedup)
  v_criados      int := 0;
  v_vinculados   int := 0;
  v_atualizados  int := 0;
  v_ignorados    int := 0;
  v_erros        jsonb := '[]'::jsonb;
  v_pendencias   jsonb := '[]'::jsonb;
  v_itens        jsonb := '[]'::jsonb;
  v_status       text;
begin
  -- ── Autorização (SECURITY DEFINER ignora RLS → validar aqui) ─────────────
  if v_uid is null then raise exception 'Não autenticado.'; end if;
  select organization_id, cargo into v_org, v_cargo from profiles where id = v_uid;
  if v_org is null then raise exception 'Perfil não encontrado.'; end if;
  if v_cargo not in ('admin','gestor') then
    raise exception 'Sem permissão para importar produtos.';
  end if;
  if p_modo not in ('atualizar','preservar') then
    raise exception 'Modo inválido: %', p_modo;
  end if;
  perform 1 from portfolios where id = p_portfolio_id and organization_id = v_org;
  if not found then
    raise exception 'Portfólio não encontrado ou de outra organização.';
  end if;

  -- ════════════ FASE 1 — validar/classificar TUDO, sem escrever ═══════════
  for v_rec in
    select e.value as linha, e.ordinality as nlin
    from jsonb_array_elements(p_linhas) with ordinality as e(value, ordinality)
  loop
    begin
      -- Nome (obrigatório) + dedup intra-planilha
      v_nome := btrim(coalesce(v_rec.linha->>'nome',''));
      if v_nome = '' then raise exception 'Nome do produto vazio.'; end if;
      v_nome_norm := regexp_replace(lower(v_nome), '\s+', ' ', 'g');
      if v_nome_norm = any(v_seen) then
        raise exception 'Produto repetido na planilha: "%".', v_nome;
      end if;
      v_seen := array_append(v_seen, v_nome_norm);

      -- Preço (obrigatório) + numéricos opcionais (validam formato)
      if coalesce(v_rec.linha->>'preco','') = '' then raise exception 'Preço obrigatório.'; end if;
      v_preco := (v_rec.linha->>'preco')::numeric;
      if v_preco < 0 then raise exception 'Preço não pode ser negativo.'; end if;
      v_vcaixa  := nullif(btrim(coalesce(v_rec.linha->>'valor_caixa','')),'')::numeric;
      v_qtd     := nullif(btrim(coalesce(v_rec.linha->>'quantidade_por_caixa','')),'')::int;
      v_receita := coalesce(nullif(btrim(coalesce(v_rec.linha->>'exige_receita','')),'')::boolean, false);

      -- ── Categoria/Subcategoria: resolver por mapa OU por nome; senão PENDÊNCIA ──
      v_cattxt := btrim(coalesce(v_rec.linha->>'categoria',''));
      v_subtxt := btrim(coalesce(v_rec.linha->>'subcategoria',''));
      v_cat_id := null; v_sub_id := null;

      if v_subtxt <> '' and v_cattxt = '' then
        raise exception 'Subcategoria informada sem categoria.';
      end if;

      if v_cattxt <> '' then
        if p_mapa_categorias ? v_cattxt then
          v_cat_id := (p_mapa_categorias->>v_cattxt)::uuid;
          perform 1 from categorias
            where id = v_cat_id and portfolio_id = p_portfolio_id and organization_id = v_org;
          if not found then raise exception 'Mapeamento de categoria inválido: "%".', v_cattxt; end if;
        else
          select id into v_cat_id from categorias
            where organization_id = v_org and portfolio_id = p_portfolio_id
              and lower(btrim(nome)) = lower(v_cattxt) limit 1;
          if v_cat_id is null and not (lower(v_cattxt) = any(v_pend_cat)) then
            v_pend_cat := array_append(v_pend_cat, lower(v_cattxt));
            v_pendencias := v_pendencias || jsonb_build_object('tipo','categoria','nome',v_cattxt);
          end if;
        end if;

        if v_subtxt <> '' and v_cat_id is not null then
          if p_mapa_subcategorias ? (v_cattxt || '::' || v_subtxt) then
            v_sub_id := (p_mapa_subcategorias->>(v_cattxt || '::' || v_subtxt))::uuid;
            perform 1 from subcategorias
              where id = v_sub_id and categoria_id = v_cat_id and organization_id = v_org;
            if not found then raise exception 'Mapeamento de subcategoria inválido: "%".', v_subtxt; end if;
          else
            select id into v_sub_id from subcategorias
              where organization_id = v_org and categoria_id = v_cat_id
                and lower(btrim(nome)) = lower(v_subtxt) limit 1;
            if v_sub_id is null and not (lower(v_cattxt || '::' || v_subtxt) = any(v_pend_sub)) then
              v_pend_sub := array_append(v_pend_sub, lower(v_cattxt || '::' || v_subtxt));
              v_pendencias := v_pendencias ||
                jsonb_build_object('tipo','subcategoria','categoria',v_cattxt,'nome',v_subtxt);
            end if;
          end if;
        end if;
      end if;

      -- Classificação do produto/vínculo (somente leitura)
      select id into v_product_id from products
        where organization_id = v_org
          and regexp_replace(lower(btrim(nome)), '\s+', ' ', 'g') = v_nome_norm limit 1;
      v_existe_prod := v_product_id is not null;

      v_vinc_id := null;
      if v_existe_prod then
        select id into v_vinc_id from product_portfolios
          where product_id = v_product_id and portfolio_id = p_portfolio_id;
      end if;

      if v_vinc_id is not null and p_modo = 'preservar' then
        v_status := 'ignorado'; v_ignorados := v_ignorados + 1;
      elsif v_vinc_id is not null then
        v_status := 'atualizar'; v_atualizados := v_atualizados + 1;
      elsif v_existe_prod then
        v_status := 'vincular'; v_vinculados := v_vinculados + 1;
      else
        v_status := 'novo'; v_criados := v_criados + 1; v_vinculados := v_vinculados + 1;
      end if;

      v_itens := v_itens || jsonb_build_object('linha', v_rec.nlin, 'nome', v_nome, 'status', v_status);
    exception when others then
      v_erros := v_erros || jsonb_build_object('linha', v_rec.nlin, 'motivo', SQLERRM);
    end;
  end loop;

  -- ── Porta atômica: erro OU pendência OU preview → não persiste nada ──────
  if jsonb_array_length(v_erros) > 0 or jsonb_array_length(v_pendencias) > 0 or p_dry_run then
    return jsonb_build_object(
      'aplicado', false, 'dry_run', p_dry_run, 'modo', p_modo,
      'bloqueado', (jsonb_array_length(v_erros) > 0 or jsonb_array_length(v_pendencias) > 0),
      'total', jsonb_array_length(p_linhas),
      'criados', v_criados, 'vinculados', v_vinculados,
      'atualizados', v_atualizados, 'ignorados', v_ignorados,
      'erros', v_erros, 'pendencias', v_pendencias, 'itens', v_itens);
  end if;

  -- ════════════ FASE 2 — persistir TUDO (sem capturar exceção → rollback total) ══
  for v_rec in
    select e.value as linha from jsonb_array_elements(p_linhas) as e(value)
  loop
    v_nome      := btrim(v_rec.linha->>'nome');
    v_nome_norm := regexp_replace(lower(v_nome), '\s+', ' ', 'g');
    v_preco     := (v_rec.linha->>'preco')::numeric;
    v_vcaixa    := nullif(btrim(coalesce(v_rec.linha->>'valor_caixa','')),'')::numeric;
    v_qtd       := nullif(btrim(coalesce(v_rec.linha->>'quantidade_por_caixa','')),'')::int;
    v_receita   := coalesce(nullif(btrim(coalesce(v_rec.linha->>'exige_receita','')),'')::boolean, false);
    v_cattxt    := btrim(coalesce(v_rec.linha->>'categoria',''));
    v_subtxt    := btrim(coalesce(v_rec.linha->>'subcategoria',''));

    -- Resolver categoria/subcategoria SEM criar (Fase 1 garantiu que existem)
    v_cat_id := null; v_sub_id := null;
    if v_cattxt <> '' then
      if p_mapa_categorias ? v_cattxt then
        v_cat_id := (p_mapa_categorias->>v_cattxt)::uuid;
      else
        select id into v_cat_id from categorias
          where organization_id = v_org and portfolio_id = p_portfolio_id
            and lower(btrim(nome)) = lower(v_cattxt) limit 1;
      end if;
      if v_subtxt <> '' then
        if p_mapa_subcategorias ? (v_cattxt || '::' || v_subtxt) then
          v_sub_id := (p_mapa_subcategorias->>(v_cattxt || '::' || v_subtxt))::uuid;
        else
          select id into v_sub_id from subcategorias
            where organization_id = v_org and categoria_id = v_cat_id
              and lower(btrim(nome)) = lower(v_subtxt) limit 1;
        end if;
      end if;
    end if;

    -- Produto (criado se não existir; SEM portfolio_id — DEC-014 / N:N puro)
    select id into v_product_id from products
      where organization_id = v_org
        and regexp_replace(lower(btrim(nome)), '\s+', ' ', 'g') = v_nome_norm limit 1;
    if v_product_id is null then
      insert into products (
        organization_id, nome, descricao, preco_unitario, unidade, valor_caixa,
        volume, quantidade_por_caixa, apresentacao, via_administracao,
        via_apresentacao, aplicadores, exige_receita, observacoes_receita, ativo
      ) values (
        v_org, v_nome,
        nullif(btrim(coalesce(v_rec.linha->>'descricao','')),''),
        v_preco, coalesce(nullif(btrim(v_rec.linha->>'unidade'),''),'un'), v_vcaixa,
        nullif(btrim(coalesce(v_rec.linha->>'volume','')),''), v_qtd,
        nullif(btrim(coalesce(v_rec.linha->>'apresentacao','')),''),
        nullif(btrim(coalesce(v_rec.linha->>'via_administracao','')),''),
        nullif(btrim(coalesce(v_rec.linha->>'via_apresentacao','')),''),
        nullif(btrim(coalesce(v_rec.linha->>'aplicadores','')),''),
        v_receita, nullif(btrim(coalesce(v_rec.linha->>'observacoes_receita','')),''), true
      ) returning id into v_product_id;
    end if;

    -- Vínculo (preço/classificação por Portfólio)
    insert into product_portfolios (
      organization_id, product_id, portfolio_id,
      categoria_id, subcategoria_id, preco_unitario, valor_caixa, ativo
    ) values (
      v_org, v_product_id, p_portfolio_id, v_cat_id, v_sub_id, v_preco, v_vcaixa, true
    )
    on conflict (product_id, portfolio_id) do update
      set preco_unitario  = excluded.preco_unitario,
          valor_caixa     = excluded.valor_caixa,
          categoria_id    = excluded.categoria_id,
          subcategoria_id = excluded.subcategoria_id,
          ativo           = true,
          atualizado_em   = now()
      where p_modo = 'atualizar';   -- 'preservar' não altera vínculo existente
  end loop;

  return jsonb_build_object(
    'aplicado', true, 'dry_run', false, 'modo', p_modo, 'bloqueado', false,
    'total', jsonb_array_length(p_linhas),
    'criados', v_criados, 'vinculados', v_vinculados,
    'atualizados', v_atualizados, 'ignorados', v_ignorados,
    'erros', '[]'::jsonb, 'pendencias', '[]'::jsonb, 'itens', v_itens);
end;
$$;

grant execute on function
  importar_produtos_portfolio(uuid, jsonb, text, boolean, jsonb, jsonb) to authenticated;
