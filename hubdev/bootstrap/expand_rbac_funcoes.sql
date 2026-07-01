-- =============================================================================
-- Sprint EXPAND E8 — RBAC: Perfis × Funções × Permissões (DEC-015)
-- [ADITIVO / IDEMPOTENTE] — cria funcoes, funcao_permissoes, profiles.funcao_id
-- e o resolvedor minhas_permissoes(). NÃO altera enum, RLS existente, nem dados.
-- =============================================================================
-- Modelo (DEC-015): Perfil (fixo) → Função (Role, criada pelo Proprietário,
--   escopo do Hub) → Permissões (módulo × ação) na Função. Assistente herda da
--   sua Função. Aplicação (1ª entrega) em menu/middleware/server-actions; a RLS
--   permanece por Perfil+Hub. Tabelas nascem com RLS habilitada e SEM policies
--   (bloqueadas ao papel da app); acesso via RPC SECURITY DEFINER (esta e as da
--   fase Migrate). Alvo: HUB DEV (pnkgwfgjhijksfmofiot) — aplicar via SQL Editor.
-- =============================================================================

-- Funções (papéis operacionais do Hub) — criadas pelo Proprietário.
create table if not exists funcoes (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  hub_id          uuid not null references hubs(id) on delete cascade,
  nome            text not null,
  descricao       text,
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  constraint unique_funcao_hub_nome unique (hub_id, nome)
);

-- Permissões concedidas a cada Função (presença da linha = concedido).
create table if not exists funcao_permissoes (
  id         uuid primary key default uuid_generate_v4(),
  funcao_id  uuid not null references funcoes(id) on delete cascade,
  modulo     text not null,   -- dashboard, clientes, leads, produtos, carteiras,
                              -- whatsapp, agenda, pedidos, orcamentos, financeiro,
                              -- equipe, configuracoes, relatorios, integracoes
  acao       text not null,   -- visualizar | criar | editar | excluir
  constraint unique_funcao_modulo_acao unique (funcao_id, modulo, acao),
  constraint chk_acao check (acao in ('visualizar','criar','editar','excluir'))
);

-- Função atribuída ao usuário (relevante para Assistente).
alter table profiles add column if not exists funcao_id uuid references funcoes(id);

create index if not exists idx_funcoes_hub        on funcoes(hub_id);
create index if not exists idx_funcoes_org        on funcoes(organization_id);
create index if not exists idx_funcperm_funcao    on funcao_permissoes(funcao_id);
create index if not exists idx_profiles_funcao    on profiles(funcao_id);

alter table funcoes           enable row level security;
alter table funcao_permissoes enable row level security;

-- Resolvedor das permissões efetivas do chamador (usado por menu/middleware/actions).
-- admin/proprietario_hub => total; gestor => conjunto fixo; assistente => Função.
create or replace function minhas_permissoes()
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_cargo text; v_funcao uuid; v_fnome text; v_perm jsonb;
begin
  if v_uid is null then raise exception 'Não autenticado.'; end if;
  select cargo, funcao_id into v_cargo, v_funcao from profiles where id = v_uid;
  if v_cargo is null then raise exception 'Perfil não encontrado.'; end if;

  -- Acesso total (não editável)
  if v_cargo in ('admin','proprietario_hub') then
    return jsonb_build_object('perfil', v_cargo, 'total', true, 'permissoes', '{}'::jsonb);
  end if;

  -- Gestor da Indústria — conjunto fixo (arquitetura; não editável)
  if v_cargo = 'gestor' then
    return jsonb_build_object('perfil','gestor','total',false,'permissoes', jsonb_build_object(
      'produtos',   jsonb_build_array('visualizar','criar','editar'),
      'portfolios', jsonb_build_array('visualizar','criar','editar'),
      'relatorios', jsonb_build_array('visualizar'),
      'hubs',       jsonb_build_array('visualizar')
    ));
  end if;

  -- Assistente (e legado 'vendedor' durante a transição) — permissões da Função
  select f.nome into v_fnome from funcoes f where f.id = v_funcao;
  select coalesce(jsonb_object_agg(modulo, acoes), '{}'::jsonb) into v_perm
  from (select modulo, jsonb_agg(acao order by acao) as acoes
        from funcao_permissoes where funcao_id = v_funcao group by modulo) q;

  return jsonb_build_object(
    'perfil', v_cargo, 'total', false,
    'funcao_id', v_funcao, 'funcao_nome', v_fnome,
    'permissoes', coalesce(v_perm, '{}'::jsonb)
  );
end; $$;

grant execute on function minhas_permissoes() to authenticated;
