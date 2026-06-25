-- ============================================================
-- BOOT-CRM — Schema Completo V1
-- Executar no Supabase SQL Editor
-- ============================================================

-- Habilitar extensão para UUIDs
create extension if not exists "uuid-ossp";

-- ============================================================
-- ORGANIZAÇÕES (Multi-tenancy)
-- ============================================================
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  slug text unique not null,
  plano text not null default 'basico',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Inserir a Boot Digital como organização padrão
insert into organizations (nome, slug) values ('Boot Digital', 'boot-digital');

-- ============================================================
-- PERFIS DE USUÁRIO
-- ============================================================
create type user_role as enum ('admin', 'gestor', 'vendedor', 'atendimento', 'financeiro', 'suporte');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id),
  nome text not null,
  email text not null unique,
  telefone text,
  cargo user_role not null default 'vendedor',
  disponivel boolean not null default true,
  ativo boolean not null default true,
  ultimo_status_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ============================================================
-- LEADS
-- ============================================================
create type lead_origem as enum ('whatsapp', 'instagram_lead_ad', 'facebook_lead_ad', 'site', 'indicacao', 'evento', 'manual');
create type lead_status as enum ('novo', 'em_atendimento', 'qualificado', 'descartado');

create table leads (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text,
  email text,
  telefone text,
  empresa text,
  origem lead_origem not null default 'manual',
  status lead_status not null default 'novo',
  responsavel_id uuid references profiles(id),
  foto_perfil_url text,
  contato_anterior_id uuid references leads(id),
  whatsapp_instance_id uuid, -- FK adicionada via ALTER TABLE após criação de whatsapp_instances
  observacoes text,
  ultima_interacao_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ============================================================
-- EMPRESAS E CONTATOS
-- ============================================================
create table companies (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text not null,
  cnpj text,
  site text,
  telefone text,
  endereco text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table contacts (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text not null,
  email text,
  telefone text,
  cargo text,
  empresa_id uuid references companies(id),
  responsavel_id uuid references profiles(id),
  foto_perfil_url text,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ============================================================
-- PIPELINE DE VENDAS
-- ============================================================
create table pipelines (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text not null,
  descricao text,
  padrao boolean not null default false,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table pipeline_stages (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  pipeline_id uuid not null references pipelines(id) on delete cascade,
  nome text not null,
  ordem int not null,
  cor text not null default '#6366f1',
  oculto boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table deals (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  titulo text not null,
  valor_estimado numeric(12,2),
  contato_id uuid references contacts(id),
  responsavel_id uuid references profiles(id),
  pipeline_id uuid not null references pipelines(id),
  estagio_id uuid not null references pipeline_stages(id),
  data_fechamento_prevista date,
  origem_lead lead_origem,
  motivo_perda text,
  ganho boolean,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ============================================================
-- TAREFAS E ATIVIDADES
-- ============================================================
create type task_tipo as enum ('ligacao', 'email', 'reuniao', 'whatsapp');

create table tasks (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  titulo text not null,
  descricao text,
  tipo task_tipo not null default 'ligacao',
  data_vencimento timestamptz,
  concluida boolean not null default false,
  responsavel_id uuid not null references profiles(id),
  lead_id uuid references leads(id),
  contato_id uuid references contacts(id),
  deal_id uuid references deals(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table activities (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  tipo text not null,
  descricao text not null,
  lead_id uuid references leads(id),
  deal_id uuid references deals(id),
  contato_id uuid references contacts(id),
  autor_id uuid not null references profiles(id),
  criado_em timestamptz not null default now()
  -- Sem atualizado_em: registros de atividade são imutáveis
);

-- ============================================================
-- WHATSAPP
-- ============================================================
create type whatsapp_status as enum ('conectado', 'desconectado', 'aguardando_qr');
create type message_direcao as enum ('enviada', 'recebida');
create type message_tipo_midia as enum ('texto', 'audio', 'imagem', 'documento', 'sticker', 'localizacao');
create type message_status as enum ('enviada', 'entregue', 'lida', 'falhou');

create table whatsapp_instances (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text not null,
  numero text,
  evolution_instance_name text unique,
  vendedor_id uuid references profiles(id),
  compartilhado boolean not null default false,
  status_conexao whatsapp_status not null default 'desconectado',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table conversations (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  whatsapp_instance_id uuid not null references whatsapp_instances(id),
  lead_id uuid references leads(id),
  contato_id uuid references contacts(id),
  telefone_externo text not null,
  ultima_mensagem_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table messages (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  conversation_id uuid not null references conversations(id),
  message_id_externo text unique,
  direcao message_direcao not null,
  tipo_midia message_tipo_midia not null default 'texto',
  conteudo text,
  url_midia text,
  telefone_remetente text,
  telefone_destinatario text,
  responsavel_id uuid references profiles(id),
  status message_status not null default 'enviada',
  enviado_em timestamptz not null default now(),
  entregue_em timestamptz,
  lida_em timestamptz
);

create table message_templates (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text not null,
  conteudo text not null,
  categoria text,
  criado_por uuid not null references profiles(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table conversation_exports (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  conversation_id uuid not null references conversations(id),
  lead_id uuid references leads(id),
  exportado_por uuid not null references profiles(id),
  formato text not null check (formato in ('png', 'txt')),
  periodo_inicio timestamptz,
  periodo_fim timestamptz,
  total_mensagens int,
  criado_em timestamptz not null default now()
);

-- ============================================================
-- ORÇAMENTOS
-- ============================================================
create type quote_status as enum (
  'rascunho',
  'aguardando_aprovacao_interna',
  'aprovado_internamente',
  'rejeitado_internamente',
  'enviado_ao_cliente',
  'aprovado_pelo_cliente',
  'recusado_pelo_cliente'
);

create table products (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text not null,
  descricao text,
  preco_unitario numeric(12,2) not null default 0,
  unidade text not null default 'un',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table quotes (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  numero serial,
  lead_id uuid references leads(id),
  deal_id uuid references deals(id),
  responsavel_id uuid not null references profiles(id),
  status quote_status not null default 'rascunho',
  valor_subtotal numeric(12,2) not null default 0,
  desconto_geral numeric(5,2) not null default 0,
  valor_total numeric(12,2) not null default 0,
  aprovacao_interna_por uuid references profiles(id),
  aprovacao_interna_em timestamptz,
  aprovacao_interna_comentario text,
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

-- ============================================================
-- CONFIGURAÇÕES DO SISTEMA
-- ============================================================
create type distribuicao_modo as enum ('manual', 'rotativo', 'por_carga');

create table lead_distribution_config (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid unique not null references organizations(id),
  modo distribuicao_modo not null default 'manual',
  apenas_disponiveis boolean not null default false,
  limite_por_vendedor int,
  proximo_vendedor_idx int not null default 0,
  atualizado_por uuid references profiles(id),
  atualizado_em timestamptz not null default now()
);

create table system_config (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  chave text not null,
  valor text not null,
  tipo_valor text not null check (tipo_valor in ('texto', 'numero', 'booleano', 'json')),
  descricao text,
  atualizado_por uuid references profiles(id),
  atualizado_em timestamptz not null default now(),
  unique(organization_id, chave)
);

-- ============================================================
-- LOG DE AUDITORIA (imutável)
-- ============================================================
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  usuario_id uuid references profiles(id),
  acao text not null,
  tabela_afetada text,
  registro_id uuid,
  dados_anteriores jsonb,
  dados_novos jsonb,
  ip text,
  criado_em timestamptz not null default now()
  -- Sem atualizado_em: log é imutável
);

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================
create index on leads(organization_id, responsavel_id);
create index on leads(organization_id, status);
create index on leads(organization_id, criado_em desc);
create index on deals(organization_id, responsavel_id);
create index on deals(organization_id, estagio_id);
create index on tasks(organization_id, responsavel_id, concluida);
create index on tasks(data_vencimento) where concluida = false;
create index on activities(organization_id, lead_id);
create index on activities(organization_id, deal_id);
create index on messages(conversation_id, enviado_em);
create index on messages(message_id_externo);
create index on audit_logs(organization_id, criado_em desc);
create index on conversations(lead_id);
create index on conversations(whatsapp_instance_id);
create index on deals(pipeline_id);
create index on profiles(organization_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS em todas as tabelas
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
alter table products enable row level security;
alter table quotes enable row level security;
alter table quote_items enable row level security;
alter table lead_distribution_config enable row level security;
alter table system_config enable row level security;
alter table audit_logs enable row level security;

-- Função auxiliar: retorna organization_id do usuário autenticado
-- SECURITY DEFINER necessário para evitar recursão infinita no RLS de profiles
create or replace function get_organization_id()
returns uuid
language sql
stable
security definer set search_path = public
as $$
  select organization_id from profiles where id = auth.uid()
$$;

-- Função auxiliar: retorna cargo do usuário autenticado
-- SECURITY DEFINER necessário para evitar recursão infinita no RLS de profiles
create or replace function get_user_role()
returns user_role
language sql
stable
security definer set search_path = public
as $$
  select cargo from profiles where id = auth.uid()
$$;

-- Políticas gerais (usuário vê apenas dados da sua organização)
create policy "usuarios veem sua organizacao" on profiles
  for all using (organization_id = get_organization_id());

create policy "leads da organizacao" on leads
  for all using (organization_id = get_organization_id());

create policy "contatos da organizacao" on contacts
  for all using (organization_id = get_organization_id());

create policy "empresas da organizacao" on companies
  for all using (organization_id = get_organization_id());

create policy "pipelines da organizacao" on pipelines
  for all using (organization_id = get_organization_id());

create policy "etapas da organizacao" on pipeline_stages
  for all using (organization_id = get_organization_id());

create policy "negociacoes da organizacao" on deals
  for all using (organization_id = get_organization_id());

create policy "tarefas da organizacao" on tasks
  for all using (organization_id = get_organization_id());

-- Atividades: qualquer um pode inserir, ninguém pode editar ou excluir
create policy "inserir atividades" on activities
  for insert with check (organization_id = get_organization_id());
create policy "ver atividades" on activities
  for select using (organization_id = get_organization_id());

create policy "whatsapp da organizacao" on whatsapp_instances
  for all using (organization_id = get_organization_id());

create policy "conversas da organizacao" on conversations
  for all using (organization_id = get_organization_id());

create policy "mensagens da organizacao" on messages
  for all using (organization_id = get_organization_id());

create policy "templates da organizacao" on message_templates
  for all using (organization_id = get_organization_id());

create policy "exportacoes da organizacao" on conversation_exports
  for all using (organization_id = get_organization_id());

create policy "produtos da organizacao" on products
  for all using (organization_id = get_organization_id());

create policy "orcamentos da organizacao" on quotes
  for all using (organization_id = get_organization_id());

create policy "itens de orcamento" on quote_items
  for all using (
    quote_id in (select id from quotes where organization_id = get_organization_id())
  );

create policy "config distribuicao da organizacao" on lead_distribution_config
  for all using (organization_id = get_organization_id());

create policy "config sistema da organizacao" on system_config
  for all using (organization_id = get_organization_id());

-- Audit logs: inserir permitido, excluir BLOQUEADO para todos incluindo admin
create policy "inserir audit log" on audit_logs
  for insert with check (organization_id = get_organization_id());
create policy "ver audit log" on audit_logs
  for select using (organization_id = get_organization_id());

-- Organizations: leitura pública (necessário para trigger e funções auxiliares)
create policy "ver organizacoes" on organizations
  for select using (true);

-- organizations não tem policies de INSERT/UPDATE/DELETE:
-- multi-tenant V1 é single-org, apenas o service role manipula organizations.

-- FK de whatsapp_instance_id em leads (adicionada após criar whatsapp_instances)
alter table leads
  add constraint leads_whatsapp_instance_id_fkey
  foreign key (whatsapp_instance_id) references whatsapp_instances(id);

-- ============================================================
-- TRIGGER: criar perfil automaticamente após cadastro
-- ============================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  org_id uuid;
begin
  -- Pegar a organização padrão (Boot Digital)
  select id into org_id from organizations where slug = 'boot-digital' limit 1;

  if org_id is null then
    raise exception 'Organização padrão (boot-digital) não encontrada. Execute o INSERT em organizations primeiro.';
  end if;

  insert into profiles (id, organization_id, nome, email, cargo)
  values (
    new.id,
    org_id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    case
      when new.raw_user_meta_data->>'cargo' in ('admin','gestor','vendedor','atendimento','financeiro','suporte')
      then (new.raw_user_meta_data->>'cargo')::user_role
      else 'vendedor'::user_role
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- DADOS INICIAIS
-- ============================================================

-- Pipeline padrão com as 7 etapas
insert into pipelines (organization_id, nome, padrao)
select id, 'Principal', true from organizations where slug = 'boot-digital';

insert into pipeline_stages (organization_id, pipeline_id, nome, ordem, cor)
select
  p.organization_id,
  p.id,
  etapa.nome,
  etapa.ordem,
  etapa.cor
from pipelines p
cross join (values
  ('Novo Lead', 1, '#6366f1'),
  ('Primeiro Contato', 2, '#8b5cf6'),
  ('Diagnóstico', 3, '#f59e0b'),
  ('Proposta Enviada', 4, '#3b82f6'),
  ('Negociação', 5, '#f97316'),
  ('Fechado', 6, '#22c55e'),
  ('Perdido', 7, '#ef4444')
) as etapa(nome, ordem, cor)
where p.padrao = true;

-- Configuração padrão de distribuição
insert into lead_distribution_config (organization_id, modo)
select id, 'manual' from organizations where slug = 'boot-digital';

-- Configurações iniciais do sistema
insert into system_config (organization_id, chave, valor, tipo_valor, descricao)
select
  o.id,
  cfg.chave,
  cfg.valor,
  cfg.tipo,
  cfg.descricao
from organizations o
cross join (values
  ('visibilidade_historico_conversa', 'completo', 'texto', 'Nível de visibilidade do histórico de conversas para vendedores'),
  ('alerta_offline_minutos', '30', 'numero', 'Minutos offline para disparar alerta ao gestor'),
  ('dias_alerta_sem_interacao', '7', 'numero', 'Dias sem interação para destacar lead em vermelho')
) as cfg(chave, valor, tipo, descricao)
where o.slug = 'boot-digital';
