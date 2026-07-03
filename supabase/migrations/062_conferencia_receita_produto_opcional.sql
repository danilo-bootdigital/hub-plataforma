-- Migration 062: Validação de Receita — produto OPCIONAL (DEC-019)
-- ============================================================================
-- ADITIVO/relaxamento: conferencias_receita.product_id passa a ser NULLABLE.
-- Sem produto → usa o checklist Genérico (escopo organização); não há validação
-- de medicamento/concentração/limite por produto (sem metadados). Idempotente.
-- ============================================================================

ALTER TABLE conferencias_receita ALTER COLUMN product_id DROP NOT NULL;

COMMENT ON COLUMN conferencias_receita.product_id IS 'DEC-019: produto de referência (OPCIONAL). Sem produto → checklist Genérico; sem validação por produto.';
