-- Criar tabela de configurações do WhatsApp
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