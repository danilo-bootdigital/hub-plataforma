-- ROLLBACK — RBAC Funções/Permissões (DEC-015, Expand E8)
drop function if exists minhas_permissoes();
alter table profiles drop column if exists funcao_id;
drop table if exists funcao_permissoes;
drop table if exists funcoes;
