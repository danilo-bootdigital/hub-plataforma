-- =============================================================================
-- Sprint MIGRATE — RBAC: Função padrão "Comercial" (DEC-015)
-- [IDEMPOTENTE] — cria a Função padrão por Hub, aplica baseline e atribui aos
-- ASSISTENTES existentes. NÃO altera cargo (o flip vendedor→assistente vai na
-- Migrate-B, junto do menu/middleware). Não muda comportamento: funcao_id ainda
-- não é lido por menu/rotas/actions nesta fase — preserva o acesso atual.
-- Pré-requisito: expand_rbac_funcoes.sql aplicado.
-- Alvo: HUB DEV (pnkgwfgjhijksfmofiot) — aplicar via SQL Editor.
-- =============================================================================

-- 1. Função "Comercial" para cada Hub que possua assistentes (idempotente).
insert into funcoes (organization_id, hub_id, nome, descricao)
select distinct h.organization_id, h.id, 'Comercial', 'Função padrão (migração RBAC — DEC-015)'
from hubs h
where exists (select 1 from profiles p where p.hub_id = h.id and p.cargo = 'assistente')
on conflict (hub_id, nome) do nothing;

-- 2. Baseline de permissões da "Comercial" (reproduz o acesso operacional atual).
insert into funcao_permissoes (funcao_id, modulo, acao)
select f.id, m.modulo, m.acao
from funcoes f
cross join (values
  ('dashboard','visualizar'),
  ('leads','visualizar'), ('leads','criar'), ('leads','editar'),
  ('clientes','visualizar'), ('clientes','criar'), ('clientes','editar'),
  ('produtos','visualizar'),
  ('pedidos','visualizar'), ('pedidos','criar'), ('pedidos','editar'),
  ('orcamentos','visualizar'), ('orcamentos','criar'), ('orcamentos','editar'),
  ('whatsapp','visualizar'),
  ('agenda','visualizar'), ('agenda','criar'), ('agenda','editar')
) as m(modulo, acao)
where f.nome = 'Comercial'
on conflict (funcao_id, modulo, acao) do nothing;

-- 3. Atribuir a "Comercial" do próprio Hub aos assistentes sem função.
update profiles p
set funcao_id = f.id
from funcoes f
where f.hub_id = p.hub_id and f.nome = 'Comercial'
  and p.cargo = 'assistente' and p.hub_id is not null and p.funcao_id is null;

-- Conferência (somente leitura):
--   select count(*) from funcoes where nome='Comercial';
--   select count(*) from profiles where cargo='assistente' and funcao_id is not null;
--   select count(*) from profiles where cargo='assistente' and hub_id is null; -- ficam sem função (sem Hub)
