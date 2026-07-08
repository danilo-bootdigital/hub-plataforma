-- ============================================================================
-- Migration 078: Pipeline operacional do Orçamento (MVP — Kanban do Hub)
-- ============================================================================
-- ADITIVO PURO. Cria o status OPERACIONAL do orçamento (pipeline_status),
-- distinto do `status` COMERCIAL (quote_status). O Kanban do Hub (/hub/pipeline)
-- usa este campo como fonte de verdade. Escopo por hub_id (já existente em quotes).
--
-- NÃO altera o `status` comercial, NÃO cria tabela de pipelines (funis são fase
-- posterior — as 7 etapas oficiais do MVP vivem numa constante no código).
--
-- Aplicar no HUB DEV (pnkgwfgjhijksfmofiot) via SQL Editor antes do deploy.
-- ============================================================================

-- 1) Campos operacionais do pipeline no orçamento.
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS pipeline_status   text        NOT NULL DEFAULT 'novo_orcamento',
  ADD COLUMN IF NOT EXISTS pipeline_moved_at timestamptz,
  ADD COLUMN IF NOT EXISTS pipeline_moved_by uuid REFERENCES profiles(id);

-- 2) CHECK: aceita apenas as 7 etapas oficiais do MVP.
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS chk_quotes_pipeline_status;
ALTER TABLE quotes ADD CONSTRAINT chk_quotes_pipeline_status CHECK (
  pipeline_status IN (
    'novo_orcamento',
    'orcamento_enviado',
    'aguardando_receita',
    'receita_em_analise',
    'aguardando_comprovante_pagamento',
    'pagamento_confirmado',
    'pedido_enviado_industria'
  )
);

-- 3) Backfill: todo orçamento existente entra em "Novo orçamento".
--    (ADD COLUMN ... DEFAULT já preenche as linhas; reforço explícito por segurança.)
UPDATE quotes SET pipeline_status = 'novo_orcamento' WHERE pipeline_status IS NULL;

-- 4) pipeline_moved_at inicia na data de criação (para "tempo parado na etapa").
UPDATE quotes SET pipeline_moved_at = criado_em WHERE pipeline_moved_at IS NULL;

-- 5) Índice para o Kanban (agrupamento por Hub + etapa).
CREATE INDEX IF NOT EXISTS idx_quotes_hub_pipeline ON quotes(hub_id, pipeline_status);

COMMENT ON COLUMN quotes.pipeline_status   IS 'Etapa OPERACIONAL do Kanban do Hub (MVP, DEC pipeline). Distinto de status (comercial). 7 etapas oficiais.';
COMMENT ON COLUMN quotes.pipeline_moved_at IS 'Quando o orçamento entrou na etapa atual do pipeline (base do "tempo parado").';
COMMENT ON COLUMN quotes.pipeline_moved_by IS 'Quem moveu o orçamento para a etapa atual do pipeline.';
