-- ============================================================================
-- Migration 079: Pipeline — remove a etapa "Receita em análise"
-- ============================================================================
-- Reduz o pipeline operacional de 7 para 6 etapas. A etapa 'receita_em_analise'
-- deixa de existir. Qualquer orçamento nessa etapa volta para 'aguardando_receita'.
-- Aperta o CHECK para aceitar só as 6 etapas restantes.
--
-- Aplicar no HUB DEV (pnkgwfgjhijksfmofiot) via SQL Editor.
-- ============================================================================

-- 1) Reatribui orçamentos que estavam em 'receita_em_analise'.
UPDATE quotes
   SET pipeline_status = 'aguardando_receita',
       pipeline_moved_at = now()
 WHERE pipeline_status = 'receita_em_analise';

-- 2) CHECK com as 6 etapas oficiais (sem 'receita_em_analise').
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS chk_quotes_pipeline_status;
ALTER TABLE quotes ADD CONSTRAINT chk_quotes_pipeline_status CHECK (
  pipeline_status IN (
    'novo_orcamento',
    'orcamento_enviado',
    'aguardando_receita',
    'aguardando_comprovante_pagamento',
    'pagamento_confirmado',
    'pedido_enviado_industria'
  )
);
