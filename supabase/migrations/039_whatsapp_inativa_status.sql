-- Adicionar status 'inativa' ao tipo whatsapp_status
-- Esta migration permite marcar instâncias como inativas sem removê-las do banco
-- Útil para instâncias que não podem ser excluídas imediatamente

-- Criar novo tipo com 'inativa'
create type whatsapp_status_novo as enum ('conectado', 'desconectado', 'aguardando_qr', 'inativa');

-- Substituir o tipo antigo
alter type whatsapp_status rename to whatsapp_status_antigo;
alter type whatsapp_status_novo rename to whatsapp_status;

-- Atualizar registros existentes para o novo status padrão
update whatsapp_instances set status_conexao = 'desconectado' where status_conexao is null;

-- Remover tipo antigo
drop type whatsapp_status_antigo;