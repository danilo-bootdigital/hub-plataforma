-- Migration 059: MVP-5 (DEC-019) — decisão humana + RBAC da Conferência
-- ============================================================================
-- ADITIVO. Idempotente (DROP CONSTRAINT IF EXISTS + ADD).
--  (1) quote_receitas.status_fluxo passa a aceitar 'necessita_correcao'.
--  (2) funcao_permissoes.chk_acao passa a aceitar 'conferir' e 'aprovar'
--      (permissões receita:conferir / receita:aprovar). Esta migration NÃO concede
--      permissões a ninguém — apenas habilita o vocabulário de ações no RBAC.
-- ============================================================================

-- (1) status_fluxo += 'necessita_correcao'
ALTER TABLE quote_receitas DROP CONSTRAINT IF EXISTS chk_quote_receitas_status_fluxo;
ALTER TABLE quote_receitas ADD CONSTRAINT chk_quote_receitas_status_fluxo
  CHECK (status_fluxo IN (
    'rascunho','modelo_gerado','enviada','recebida','em_conferencia',
    'validada','aprovada_operacionalmente','necessita_correcao','rejeitada','precisa_revisao_humana'
  ));

-- (2) funcao_permissoes.chk_acao += 'conferir','aprovar'
ALTER TABLE funcao_permissoes DROP CONSTRAINT IF EXISTS chk_acao;
ALTER TABLE funcao_permissoes ADD CONSTRAINT chk_acao
  CHECK (acao IN ('visualizar','criar','editar','excluir','conferir','aprovar'));
