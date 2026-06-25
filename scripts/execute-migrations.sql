-- Script para executar as migrations manualmente no Supabase SQL Editor

-- Migration 031: Criar tabela de configurações do WhatsApp
create table if not exists whatsapp_config (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  max_tamanho_mensagem integer not null default 4096,
  tempo_retencao_midia integer not null default 30,
  max_tentativas_envio integer not null default 3,
  palavras_urgentes text[] not null default '{}',
  habilitar_cache_contatos boolean not null default true,
  tempo_cache_contatos integer not null default 300,
  rate_limit_por_minuto integer not null default 60,
  webhook_timeout integer not null default 15,
  habilitar_monitoramento boolean not null default true,
  criado_em timestamp with time zone not null default now(),
  atualizado_em timestamp with time zone not null default now()
);

-- Criar índice para performance
create index if not exists idx_whatsapp_config_org on whatsapp_config(organization_id);

-- Criar constraint única por organização
alter table whatsapp_config
add constraint unique_whatsapp_config_org
unique (organization_id);

-- Migration 032: Adicionar coluna de urgência na tabela de mensagens
alter table messages
add column if not exists urgencia varchar(10) default 'normal',
add column if not exists processado_em timestamp with time zone;

-- Criar índice para performance
create index if not exists idx_messages_urgencia on messages(urgencia);
create index if not exists idx_messages_processado_em on messages(processado_em);

-- Atualizar mensagens existentes para marcá-las como processadas
update messages
set processado_em = enviado_em,
    urgencia = 'normal'
where processado_em is null;

-- Inserir configuração padrão para a organização existente
insert into whatsapp_config (
  organization_id,
  max_tamanho_mensagem,
  tempo_retencao_midia,
  max_tentativas_envio,
  palavras_urgentes,
  habilitar_cache_contatos,
  tempo_cache_contatos,
  rate_limit_por_minuto,
  webhook_timeout,
  habilitar_monitoramento,
  criado_em,
  atualizado_em
)
select
  o.id,
  4096,
  30,
  3,
  array['urgente', 'emergência', 'problema', 'falha', 'erro'],
  true,
  300,
  60,
  15,
  true,
  now(),
  now()
from organizations o
where exists (select 1 from profiles where organization_id = o.id)
limit 1
on conflict (organization_id) do nothing;