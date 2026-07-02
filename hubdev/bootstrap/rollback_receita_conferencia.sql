-- ROLLBACK da migration 057 — Conferência Operacional de Receita (DEC-019, Sprint 1)
-- ============================================================================
-- Reverte APENAS o que a 057 adicionou. Aditivo puro → rollback seguro.
-- Ordem: filhas antes das mães; remover colunas/constraints de quote_receitas por último.
-- Idempotente (IF EXISTS).
-- ============================================================================

-- Trigger + função append-only
DROP TRIGGER IF EXISTS trg_receita_conferencias_append_only ON receita_conferencias;
DROP FUNCTION IF EXISTS fn_receita_conferencias_append_only();

-- Tabelas (filhas primeiro; cascade cobre FKs internas)
DROP TABLE IF EXISTS receita_conferencia_pendencias CASCADE;
DROP TABLE IF EXISTS receita_conferencias CASCADE;
DROP TABLE IF EXISTS receita_checklist_itens CASCADE;
DROP TABLE IF EXISTS receita_modelos CASCADE;
DROP TABLE IF EXISTS receita_checklists CASCADE;

-- Reverter extensões em quote_receitas
ALTER TABLE quote_receitas DROP CONSTRAINT IF EXISTS chk_receita_aprovacao_humana;
ALTER TABLE quote_receitas DROP COLUMN IF EXISTS score_ultima_conferencia;
ALTER TABLE quote_receitas DROP COLUMN IF EXISTS status_analise_ia;
ALTER TABLE quote_receitas DROP COLUMN IF EXISTS checklist_id;

-- Restaurar o CHECK de status_fluxo ao conjunto da DEC-018 (sem os valores da DEC-019).
DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint
   WHERE conrelid = 'quote_receitas'::regclass AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%status_fluxo%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE quote_receitas DROP CONSTRAINT %I', c);
  END IF;
END $$;

ALTER TABLE quote_receitas ADD CONSTRAINT chk_quote_receitas_status_fluxo
  CHECK (status_fluxo IN ('rascunho','modelo_gerado','enviada','recebida','validada','rejeitada'));
