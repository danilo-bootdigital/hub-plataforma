-- Rollback da Migration 060 — Conferência de Receita STANDALONE (DEC-019 emenda MVP-5′)
-- Arquitetura simplificada (sem Event Sourcing).
-- ============================================================================
-- Remove APENAS as estruturas standalone criadas na 060 (tabela principal +
-- pendências + histórico de decisões append-only + triggers/funções). NÃO toca
-- nas tabelas acopladas (056/057). Reverte a extensão dos CHECKs de
-- receita_checklist_itens ao estado 057.
-- Rode ANTES: garanta que nenhum checklist_item usa tipo_regra='limite_maximo'
-- nem motivo='limite_maximo_excedido' (senão o CHECK revertido falha).
-- ============================================================================

-- Tabelas (CASCADE derruba triggers e FKs dependentes)
DROP TABLE IF EXISTS conferencia_receita_pendencias CASCADE;
DROP TABLE IF EXISTS historico_decisoes_conferencia_receita CASCADE;
DROP TABLE IF EXISTS conferencias_receita CASCADE;

-- Funções de trigger
DROP FUNCTION IF EXISTS fn_historico_decisoes_append_only() CASCADE;
DROP FUNCTION IF EXISTS fn_conferencias_receita_touch() CASCADE;

-- Reverter CHECKs de receita_checklist_itens ao estado da 057
DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint
   WHERE conrelid = 'receita_checklist_itens'::regclass AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%tipo_regra%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE receita_checklist_itens DROP CONSTRAINT %I', c);
  END IF;
  ALTER TABLE receita_checklist_itens ADD CONSTRAINT chk_checklist_item_tipo_regra
    CHECK (tipo_regra IN ('presenca','formato','comparacao_orcamento','valor_esperado'));

  SELECT conname INTO c FROM pg_constraint
   WHERE conrelid = 'receita_checklist_itens'::regclass AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%motivo%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE receita_checklist_itens DROP CONSTRAINT %I', c);
  END IF;
  ALTER TABLE receita_checklist_itens ADD CONSTRAINT chk_checklist_item_motivo
    CHECK (motivo IS NULL OR motivo IN (
      'crm_ausente','crm_uf_ausente','assinatura_ausente','paciente_ausente',
      'cpf_ausente_obrigatorio','produto_divergente','concentracao_divergente',
      'quantidade_divergente','posologia_ausente','data_ausente','receita_vencida',
      'documento_ilegivel','outro'
    ));
END $$;
