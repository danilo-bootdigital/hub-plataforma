-- =============================================================================
-- HUB DEV — Seeds mínimos (dev_fixtures)   [ARTEFATO TEMPORÁRIO]
-- Apenas o necessário para validar o funcionamento básico. Sem massa de dados.
-- =============================================================================

-- 1) Organização de teste (a Indústria do ambiente DEV)
insert into organizations (nome, slug)
values ('Indústria DEV', 'industria-dev')
on conflict (slug) do nothing;

-- 2) Pipeline padrão
insert into pipelines (organization_id, nome, padrao)
select id, 'Principal', true from organizations where slug = 'industria-dev'
on conflict do nothing;

-- 3) Etapas padrão (modelo atual; etapas operacionais chegam no Expand/Migrate)
insert into pipeline_stages (organization_id, pipeline_id, nome, ordem, cor, tipo_especial)
select p.organization_id, p.id, e.nome, e.ordem, e.cor, e.tipo_especial
from pipelines p
cross join (values
  ('Novo Lead',1,'#6366f1', null),
  ('Primeiro Contato',2,'#8b5cf6', null),
  ('Diagnóstico',3,'#f59e0b', null),
  ('Proposta Enviada',4,'#3b82f6', null),
  ('Negociação',5,'#f97316', null),
  ('Fechado',6,'#22c55e', 'fechado'),
  ('Perdido',7,'#ef4444', 'perdido')
) as e(nome,ordem,cor,tipo_especial)
where p.padrao = true
  and p.organization_id = (select id from organizations where slug = 'industria-dev')
  and not exists (select 1 from pipeline_stages s where s.pipeline_id = p.id);

-- 4) Configuração mínima de distribuição (modo manual)
insert into lead_distribution_config (organization_id, modo)
select id, 'manual' from organizations where slug = 'industria-dev'
on conflict (organization_id) do nothing;

-- -----------------------------------------------------------------------------
-- USUÁRIO ADMIN DE TESTE: criar via Supabase Auth APÓS os seeds (não em SQL puro),
-- pois depende de auth.users. O trigger on_auth_user_created cria o profile e o
-- vincula à organização. Exemplo (CLI/painel):
--   supabase auth admin create-user --email admin@dev.local --password '...' \
--     --user-metadata '{"nome":"Admin DEV","cargo":"admin"}'
-- =============================================================================
