-- ROLLBACK 059 (MVP-5): reverte os CHECKs para o conjunto anterior.
ALTER TABLE quote_receitas DROP CONSTRAINT IF EXISTS chk_quote_receitas_status_fluxo;
ALTER TABLE quote_receitas ADD CONSTRAINT chk_quote_receitas_status_fluxo
  CHECK (status_fluxo IN ('rascunho','modelo_gerado','enviada','recebida','em_conferencia','validada','aprovada_operacionalmente','rejeitada','precisa_revisao_humana'));
ALTER TABLE funcao_permissoes DROP CONSTRAINT IF EXISTS chk_acao;
ALTER TABLE funcao_permissoes ADD CONSTRAINT chk_acao
  CHECK (acao IN ('visualizar','criar','editar','excluir'));
