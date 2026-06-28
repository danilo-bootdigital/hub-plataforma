-- =============================================================================
-- HUB PLATAFORMA — BASELINE 001 (PROPOSTA — NÃO APLICAR AINDA)
-- =============================================================================
-- Squash limpo e consolidado das 55 migrations históricas + domínio oficial:
--   Indústria → Carteiras → Hub (autorização) → Equipe → Cliente
--   Catálogo: Categorias → Subcategorias → Produtos (catálogo único)
-- NÃO contém: backfills, correções históricas, dados operacionais, duplicatas.
-- As 55 migrations antigas ficam arquivadas (referência), não são aplicadas.
-- Validar com `supabase db reset` em ambiente local antes de promover.
-- =============================================================================

create extension if not exists "uuid-ossp";

-- =============================================================================
-- 1. ENUMS
-- =============================================================================
create type acesso_escopo       as enum ('plataforma','industria','hub');
create type carteira_status     as enum ('ativa','inativa');
create type hub_status          as enum ('ativo','inativo');
create type user_role           as enum ('admin','gestor','vendedor','atendimento','financeiro','suporte');
create type lead_origem         as enum ('whatsapp','instagram_lead_ad','facebook_lead_ad','site','indicacao','evento','manual');
create type lead_status         as enum ('novo','em_atendimento','qualificado','descartado');
create type task_tipo           as enum ('ligacao','email','reuniao','whatsapp');
create type whatsapp_status     as enum ('conectado','desconectado','aguardando_qr','inativa');
create type message_direcao     as enum ('enviada','recebida');
create type message_tipo_midia  as enum ('texto','audio','imagem','documento','sticker','localizacao');
create type message_status      as enum ('enviada','entregue','lida','falhou');
create type quote_status        as enum ('rascunho','aguardando_aprovacao_interna','aprovado_internamente','rejeitado_internamente','enviado_ao_cliente','aprovado_pelo_cliente','recusado_pelo_cliente');
create type order_status        as enum ('pendente','em_producao','pronto','enviado','entregue','concluido','cancelado');
create type conversa_status     as enum ('nao_atendida','em_atendimento','aguardando_cliente','finalizada');
create type distribuicao_modo   as enum ('manual','rotativo','por_carga');

-- =============================================================================
-- 2. NÚCLEO: INDÚSTRIA, HUB, USUÁRIOS, CARTEIRA
-- =============================================================================

create table organizations (             -- INDÚSTRIA (tenant raiz)
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  slug text unique not null,
  plano text not null default 'basico',
  ativo boolean not null default true,
  nome_fantasia text, cnpj text, logo_url text,
  telefone text, email text, endereco text, site text, instagram text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table profiles (                   -- USUÁRIO (escopo + cargo + vínculo de Hub)
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id),
  hub_id uuid,                            -- FK adicionada após hubs (ver §2.1)
  escopo acesso_escopo not null default 'hub',
  nome text not null,
  email text not null unique,
  telefone text,
  cargo user_role not null default 'vendedor',
  disponivel boolean not null default true,
  ativo boolean not null default true,
  ultimo_status_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint chk_escopo_hub check (
    (escopo = 'hub' and hub_id is not null) or
    (escopo in ('plataforma','industria') and hub_id is null)
  )
);

create table hubs (                       -- HUB (operação comercial autorizada)
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text not null,
  status hub_status not null default 'ativo',
  codigo text,
  cnpj text,
  responsavel_nome text,
  responsavel_id uuid,                    -- FK adicionada após (ver §2.1)
  email text, telefone text, endereco text,
  criado_por uuid, atualizado_por uuid,   -- FK adicionada após (ver §2.1)
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (organization_id, codigo)
);

-- §2.1 — FKs cruzadas profiles <-> hubs (resolve dependência circular)
alter table profiles add constraint profiles_hub_fk      foreign key (hub_id) references hubs(id);
alter table hubs add constraint hubs_responsavel_fk       foreign key (responsavel_id) references profiles(id);
alter table hubs add constraint hubs_criado_por_fk        foreign key (criado_por) references profiles(id);
alter table hubs add constraint hubs_atualizado_por_fk    foreign key (atualizado_por) references profiles(id);

create table carteiras (                  -- CARTEIRA (entidade de negócio da Indústria)
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  hub_id uuid references hubs(id),        -- AUTORIZAÇÃO operacional atual (NULL = sem Hub)
  nome text not null,
  codigo text not null,
  status carteira_status not null default 'ativa',
  descricao text,
  observacoes text,
  criado_por uuid references profiles(id),
  atualizado_por uuid references profiles(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (organization_id, nome),
  unique (organization_id, codigo)
);
create index on hubs(organization_id);
create index on profiles(organization_id);
create index on profiles(hub_id);
create index on carteiras(organization_id);
create index on carteiras(hub_id);

-- =============================================================================
-- 3. CATÁLOGO: CATEGORIAS → SUBCATEGORIAS → PRODUTOS (catálogo único)
-- =============================================================================
create table categorias (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text not null,
  ordem int not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (organization_id, nome)
);

create table subcategorias (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  categoria_id uuid not null references categorias(id) on delete cascade,
  nome text not null,
  ordem int not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (categoria_id, nome)
);

create table suppliers (                  -- FORNECEDOR (origem comercial)
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text not null,
  cnpj text, telefone text, email text, observacoes text,
  criado_em timestamptz not null default now()
);

create table freight_carriers (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  supplier_id uuid not null references suppliers(id) on delete cascade,
  nome text not null,
  criado_em timestamptz not null default now(),
  unique (supplier_id, nome)
);

create table supplier_freight (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  supplier_id uuid not null references suppliers(id) on delete cascade,
  carrier_id uuid references freight_carriers(id) on delete cascade,
  regiao text not null,
  valor numeric(10,2) not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (carrier_id, regiao)
);

create table products (                   -- PRODUTO (lista oficial da Indústria)
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  subcategoria_id uuid references subcategorias(id),
  supplier_id uuid references suppliers(id),
  nome text not null,
  descricao text,
  laboratorio text,
  preco_unitario numeric(12,2) not null default 0,
  unidade text not null default 'un',
  ativo boolean not null default true,
  composicao text, apresentacao text, via_administracao text,
  embalagem text, grupo text, modo_uso text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index on categorias(organization_id);
create index on subcategorias(categoria_id);
create index on suppliers(organization_id);
create index on freight_carriers(organization_id);
create index on supplier_freight(organization_id);
create index on products(organization_id);
create index on products(subcategoria_id);
create index on products(supplier_id);

-- =============================================================================
-- 4. CRM: LEADS, EMPRESAS, CLIENTES, PIPELINE, DEALS
-- =============================================================================
create table companies (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text not null,
  cnpj text, nome_fantasia text, inscricao_estadual text, inscricao_municipal text,
  site text, telefone text, endereco text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table contacts (                   -- CLIENTE (pertence à Indústria; 1 carteira)
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  carteira_id uuid references carteiras(id),
  nome text not null,
  email text, telefone text, cargo text,
  empresa_id uuid references companies(id),
  responsavel_id uuid references profiles(id),
  foto_perfil_url text, observacoes text,
  cpf_cnpj text, endereco text,
  endereco_numero text, endereco_complemento text, endereco_bairro text,
  endereco_cep text, endereco_cidade text, endereco_estado text,
  tipo_pessoa text, categoria_cliente text,
  tipo_conselho text, numero_conselho text, uf_conselho text, especialidade text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table pipelines (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text not null, descricao text,
  padrao boolean not null default false, ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table pipeline_stages (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  pipeline_id uuid not null references pipelines(id) on delete cascade,
  nome text not null, ordem int not null, cor text not null default '#6366f1',
  oculto boolean not null default false,
  tipo_especial text check (tipo_especial in ('fechado','perdido')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table whatsapp_instances (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text not null, numero text,
  evolution_instance_name text unique,
  vendedor_id uuid references profiles(id),
  compartilhado boolean not null default false,
  status_conexao whatsapp_status not null default 'desconectado',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table leads (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  carteira_id uuid references carteiras(id),
  nome text, email text, telefone text, empresa text,
  origem lead_origem not null default 'manual',
  status lead_status not null default 'novo',
  responsavel_id uuid references profiles(id),
  foto_perfil_url text,
  contato_anterior_id uuid references leads(id),
  whatsapp_instance_id uuid references whatsapp_instances(id),
  observacoes text, cpf_cnpj text, endereco text,
  ultima_interacao_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index leads_org_telefone_unique on leads(organization_id, telefone) where telefone is not null;

create table deals (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  carteira_id uuid references carteiras(id),
  titulo text not null, valor_estimado numeric(12,2),
  contato_id uuid references contacts(id),
  responsavel_id uuid references profiles(id),
  pipeline_id uuid not null references pipelines(id),
  estagio_id uuid not null references pipeline_stages(id),
  lead_id uuid references leads(id),
  data_fechamento_prevista date, origem_lead lead_origem,
  motivo_perda text, ganho boolean, observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index deals_lead_id_ativo_unique on deals(lead_id) where lead_id is not null and ganho is null;

create table conversations (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  carteira_id uuid references carteiras(id),
  whatsapp_instance_id uuid references whatsapp_instances(id),
  lead_id uuid references leads(id),
  contato_id uuid references contacts(id),
  deal_id uuid references deals(id),
  telefone_externo text not null,
  status conversa_status not null default 'nao_atendida',
  responsavel_id uuid references profiles(id),
  nao_lidas int not null default 0,
  arquivada_em timestamptz,
  nome_contato text, name_source text, whatsapp_push_name text,
  is_name_manually_edited boolean not null default false,
  ultima_mensagem_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index conversations_org_telefone_unique on conversations(organization_id, telefone_externo);

create table tasks (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  carteira_id uuid references carteiras(id),
  titulo text not null, descricao text,
  tipo task_tipo not null default 'ligacao',
  data_vencimento timestamptz, concluida boolean not null default false,
  responsavel_id uuid not null references profiles(id),
  lead_id uuid references leads(id),
  contato_id uuid references contacts(id),
  deal_id uuid references deals(id),
  conversation_id uuid references conversations(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table activities (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  carteira_id uuid references carteiras(id),
  tipo text not null, descricao text not null,
  lead_id uuid references leads(id),
  deal_id uuid references deals(id),
  contato_id uuid references contacts(id),
  autor_id uuid not null references profiles(id),
  criado_em timestamptz not null default now()
);

create table messages (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  carteira_id uuid references carteiras(id),
  conversation_id uuid not null references conversations(id),
  message_id_externo text,
  direcao message_direcao not null,
  tipo_midia message_tipo_midia not null default 'texto',
  conteudo text, url_midia text,
  telefone_remetente text, telefone_destinatario text,
  responsavel_id uuid references profiles(id),
  status message_status not null default 'enviada',
  enviado_em timestamptz not null default now(),
  entregue_em timestamptz, lida_em timestamptz
);
create unique index messages_externo_unique on messages(organization_id, message_id_externo) where message_id_externo is not null;

create table message_templates (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text not null, conteudo text not null, categoria text,
  criado_por uuid not null references profiles(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table conversation_tags (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text not null, cor text not null default '#6366f1',
  criado_em timestamptz not null default now(),
  unique (organization_id, nome)
);
create table conversation_tag_links (
  conversation_id uuid not null references conversations(id) on delete cascade,
  tag_id uuid not null references conversation_tags(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (conversation_id, tag_id)
);
create table conversation_notes (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  conversation_id uuid not null references conversations(id) on delete cascade,
  autor_id uuid not null references profiles(id),
  conteudo text not null,
  criado_em timestamptz not null default now()
);
create table conversation_transfers (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  conversation_id uuid not null references conversations(id) on delete cascade,
  de_usuario_id uuid references profiles(id),
  para_usuario_id uuid not null references profiles(id),
  motivo text, criado_em timestamptz not null default now()
);
create table conversation_exports (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  conversation_id uuid not null references conversations(id),
  lead_id uuid references leads(id),
  exportado_por uuid not null references profiles(id),
  formato text not null check (formato in ('png','txt')),
  periodo_inicio timestamptz, periodo_fim timestamptz, total_mensagens int,
  criado_em timestamptz not null default now()
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

-- índices CRM/operacional
create index on contacts(organization_id);
create index on contacts(carteira_id);
create index on contacts(empresa_id);
create index on contacts(responsavel_id);
create index on contacts(categoria_cliente);
create index on companies(organization_id);
create index on leads(organization_id, status);
create index on leads(carteira_id);
create index on deals(organization_id, estagio_id);
create index on deals(carteira_id);
create index on deals(lead_id);
create index on deals(contato_id);
create index on tasks(organization_id, responsavel_id, concluida);
create index on tasks(carteira_id);
create index on tasks(data_vencimento) where concluida = false;
create index on activities(organization_id, lead_id);
create index on activities(carteira_id);
create index on conversations(organization_id, status);
create index on conversations(carteira_id);
create index on conversations(whatsapp_instance_id);
create index on messages(conversation_id, enviado_em);
create index on messages(carteira_id);
create index on contacts (normalize_phone(telefone));   -- ver função §6 (criada antes via ordering? usa IMMUTABLE)
create index on deal_stage_logs(deal_id, criado_em desc);

-- =============================================================================
-- 5. ORÇAMENTOS, PEDIDOS, AUDITORIA, CONFIG
-- =============================================================================
create table quotes (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  carteira_id uuid references carteiras(id),
  numero serial,
  lead_id uuid references leads(id),
  deal_id uuid references deals(id),
  contato_id uuid references contacts(id),
  responsavel_id uuid not null references profiles(id),
  supplier_id uuid references suppliers(id),
  carrier_id uuid references freight_carriers(id) on delete set null,
  status quote_status not null default 'rascunho',
  valor_subtotal numeric(12,2) not null default 0,
  desconto_geral numeric(5,2) not null default 0,
  valor_total numeric(12,2) not null default 0,
  frete numeric(12,2) default 0, frete_regiao text,
  endereco_entrega text, forma_pagamento text,
  aprovacao_interna_por uuid references profiles(id),
  aprovacao_interna_em timestamptz, aprovacao_interna_comentario text,
  validade_em date,
  cliente_aprovado_em timestamptz, cliente_recusado_em timestamptz,
  vendedor_confirmado_em timestamptz, ultima_alteracao_validada_em timestamptz,
  aprovado_cliente_em timestamptz, aprovado_cliente_por uuid references profiles(id),
  nota_tipo_pessoa text, nota_nome text, nota_documento text,
  nota_razao_social text, nota_nome_fantasia text, nota_endereco text,
  nota_ie text, nota_im text,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create table quote_items (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid not null references quotes(id) on delete cascade,
  product_id uuid references products(id),
  descricao text not null,
  quantidade numeric(10,3) not null default 1,
  preco_unitario numeric(12,2) not null,
  desconto_item numeric(5,2) not null default 0,
  subtotal numeric(12,2) not null
);
create table quote_tokens (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid not null references quotes(id) on delete cascade,
  token_hash text not null,
  status text not null default 'pendente' check (status in ('pendente','aprovado','recusado','expirado','revogado')),
  cliente_ip inet, cliente_ua text,
  criado_em timestamptz default now(),
  expira_em timestamptz not null, usado_em timestamptz
);
create unique index idx_quote_tokens_unique_pendente on quote_tokens(quote_id) where status = 'pendente';

create table orders (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  carteira_id uuid references carteiras(id),
  numero integer,                          -- atribuído pela aplicação (espelha o orçamento)
  quote_id uuid not null references quotes(id),
  lead_id uuid references leads(id),
  contato_id uuid references contacts(id),
  deal_id uuid references deals(id),
  responsavel_id uuid not null references profiles(id),
  supplier_id uuid references suppliers(id),
  carrier_id uuid references freight_carriers(id) on delete set null,
  status order_status not null default 'pendente',
  valor_total numeric(12,2) not null default 0,
  desconto_geral numeric(5,2) not null default 0,
  frete numeric(12,2) not null default 0, frete_regiao text,
  observacoes text, endereco_entrega text, forma_pagamento text,
  motivo_cancelamento text, cancelado_por uuid references profiles(id),
  cancelado_em timestamptz, concluido_em timestamptz,
  nota_tipo_pessoa text, nota_nome text, nota_documento text,
  nota_razao_social text, nota_nome_fantasia text, nota_endereco text,
  nota_ie text, nota_im text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  descricao text not null,
  quantidade numeric(10,3) not null default 1,
  preco_unitario numeric(12,2) not null,
  desconto_item numeric(5,2) not null default 0,
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
  usuario_id uuid not null references profiles(id),
  administrador_id uuid references profiles(id),
  acao text not null, campos_alterados jsonb,
  dados_anteriores jsonb, dados_novos jsonb,
  motivo text, ip text, sessao text,
  criado_em timestamptz not null default now()
);

create table lead_distribution_config (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid unique not null references organizations(id),
  modo distribuicao_modo not null default 'manual',
  apenas_disponiveis boolean not null default false,
  limite_por_vendedor int, proximo_vendedor_idx int not null default 0,
  atualizado_por uuid references profiles(id),
  atualizado_em timestamptz not null default now()
);
create table system_config (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  chave text not null, valor text not null,
  tipo_valor text not null check (tipo_valor in ('texto','numero','booleano','json')),
  descricao text, atualizado_por uuid references profiles(id),
  atualizado_em timestamptz not null default now(),
  unique (organization_id, chave)
);
create table whatsapp_config (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null unique references organizations(id),
  max_tamanho_mensagem integer not null default 4096,
  tempo_retencao_midia integer not null default 30,
  max_tentativas_envio integer not null default 3,
  palavras_urgentes text[] not null default '{}',
  habilitar_cache_contatos boolean not null default true,
  tempo_cache_contatos integer not null default 300,
  rate_limit_por_minuto integer not null default 60,
  webhook_timeout integer not null default 15,
  habilitar_monitoramento boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  usuario_id uuid references profiles(id),
  acao text not null, tabela_afetada text, registro_id uuid,
  dados_anteriores jsonb, dados_novos jsonb, ip text,
  criado_em timestamptz not null default now()
);
create table carteira_transfer_logs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  carteira_id uuid not null references carteiras(id) on delete cascade,
  de_hub_id uuid references hubs(id), para_hub_id uuid references hubs(id),
  por_usuario_id uuid references profiles(id), motivo text,
  criado_em timestamptz not null default now()
);

create index on quotes(organization_id);
create index on quotes(carteira_id);
create index on quotes(contato_id);
create index on quote_items(quote_id);
create index on quote_tokens(quote_id);
create index on orders(organization_id, status);
create index on orders(carteira_id);
create index on orders(quote_id);
create index on order_items(order_id);
create index on order_items(product_id);
create index on order_status_history(order_id);
create index on pedido_audit_logs(order_id);
create index on carteira_transfer_logs(carteira_id, criado_em desc);
create index on audit_logs(organization_id, criado_em desc);

-- =============================================================================
-- 6. FUNÇÕES AUXILIARES (auth_*) + utilidades (SECURITY DEFINER / STABLE)
-- =============================================================================
create or replace function auth_org_id() returns uuid language sql stable security definer set search_path=public as $$
  select organization_id from profiles where id = auth.uid() $$;
create or replace function auth_escopo() returns acesso_escopo language sql stable security definer set search_path=public as $$
  select escopo from profiles where id = auth.uid() $$;
create or replace function auth_hub_id() returns uuid language sql stable security definer set search_path=public as $$
  select hub_id from profiles where id = auth.uid() $$;
create or replace function auth_cargo() returns user_role language sql stable security definer set search_path=public as $$
  select cargo from profiles where id = auth.uid() $$;
create or replace function auth_is_industria() returns boolean language sql stable security definer set search_path=public as $$
  select coalesce(escopo in ('plataforma','industria'), false) from profiles where id = auth.uid() $$;
create or replace function auth_carteiras_do_hub() returns setof uuid language sql stable security definer set search_path=public as $$
  select id from carteiras where hub_id = auth_hub_id() $$;

create or replace function normalize_phone(phone text) returns text language plpgsql immutable as $$
declare digits text;
begin
  if phone is null then return null; end if;
  digits := regexp_replace(phone, '[^0-9]', '', 'g');
  if length(digits) >= 12 and left(digits,2) = '55' then digits := substring(digits from 3); end if;
  return digits;
end; $$;

-- RPCs operacionais (versões finais)
create or replace function selecionar_proximo_vendedor(p_config_id uuid, p_total_vendedores int)
returns int language plpgsql security definer set search_path=public as $$
declare v_idx int;
begin
  update lead_distribution_config set proximo_vendedor_idx = proximo_vendedor_idx + 1
  where id = p_config_id returning proximo_vendedor_idx - 1 into v_idx;
  return v_idx % p_total_vendedores;
end; $$;

create or replace function trocar_ordem_etapas(p_etapa_a uuid, p_etapa_b uuid, p_org_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_a int; v_b int;
begin
  select ordem into v_a from pipeline_stages where id=p_etapa_a and organization_id=p_org_id;
  select ordem into v_b from pipeline_stages where id=p_etapa_b and organization_id=p_org_id;
  if v_a is null or v_b is null then raise exception 'Etapa não encontrada'; end if;
  update pipeline_stages set ordem=v_b, atualizado_em=now() where id=p_etapa_a and organization_id=p_org_id;
  update pipeline_stages set ordem=v_a, atualizado_em=now() where id=p_etapa_b and organization_id=p_org_id;
end; $$;

-- (mantidas as RPCs de leitura: ultimas_mensagens_por_conversa, mensagens_nao_respondidas,
--  conversas_sem_resposta, metricas_atendimento_whatsapp — corpos idênticos às migrations
--  005/006/018/019, omitidos aqui por brevidade; entram na baseline final.)

-- §6.1 — Domínio: transferir carteira de Hub (O(1), não toca clientes)
create or replace function transferir_carteira(p_carteira_id uuid, p_novo_hub_id uuid, p_motivo text default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_org uuid; v_hub_atual uuid;
begin
  if not auth_is_industria() then raise exception 'Apenas a Indústria pode transferir carteiras'; end if;
  select organization_id, hub_id into v_org, v_hub_atual from carteiras where id = p_carteira_id;
  if v_org is null then raise exception 'Carteira não encontrada'; end if;
  if v_org <> auth_org_id() then raise exception 'Carteira de outra organização'; end if;
  if p_novo_hub_id is not null and not exists (select 1 from hubs where id=p_novo_hub_id and organization_id=v_org)
    then raise exception 'Hub inválido para esta organização'; end if;
  update carteiras set hub_id = p_novo_hub_id, atualizado_em = now() where id = p_carteira_id;
  insert into carteira_transfer_logs(organization_id, carteira_id, de_hub_id, para_hub_id, por_usuario_id, motivo)
  values (v_org, p_carteira_id, v_hub_atual, p_novo_hub_id, auth.uid(), p_motivo);
end; $$;

-- §6.2 — Domínio: mover cliente de carteira (única operação que toca dados do cliente)
create or replace function mover_cliente_carteira(p_contato_id uuid, p_nova_carteira_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_org uuid; v_org_dest uuid;
begin
  if not auth_is_industria() then raise exception 'Apenas a Indústria pode mover clientes'; end if;
  select organization_id into v_org from contacts where id = p_contato_id;
  select organization_id into v_org_dest from carteiras where id = p_nova_carteira_id;
  if v_org is null or v_org_dest is null or v_org <> v_org_dest or v_org <> auth_org_id()
    then raise exception 'Cliente/carteira inválidos'; end if;
  update contacts      set carteira_id=p_nova_carteira_id, atualizado_em=now() where id=p_contato_id;
  update deals         set carteira_id=p_nova_carteira_id where contato_id=p_contato_id;
  update conversations set carteira_id=p_nova_carteira_id where contato_id=p_contato_id;
  update activities    set carteira_id=p_nova_carteira_id where contato_id=p_contato_id;
  update tasks         set carteira_id=p_nova_carteira_id where contato_id=p_contato_id;
  update quotes        set carteira_id=p_nova_carteira_id where contato_id=p_contato_id;
  update orders        set carteira_id=p_nova_carteira_id where contato_id=p_contato_id;
  update messages m set carteira_id=p_nova_carteira_id
    from conversations c where m.conversation_id=c.id and c.contato_id=p_contato_id;
end; $$;

-- §6.3 — Conversão de orçamento em pedido (versão final 051 + copia carteira_id)
-- (corpo idêntico a 051_update_rpc_copy_nota_fields, acrescentando carteira_id ao INSERT/SELECT.
--  Mantido na baseline final; omitido aqui por brevidade.)

-- =============================================================================
-- 7. TRIGGERS (finais)
-- =============================================================================
-- 7.1 — Preenche carteira_id da mensagem a partir da conversa (robustez webhook)
create or replace function fn_set_message_carteira() returns trigger language plpgsql as $$
begin
  if new.carteira_id is null then
    select carteira_id into new.carteira_id from conversations where id = new.conversation_id;
  end if;
  return new;
end; $$;
create trigger trg_set_message_carteira before insert on messages
  for each row execute function fn_set_message_carteira();

-- 7.2 — Sincroniza contador de não-lidas / status da conversa
create or replace function fn_atualizar_nao_lidas_conversa() returns trigger language plpgsql as $$
begin
  if new.direcao = 'recebida' then
    update conversations set nao_lidas=nao_lidas+1, ultima_mensagem_em=new.enviado_em, atualizado_em=now()
    where id=new.conversation_id;
  elsif new.direcao = 'enviada' then
    update conversations set nao_lidas=0, ultima_mensagem_em=new.enviado_em,
      status = case when status='nao_atendida'::conversa_status then 'em_atendimento'::conversa_status else status end,
      atualizado_em=now()
    where id=new.conversation_id;
  end if;
  return new;
end; $$;
create trigger trg_atualizar_nao_lidas after insert on messages
  for each row execute function fn_atualizar_nao_lidas_conversa();

-- NOTA: NÃO existe trigger on_auth_user_created. Sem cadastro público.
-- Usuários são provisionados server-side (service-role) definindo org + escopo + cargo + hub_id.

-- =============================================================================
-- 8. RLS — HABILITAÇÃO + POLICIES
-- =============================================================================
-- Padrões:
--   A) Indústria-owned: leitura por membros da org / escrita só Indústria
--   B) Operacional: org + (Indústria OU carteira_id ∈ carteiras do Hub)
--   C) Filho: via EXISTS no pai (herda escopo do pai)
-- (Bloco completo de ALTER ... ENABLE ROW LEVEL SECURITY + CREATE POLICY para TODAS
--  as tabelas segue o detalhamento da Matriz de RLS já aprovada. Resumo dos grupos:)
--   A: organizations(select org / update industria), hubs, carteiras, categorias,
--      subcategorias, products(select: industria OU ativo), suppliers, freight_carriers,
--      supplier_freight, pipelines, pipeline_stages, system_config,
--      lead_distribution_config, whatsapp_config, message_templates, conversation_tags
--   B: leads, contacts, deals, conversations, messages, quotes, orders, tasks, activities
--   C: quote_items, quote_tokens, order_items, order_status_history, pedido_audit_logs,
--      conversation_tag_links, conversation_notes, conversation_transfers,
--      conversation_exports, deal_stage_logs
--   D(especial): profiles (própria/industria/admin-hub do mesmo hub),
--      audit_logs (select industria; insert org; sem update/delete)
-- Exemplos canônicos:
--   create policy "products_ler" on products for select
--     using (organization_id = auth_org_id() and (auth_is_industria() or ativo = true));
--   create policy "products_gerir" on products for all
--     using (auth_is_industria()) with check (auth_is_industria() and organization_id = auth_org_id());
--   create policy "leads_acesso" on leads for all
--     using (organization_id = auth_org_id() and (auth_is_industria() or carteira_id in (select auth_carteiras_do_hub())))
--     with check (organization_id = auth_org_id() and (auth_is_industria() or carteira_id in (select auth_carteiras_do_hub())));
--   create policy "quote_items_acesso" on quote_items for all using (exists (
--     select 1 from quotes q where q.id = quote_items.quote_id and q.organization_id = auth_org_id()
--       and (auth_is_industria() or q.carteira_id in (select auth_carteiras_do_hub()))));

-- =============================================================================
-- 9. STORAGE BUCKETS
-- =============================================================================
-- whatsapp-media: PRIVADO (mídia confidencial de cliente; acesso via signed URLs/service-role)
insert into storage.buckets (id, name, public) values ('whatsapp-media','whatsapp-media',false)
  on conflict (id) do nothing;
-- public-assets: PÚBLICO (logos e assets não-sensíveis)
insert into storage.buckets (id, name, public) values ('public-assets','public-assets',true)
  on conflict (id) do nothing;
create policy "leitura publica public-assets" on storage.objects
  for select using (bucket_id = 'public-assets');
-- (NÃO inclui catalogo-materiais — fora da Baseline 001 por decisão oficial.)

-- =============================================================================
-- 10. SEED MÍNIMO DE BOOTSTRAP (1 Indústria + pipeline/etapas/config padrão)
-- =============================================================================
-- A organização representa a Indústria desta instalação (renomear no provisionamento).
insert into organizations (nome, slug) values ('Indústria', 'industria');

insert into pipelines (organization_id, nome, padrao)
  select id, 'Principal', true from organizations where slug = 'industria';

insert into pipeline_stages (organization_id, pipeline_id, nome, ordem, cor)
select p.organization_id, p.id, e.nome, e.ordem, e.cor
from pipelines p cross join (values
  ('Novo Lead',1,'#6366f1'),('Primeiro Contato',2,'#8b5cf6'),('Diagnóstico',3,'#f59e0b'),
  ('Proposta Enviada',4,'#3b82f6'),('Negociação',5,'#f97316'),('Fechado',6,'#22c55e'),('Perdido',7,'#ef4444')
) as e(nome,ordem,cor) where p.padrao = true;

insert into lead_distribution_config (organization_id, modo)
  select id, 'manual' from organizations where slug = 'industria';

insert into system_config (organization_id, chave, valor, tipo_valor, descricao)
select o.id, c.chave, c.valor, c.tipo, c.descricao
from organizations o cross join (values
  ('visibilidade_historico_conversa','completo','texto','Visibilidade do histórico de conversas'),
  ('alerta_offline_minutos','30','numero','Minutos offline para alerta ao gestor'),
  ('dias_alerta_sem_interacao','7','numero','Dias sem interação para destacar lead')
) as c(chave,valor,tipo,descricao) where o.slug = 'industria';

-- BOOTSTRAP DO 1º USUÁRIO ADMIN: criado pós-deploy via service-role
--   (criar auth.users + insert em profiles com escopo='industria', cargo='admin', hub_id=NULL).
--   Não pode ser semeado em SQL puro pois depende de auth.users.
-- =============================================================================
-- FIM DA BASELINE 001 (PROPOSTA)
-- =============================================================================
