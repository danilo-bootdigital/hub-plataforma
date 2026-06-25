-- Adicionar coluna de urgência na tabela de mensagens
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