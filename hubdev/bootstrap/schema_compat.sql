-- =============================================================================
-- HUB DEV — Schema de Compatibilidade (compat-v0)   [ARTEFATO TEMPORÁRIO]
-- =============================================================================
-- Reproduz o schema MÍNIMO que o código atual usa, para rodar o app durante
-- Expand → Migrate → Contract. NÃO é a Baseline 001. NÃO vai para produção.
-- Inclui estruturas legadas ainda em uso (saem no Contract). Exclui sem-uso:
-- system_config, RPC conversas_sem_resposta, função normalizar_telefone,
-- índice idx_orders_ganho (bug), bucket catalogo-materiais.
-- Correção de drift: orders ganha supplier_id/carrier_id/frete_regiao/nota_*.
-- =============================================================================

create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
create type user_role          as enum ('admin','gestor','vendedor','atendimento','financeiro','suporte');
create type lead_origem        as enum ('whatsapp','instagram_lead_ad','facebook_lead_ad','site','indicacao','evento','manual');
create type lead_status        as enum ('novo','em_atendimento','qualificado','descartado');
create type task_tipo          as enum ('ligacao','email','reuniao','whatsapp');
create type whatsapp_status    as enum ('conectado','desconectado','aguardando_qr','inativa');
create type message_direcao    as enum ('enviada','recebida');
create type message_tipo_midia as enum ('texto','audio','imagem','documento','sticker','localizacao');
create type message_status     as enum ('enviada','entregue','lida','falhou');
create type quote_status        as enum ('rascunho','aguardando_aprovacao_interna','aprovado_internamente','rejeitado_internamente','enviado_ao_cliente','aprovado_pelo_cliente','recusado_pelo_cliente');
create type order_status       as enum ('pendente','em_producao','pronto','enviado','entregue','concluido','cancelado');
create type conversa_status    as enum ('nao_atendida','em_atendimento','aguardando_cliente','finalizada');
create type distribuicao_modo  as enum ('manual','rotativo','por_carga');

-- ----------------------------------------------------------------------------
-- TABELAS (ordem de dependência)
-- ----------------------------------------------------------------------------
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  nome text not null, slug text unique not null,
  plano text not null default 'basico', ativo boolean not null default true,
  nome_fantasia text, cnpj text, logo_url text, telefone text, email text,
  endereco text, site text, instagram text,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id),
  nome text not null, email text not null unique, telefone text,
  cargo user_role not null default 'vendedor',
  disponivel boolean not null default true, ativo boolean not null default true,
  ultimo_status_em timestamptz,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);

create table health_hubs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text not null, logo_url text, status text not null default 'ativo',
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(),
  unique (organization_id, nome)
);

create table suppliers (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text not null, cnpj text, telefone text, email text, observacoes text,
  hub_id uuid references health_hubs(id),
  criado_em timestamptz not null default now()
);

create table supplier_categories (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  supplier_id uuid not null references suppliers(id) on delete cascade,
  nome text not null, criado_em timestamptz not null default now()
);

create table freight_carriers (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  supplier_id uuid not null references suppliers(id) on delete cascade,
  nome text not null, criado_em timestamptz not null default now(),
  unique (supplier_id, nome)
);

create table supplier_freight (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  supplier_id uuid not null references suppliers(id) on delete cascade,
  carrier_id uuid references freight_carriers(id) on delete cascade,
  regiao text not null, valor numeric(10,2) not null default 0,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(),
  unique (carrier_id, regiao)
);

create table products (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  supplier_id uuid references suppliers(id),
  category_id uuid references supplier_categories(id),
  nome text not null, descricao text,
  preco_unitario numeric(12,2) not null default 0, unidade text not null default 'un',
  ativo boolean not null default true,
  composicao text, apresentacao text, via_administracao text, embalagem text, grupo text, modo_uso text,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);

create table companies (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text not null, cnpj text, nome_fantasia text,
  inscricao_estadual text, inscricao_municipal text,
  site text, telefone text, endereco text,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);

create table contacts (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text not null, email text, telefone text, cargo text,
  empresa_id uuid references companies(id), responsavel_id uuid references profiles(id),
  foto_perfil_url text, observacoes text, endereco text, cpf_cnpj text,
  endereco_numero text, endereco_complemento text, endereco_bairro text,
  endereco_cep text, endereco_cidade text, endereco_estado text,
  tipo_pessoa text, categoria_cliente text,
  tipo_conselho text, numero_conselho text, uf_conselho text, especialidade text,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);

create table pipelines (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text not null, descricao text,
  padrao boolean not null default false, ativo boolean not null default true,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);

create table pipeline_stages (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  pipeline_id uuid not null references pipelines(id) on delete cascade,
  nome text not null, ordem int not null, cor text not null default '#6366f1',
  oculto boolean not null default false,
  tipo_especial text check (tipo_especial in ('fechado','perdido')),
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);

create table whatsapp_instances (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text not null, numero text, evolution_instance_name text unique,
  vendedor_id uuid references profiles(id), compartilhado boolean not null default false,
  status_conexao whatsapp_status not null default 'desconectado',
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);

create table leads (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text, email text, telefone text, empresa text,
  origem lead_origem not null default 'manual', status lead_status not null default 'novo',
  responsavel_id uuid references profiles(id), foto_perfil_url text,
  contato_anterior_id uuid references leads(id),
  whatsapp_instance_id uuid references whatsapp_instances(id),
  observacoes text, cpf_cnpj text, endereco text,
  ultima_interacao_em timestamptz,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
create unique index leads_org_telefone_unique on leads(organization_id, telefone) where telefone is not null;

create table deals (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  titulo text not null, valor_estimado numeric(12,2),
  contato_id uuid references contacts(id), responsavel_id uuid references profiles(id),
  pipeline_id uuid not null references pipelines(id), estagio_id uuid not null references pipeline_stages(id),
  lead_id uuid references leads(id),
  data_fechamento_prevista date, origem_lead lead_origem,
  motivo_perda text, ganho boolean, observacoes text,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
create unique index deals_lead_id_ativo_unique on deals(lead_id) where lead_id is not null and ganho is null;

create table conversations (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  whatsapp_instance_id uuid references whatsapp_instances(id),
  lead_id uuid references leads(id), contato_id uuid references contacts(id),
  deal_id uuid references deals(id),
  telefone_externo text not null,
  status conversa_status not null default 'nao_atendida',
  responsavel_id uuid references profiles(id),
  nao_lidas int not null default 0, arquivada_em timestamptz,
  nome_contato text, name_source text, whatsapp_push_name text,
  is_name_manually_edited boolean not null default false,
  ultima_mensagem_em timestamptz,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
create unique index conversations_org_telefone_unique on conversations(organization_id, telefone_externo);

create table messages (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  conversation_id uuid not null references conversations(id),
  message_id_externo text,
  direcao message_direcao not null, tipo_midia message_tipo_midia not null default 'texto',
  conteudo text, url_midia text, telefone_remetente text, telefone_destinatario text,
  responsavel_id uuid references profiles(id),
  status message_status not null default 'enviada',
  enviado_em timestamptz not null default now(), entregue_em timestamptz, lida_em timestamptz
);
create unique index messages_externo_unique on messages(organization_id, message_id_externo) where message_id_externo is not null;

create table tasks (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  titulo text not null, descricao text,
  tipo task_tipo not null default 'ligacao',
  data_vencimento timestamptz, concluida boolean not null default false,
  responsavel_id uuid not null references profiles(id),
  lead_id uuid references leads(id), contato_id uuid references contacts(id),
  deal_id uuid references deals(id),
  conversation_id uuid references conversations(id) on delete set null,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);

create table activities (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  tipo text not null, descricao text not null,
  lead_id uuid references leads(id), deal_id uuid references deals(id),
  contato_id uuid references contacts(id), autor_id uuid not null references profiles(id),
  criado_em timestamptz not null default now()
);

create table message_templates (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text not null, conteudo text not null, categoria text,
  criado_por uuid not null references profiles(id),
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);

create table conversation_exports (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  conversation_id uuid not null references conversations(id), lead_id uuid references leads(id),
  exportado_por uuid not null references profiles(id),
  formato text not null check (formato in ('png','txt')),
  periodo_inicio timestamptz, periodo_fim timestamptz, total_mensagens int,
  criado_em timestamptz not null default now()
);

create table conversation_tags (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text not null, cor text not null default '#6366f1',
  criado_em timestamptz not null default now(), unique (organization_id, nome)
);
create table conversation_tag_links (
  conversation_id uuid not null references conversations(id) on delete cascade,
  tag_id uuid not null references conversation_tags(id) on delete cascade,
  criado_em timestamptz not null default now(), primary key (conversation_id, tag_id)
);
create table conversation_notes (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  conversation_id uuid not null references conversations(id) on delete cascade,
  autor_id uuid not null references profiles(id), conteudo text not null,
  criado_em timestamptz not null default now()
);
create table conversation_transfers (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  conversation_id uuid not null references conversations(id) on delete cascade,
  de_usuario_id uuid references profiles(id), para_usuario_id uuid not null references profiles(id),
  motivo text, criado_em timestamptz not null default now()
);

create table deal_stage_logs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  deal_id uuid not null references deals(id) on delete cascade,
  usuario_id uuid not null references profiles(id),
  estagio_anterior_id uuid references pipeline_stages(id),
  estagio_novo_id uuid not null references pipeline_stages(id),
  criado_em timestamptz not null default now()
);

create table quotes (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  numero serial,
  lead_id uuid references leads(id), deal_id uuid references deals(id),
  contato_id uuid references contacts(id), responsavel_id uuid not null references profiles(id),
  supplier_id uuid references suppliers(id), carrier_id uuid references freight_carriers(id) on delete set null,
  status quote_status not null default 'rascunho',
  valor_subtotal numeric(12,2) not null default 0, desconto_geral numeric(5,2) not null default 0,
  valor_total numeric(12,2) not null default 0,
  frete numeric(12,2) default 0, frete_regiao text,
  endereco_entrega text, forma_pagamento text,
  aprovacao_interna_por uuid references profiles(id), aprovacao_interna_em timestamptz, aprovacao_interna_comentario text,
  validade_em date, cliente_aprovado_em timestamptz, cliente_recusado_em timestamptz,
  vendedor_confirmado_em timestamptz, ultima_alteracao_validada_em timestamptz,
  aprovado_cliente_em timestamptz, aprovado_cliente_por uuid references profiles(id),
  nota_tipo_pessoa text, nota_nome text, nota_documento text, nota_razao_social text,
  nota_nome_fantasia text, nota_endereco text, nota_ie text, nota_im text,
  observacoes text,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
create table quote_items (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid not null references quotes(id) on delete cascade,
  product_id uuid references products(id),
  descricao text not null, quantidade numeric(10,3) not null default 1,
  preco_unitario numeric(12,2) not null, desconto_item numeric(5,2) not null default 0,
  subtotal numeric(12,2) not null
);
create table quote_tokens (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid not null references quotes(id) on delete cascade,
  token_hash text not null,
  status text not null default 'pendente' check (status in ('pendente','aprovado','recusado','expirado','revogado')),
  cliente_ip inet, cliente_ua text,
  criado_em timestamptz default now(), expira_em timestamptz not null, usado_em timestamptz
);
create unique index idx_quote_tokens_unique_pendente on quote_tokens(quote_id) where status = 'pendente';

create table orders (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  numero integer,
  quote_id uuid not null references quotes(id),
  lead_id uuid references leads(id), contato_id uuid references contacts(id), deal_id uuid references deals(id),
  responsavel_id uuid not null references profiles(id),
  supplier_id uuid references suppliers(id), carrier_id uuid references freight_carriers(id) on delete set null,
  status order_status not null default 'pendente',
  valor_total numeric(12,2) not null default 0, desconto_geral numeric(5,2) not null default 0,
  frete numeric(12,2) not null default 0, frete_regiao text,
  observacoes text, endereco_entrega text, forma_pagamento text,
  motivo_cancelamento text, cancelado_por uuid references profiles(id),
  cancelado_em timestamptz, concluido_em timestamptz,
  nota_tipo_pessoa text, nota_nome text, nota_documento text, nota_razao_social text,
  nota_nome_fantasia text, nota_endereco text, nota_ie text, nota_im text,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  descricao text not null, quantidade numeric(10,3) not null default 1,
  preco_unitario numeric(12,2) not null, desconto_item numeric(5,2) not null default 0,
  subtotal numeric(12,2) not null
);
create table order_status_history (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  order_id uuid not null references orders(id) on delete cascade,
  status_anterior order_status, status_novo order_status not null,
  observacao text, autor_id uuid not null references profiles(id),
  criado_em timestamptz not null default now()
);
create table pedido_audit_logs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  order_id uuid not null references orders(id) on delete cascade,
  quote_id uuid references quotes(id),
  usuario_id uuid not null references profiles(id), administrador_id uuid references profiles(id),
  acao text not null, campos_alterados jsonb, dados_anteriores jsonb, dados_novos jsonb,
  motivo text, ip text, sessao text,
  criado_em timestamptz not null default now()
);

create table lead_distribution_config (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid unique not null references organizations(id),
  modo distribuicao_modo not null default 'manual',
  apenas_disponiveis boolean not null default false, limite_por_vendedor int,
  proximo_vendedor_idx int not null default 0,
  atualizado_por uuid references profiles(id), atualizado_em timestamptz not null default now()
);
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  usuario_id uuid references profiles(id),
  acao text not null, tabela_afetada text, registro_id uuid,
  dados_anteriores jsonb, dados_novos jsonb, ip text,
  criado_em timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- FUNÇÕES (helpers de RLS, RPCs usadas, util)
-- ----------------------------------------------------------------------------
create or replace function get_organization_id() returns uuid
  language sql stable security definer set search_path = public as $$
  select organization_id from profiles where id = auth.uid() $$;

create or replace function get_user_role() returns user_role
  language sql stable security definer set search_path = public as $$
  select cargo from profiles where id = auth.uid() $$;

create or replace function normalize_phone(phone text) returns text
  language plpgsql immutable as $$
declare digits text;
begin
  if phone is null then return null; end if;
  digits := regexp_replace(phone, '[^0-9]', '', 'g');
  if length(digits) >= 12 and left(digits,2) = '55' then digits := substring(digits from 3); end if;
  return digits;
end; $$;
create index if not exists idx_contacts_phone_normalized on contacts (normalize_phone(telefone));
create index if not exists idx_leads_phone_normalized on leads (normalize_phone(telefone));

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
    case when new.raw_user_meta_data->>'cargo' in ('admin','gestor','vendedor','atendimento','financeiro','suporte')
      then (new.raw_user_meta_data->>'cargo')::user_role else 'vendedor'::user_role end);
  return new;
end; $$;

create or replace function selecionar_proximo_vendedor(p_config_id uuid, p_total_vendedores int)
  returns int language plpgsql security definer set search_path = public as $$
declare v_idx int;
begin
  update lead_distribution_config set proximo_vendedor_idx = proximo_vendedor_idx + 1
  where id = p_config_id returning proximo_vendedor_idx - 1 into v_idx;
  return v_idx % p_total_vendedores;
end; $$;

create or replace function trocar_ordem_etapas(p_etapa_a uuid, p_etapa_b uuid, p_org_id uuid)
  returns void language plpgsql security definer set search_path = public as $$
declare v_a int; v_b int;
begin
  select ordem into v_a from pipeline_stages where id=p_etapa_a and organization_id=p_org_id;
  select ordem into v_b from pipeline_stages where id=p_etapa_b and organization_id=p_org_id;
  if v_a is null or v_b is null then raise exception 'Etapa não encontrada'; end if;
  update pipeline_stages set ordem=v_b, atualizado_em=now() where id=p_etapa_a and organization_id=p_org_id;
  update pipeline_stages set ordem=v_a, atualizado_em=now() where id=p_etapa_b and organization_id=p_org_id;
end; $$;

create or replace function ultimas_mensagens_por_conversa(p_conversation_ids uuid[], p_org_id uuid)
  returns table(conversation_id uuid, conteudo text)
  language sql security definer set search_path = public stable as $$
  select distinct on (m.conversation_id) m.conversation_id, m.conteudo
  from messages m
  where m.conversation_id = any(p_conversation_ids) and m.organization_id = p_org_id
  order by m.conversation_id, m.enviado_em desc; $$;

create or replace function mensagens_nao_respondidas(p_org_id uuid, p_limit int default 50)
  returns table(conversa_id uuid, telefone_externo text, lead_nome text, lead_id uuid, conteudo text, enviado_em timestamptz)
  language sql security definer set search_path = public stable as $$
  select c.id, c.telefone_externo, l.nome, l.id, m.conteudo, m.enviado_em
  from conversations c
  join lateral (
    select m1.conteudo, m1.enviado_em from messages m1
    where m1.conversation_id = c.id and m1.direcao = 'recebida'
    order by m1.enviado_em desc limit 1
  ) m on true
  left join leads l on l.id = c.lead_id
  where c.organization_id = p_org_id
    and not exists (select 1 from messages m2 where m2.conversation_id = c.id and m2.direcao='enviada' and m2.enviado_em > m.enviado_em)
  order by m.enviado_em desc limit p_limit; $$;

create or replace function metricas_atendimento_whatsapp(
  p_org_id uuid, p_inicio timestamptz default now() - interval '30 days', p_fim timestamptz default now())
  returns table(vendedor_id uuid, vendedor_nome text, total_conversas bigint, conversas_finalizadas bigint,
    conversas_sem_resposta bigint, tempo_medio_primeira_resposta_min numeric, total_mensagens_enviadas bigint)
  language sql security definer set search_path = public stable as $$
  with validacao as (select 1 where p_org_id = (select organization_id from profiles where id = auth.uid())),
  conversas_periodo as (
    select c.id, c.responsavel_id, c.status, c.criado_em from conversations c, validacao
    where c.organization_id = p_org_id and c.criado_em between p_inicio and p_fim and c.responsavel_id is not null),
  primeira_resposta as (
    select cp.id as conversation_id, cp.responsavel_id,
      (select min(m.enviado_em) from messages m where m.conversation_id=cp.id and m.organization_id=p_org_id and m.direcao='recebida') as primeira_msg_recebida,
      (select min(m.enviado_em) from messages m where m.conversation_id=cp.id and m.organization_id=p_org_id and m.direcao='enviada') as primeira_resposta_enviada
    from conversas_periodo cp),
  msgs_enviadas as (
    select m.responsavel_id, count(*) as total from messages m, validacao
    where m.organization_id=p_org_id and m.direcao='enviada' and m.enviado_em between p_inicio and p_fim and m.responsavel_id is not null
    group by m.responsavel_id)
  select p.id, p.nome,
    count(distinct cp.id),
    count(distinct cp.id) filter (where cp.status='finalizada'),
    count(distinct cp.id) filter (where cp.status='nao_atendida'),
    round(avg(case when pr.primeira_resposta_enviada is not null and pr.primeira_msg_recebida is not null
      then extract(epoch from (pr.primeira_resposta_enviada - pr.primeira_msg_recebida))/60 else null end)::numeric,1),
    coalesce(me.total,0)
  from profiles p
  left join conversas_periodo cp on cp.responsavel_id = p.id
  left join primeira_resposta pr on pr.conversation_id = cp.id
  left join msgs_enviadas me on me.responsavel_id = p.id
  where p.organization_id=p_org_id and p.ativo=true and p.cargo in ('vendedor','atendimento','gestor','admin')
    and exists (select 1 from validacao)
  group by p.id, p.nome, me.total order by count(distinct cp.id) desc; $$;

create or replace function fn_atualizar_nao_lidas_conversa() returns trigger language plpgsql as $$
begin
  if new.direcao = 'recebida' then
    update conversations set nao_lidas=nao_lidas+1, ultima_mensagem_em=new.enviado_em, atualizado_em=now() where id=new.conversation_id;
  elsif new.direcao = 'enviada' then
    update conversations set nao_lidas=0, ultima_mensagem_em=new.enviado_em,
      status = case when status='nao_atendida'::conversa_status then 'em_atendimento'::conversa_status else status end,
      atualizado_em=now() where id=new.conversation_id;
  end if;
  return new;
end; $$;

create or replace function convert_orcamento_to_pedido(p_quote_id uuid, p_motivo text default null, p_user_id uuid default null)
  returns table(success boolean, order_id uuid, order_numero integer, message text)
  language plpgsql security definer set search_path to 'public' as $function$
declare v_user_id uuid; v_profile record; v_order_id uuid; v_order_numero integer;
begin
  v_user_id := coalesce(auth.uid(), p_user_id);
  if v_user_id is null then return query select false, null::uuid, null::integer, 'Usuario nao autenticado'; return; end if;
  select id, organization_id, cargo into v_profile from profiles where id = v_user_id;
  if v_profile is null then return query select false, null::uuid, null::integer, 'Perfil nao encontrado'; return; end if;
  if not exists (select 1 from quotes where id=p_quote_id and organization_id=v_profile.organization_id) then
    return query select false, null::uuid, null::integer, 'Orcamento nao encontrado'; return; end if;
  if (select status from quotes where id=p_quote_id) != 'aprovado_pelo_cliente' then
    return query select false, null::uuid, null::integer, 'Apenas orcamentos com status aprovado_pelo_cliente podem ser convertidos'; return; end if;
  if exists (select 1 from orders where quote_id=p_quote_id) then
    return query select false, null::uuid, null::integer, 'Ja existe um pedido para este orcamento'; return; end if;
  if not exists (select 1 from quote_items where quote_id=p_quote_id) then
    return query select false, null::uuid, null::integer, 'Orcamento sem itens'; return; end if;
  perform 1 from quotes where id=p_quote_id for update;
  insert into orders (organization_id, quote_id, lead_id, contato_id, deal_id, responsavel_id, supplier_id, carrier_id,
    status, valor_total, desconto_geral, frete, frete_regiao, observacoes, endereco_entrega, forma_pagamento,
    nota_tipo_pessoa, nota_nome, nota_documento, nota_razao_social, nota_nome_fantasia, nota_endereco, nota_ie, nota_im)
  select v_profile.organization_id, p_quote_id, lead_id, contato_id, deal_id, responsavel_id, supplier_id, carrier_id,
    'pendente', valor_total, desconto_geral, coalesce(frete,0), frete_regiao, observacoes, endereco_entrega, forma_pagamento,
    nota_tipo_pessoa, nota_nome, nota_documento, nota_razao_social, nota_nome_fantasia, nota_endereco, nota_ie, nota_im
  from quotes where id=p_quote_id returning id, numero into v_order_id, v_order_numero;
  insert into order_items (order_id, product_id, descricao, quantidade, preco_unitario, desconto_item, subtotal)
  select v_order_id, product_id, descricao, quantidade, preco_unitario, desconto_item, subtotal from quote_items where quote_id=p_quote_id;
  insert into order_status_history (organization_id, order_id, status_anterior, status_novo, observacao, autor_id)
  values (v_profile.organization_id, v_order_id, null, 'pendente', 'Pedido gerado a partir do orcamento' || coalesce(' - '||p_motivo,''), v_user_id);
  insert into activities (organization_id, tipo, descricao, lead_id, deal_id, contato_id, autor_id)
  select v_profile.organization_id, 'pedido_gerado', 'Pedido gerado a partir do orcamento' || coalesce('. Motivo: '||p_motivo,''),
    lead_id, deal_id, contato_id, v_user_id from quotes where id=p_quote_id;
  update quotes set aprovado_cliente_em=coalesce(aprovado_cliente_em, now()),
    aprovado_cliente_por=coalesce(aprovado_cliente_por, v_user_id), atualizado_em=now() where id=p_quote_id;
  return query select true, v_order_id, v_order_numero, 'Pedido gerado com sucesso';
exception when others then return query select false, null::uuid, null::integer, 'Erro: ' || SQLERRM;
end; $function$;
grant execute on function convert_orcamento_to_pedido(uuid, text, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------------------
create trigger on_auth_user_created after insert on auth.users for each row execute procedure handle_new_user();
create trigger trg_atualizar_nao_lidas after insert on messages for each row execute function fn_atualizar_nao_lidas_conversa();

-- ----------------------------------------------------------------------------
-- ÍNDICES (FKs / consultas)
-- ----------------------------------------------------------------------------
create index on profiles(organization_id);
create index on suppliers(organization_id);
create index on supplier_categories(organization_id, supplier_id);
create index on freight_carriers(organization_id);
create index on supplier_freight(organization_id);
create index on products(organization_id);
create index on products(supplier_id);
create index on companies(organization_id);
create index on contacts(organization_id);
create index on contacts(empresa_id);
create index on contacts(responsavel_id);
create index on contacts(categoria_cliente);
create index on leads(organization_id, status);
create index on leads(organization_id, responsavel_id);
create index on deals(organization_id, estagio_id);
create index on deals(lead_id);
create index on deals(contato_id);
create index on deals(pipeline_id);
create index on tasks(organization_id, responsavel_id, concluida);
create index on tasks(data_vencimento) where concluida = false;
create index on tasks(conversation_id) where conversation_id is not null;
create index on activities(organization_id, lead_id);
create index on activities(organization_id, deal_id);
create index on activities(contato_id);
create index on conversations(organization_id, status);
create index on conversations(lead_id);
create index on conversations(whatsapp_instance_id);
create index on conversations(deal_id);
create index on messages(conversation_id, enviado_em);
create index on messages(organization_id);
create index on quotes(organization_id);
create index on quotes(lead_id);
create index on quotes(contato_id);
create index on quote_items(quote_id);
create index on quote_tokens(quote_id);
create index on orders(organization_id, status);
create index on orders(quote_id);
create index on order_items(order_id);
create index on order_items(product_id);
create index on order_status_history(order_id);
create index on pedido_audit_logs(order_id);
create index on audit_logs(organization_id, criado_em desc);
create index on deal_stage_logs(deal_id, criado_em desc);

-- ----------------------------------------------------------------------------
-- RLS (modelo PLANO atual: isolamento por organization_id)
-- ----------------------------------------------------------------------------
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table leads enable row level security;
alter table contacts enable row level security;
alter table companies enable row level security;
alter table pipelines enable row level security;
alter table pipeline_stages enable row level security;
alter table deals enable row level security;
alter table tasks enable row level security;
alter table activities enable row level security;
alter table whatsapp_instances enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table message_templates enable row level security;
alter table conversation_exports enable row level security;
alter table conversation_tags enable row level security;
alter table conversation_tag_links enable row level security;
alter table conversation_notes enable row level security;
alter table conversation_transfers enable row level security;
alter table deal_stage_logs enable row level security;
alter table products enable row level security;
alter table suppliers enable row level security;
alter table supplier_categories enable row level security;
alter table supplier_freight enable row level security;
alter table freight_carriers enable row level security;
alter table health_hubs enable row level security;
alter table quotes enable row level security;
alter table quote_items enable row level security;
alter table quote_tokens enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_status_history enable row level security;
alter table pedido_audit_logs enable row level security;
alter table lead_distribution_config enable row level security;
alter table audit_logs enable row level security;

-- organizations: leitura por membros; update por membro
create policy "ver organizacoes" on organizations for select using (id = get_organization_id());
create policy "atualizar organizacao" on organizations for update using (id = get_organization_id());

-- tabelas com isolamento direto por organization_id (FOR ALL)
create policy "p_profiles" on profiles for all using (organization_id = get_organization_id());
create policy "p_leads" on leads for all using (organization_id = get_organization_id());
create policy "p_contacts" on contacts for all using (organization_id = get_organization_id());
create policy "p_companies" on companies for all using (organization_id = get_organization_id());
create policy "p_pipelines" on pipelines for all using (organization_id = get_organization_id());
create policy "p_pipeline_stages" on pipeline_stages for all using (organization_id = get_organization_id());
create policy "p_deals" on deals for all using (organization_id = get_organization_id());
create policy "p_tasks" on tasks for all using (organization_id = get_organization_id());
create policy "p_whatsapp_instances" on whatsapp_instances for all using (organization_id = get_organization_id());
create policy "p_conversations" on conversations for all using (organization_id = get_organization_id());
create policy "p_messages" on messages for all using (organization_id = get_organization_id());
create policy "p_message_templates" on message_templates for all using (organization_id = get_organization_id());
create policy "p_conversation_exports" on conversation_exports for all using (organization_id = get_organization_id());
create policy "p_conversation_tags" on conversation_tags for all using (organization_id = get_organization_id());
create policy "p_conversation_notes" on conversation_notes for all using (organization_id = get_organization_id());
create policy "p_conversation_transfers" on conversation_transfers for all using (organization_id = get_organization_id());
create policy "p_deal_stage_logs" on deal_stage_logs for all using (organization_id = get_organization_id());
create policy "p_products" on products for all using (organization_id = get_organization_id());
create policy "p_suppliers" on suppliers for all using (organization_id = get_organization_id());
create policy "p_supplier_categories" on supplier_categories for all using (organization_id = get_organization_id());
create policy "p_supplier_freight" on supplier_freight for all using (organization_id = get_organization_id());
create policy "p_freight_carriers" on freight_carriers for all using (organization_id = get_organization_id());
create policy "p_health_hubs" on health_hubs for all using (organization_id = get_organization_id());
create policy "p_quotes" on quotes for all using (organization_id = get_organization_id());
create policy "p_orders" on orders for all using (organization_id = get_organization_id());
create policy "p_order_status_history" on order_status_history for all using (organization_id = get_organization_id());
create policy "p_pedido_audit_logs" on pedido_audit_logs for all using (organization_id = get_organization_id());
create policy "p_lead_distribution_config" on lead_distribution_config for all using (organization_id = get_organization_id());

-- atividades: inserir + ver (imutável)
create policy "p_activities_insert" on activities for insert with check (organization_id = get_organization_id());
create policy "p_activities_select" on activities for select using (organization_id = get_organization_id());

-- audit_logs: inserir + ver (imutável)
create policy "p_audit_insert" on audit_logs for insert with check (organization_id = get_organization_id());
create policy "p_audit_select" on audit_logs for select using (organization_id = get_organization_id());

-- filhos: escopo via tabela-pai
create policy "p_quote_items" on quote_items for all using (
  quote_id in (select id from quotes where organization_id = get_organization_id()));
create policy "p_quote_tokens" on quote_tokens for all using (
  quote_id in (select id from quotes where organization_id = get_organization_id()));
create policy "p_order_items" on order_items for all using (
  exists (select 1 from orders o where o.id = order_items.order_id and o.organization_id = get_organization_id()));
create policy "p_conversation_tag_links" on conversation_tag_links for all using (
  exists (select 1 from conversations c where c.id = conversation_tag_links.conversation_id and c.organization_id = get_organization_id()));

-- ----------------------------------------------------------------------------
-- STORAGE BUCKETS (mantém comportamento atual; privatização vem no Migrate M8)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('whatsapp-media','whatsapp-media',true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('public-assets','public-assets',true) on conflict (id) do nothing;
create policy "leitura publica whatsapp media" on storage.objects for select using (bucket_id = 'whatsapp-media');
create policy "leitura publica public-assets" on storage.objects for select using (bucket_id = 'public-assets');

-- =============================================================================
-- FIM — compat-v0
-- =============================================================================
