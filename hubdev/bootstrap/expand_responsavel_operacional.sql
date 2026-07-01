-- =============================================================================
-- Sprint EXPAND — Responsável operacional por cliente no Hub (DEC-017)
-- [ADITIVO / IDEMPOTENTE] — coluna + índice + RPC de leitura. NÃO altera Carteira.
-- =============================================================================
-- DEC-017: NÃO confundir Carteira (organização oficial da Indústria — contacts.carteira_id)
-- com Responsável operacional no Hub (quem atende o cliente dentro do Hub). Este é um
-- campo NOVO e separado: contacts.responsavel_operacional_id. A distribuição (definir
-- responsável) é feita pelo Proprietário no Hub; a Carteira permanece intocada.
-- Alvo: HUB DEV (pnkgwfgjhijksfmofiot) — aplicar via SQL Editor.
-- =============================================================================

alter table contacts add column if not exists responsavel_operacional_id uuid references profiles(id);
create index if not exists idx_contacts_resp_operacional on contacts(responsavel_operacional_id);

-- Clientes que o Hub do chamador OPERA = contatos cuja Carteira está vinculada ao Hub
-- (carteiras.hub_id = hub do Proprietário). Retorna Carteira (Indústria) e Responsável
-- operacional (Hub) — os dois conceitos, lado a lado, sem se confundirem.
create or replace function hub_clientes_listar()
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_org uuid; v_cargo text; v_hub uuid; v_ind boolean;
begin
  if auth.uid() is null then raise exception 'Não autenticado.'; end if;
  select org, cargo, hub, is_industria into v_org, v_cargo, v_hub, v_ind from _hub_ctx();
  if v_cargo <> 'proprietario_hub' or v_hub is null then
    raise exception 'Apenas o Proprietário do Hub distribui clientes.';
  end if;

  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'nome', c.nome, 'telefone', c.telefone,
      'carteira_id', ct.id, 'carteira_nome', ct.nome,
      'responsavel_operacional_id', c.responsavel_operacional_id,
      'responsavel_nome', p.nome
    ) order by c.nome), '[]'::jsonb)
    from contacts c
    join carteiras ct on ct.id = c.carteira_id and ct.hub_id = v_hub and ct.organization_id = v_org
    left join profiles p on p.id = c.responsavel_operacional_id
    where c.organization_id = v_org
  );
end; $$;

grant execute on function hub_clientes_listar() to authenticated;
