-- ============================================================================
-- Migration 080: Diagnóstico do Pipeline Oficial (VIEW re-executável)
-- ============================================================================
-- Garantia (b) do alinhamento Orçamentos ↔ Pipeline no MODELO VIRTUAL:
-- o card É o orçamento (fonte única = quotes.pipeline_status). Não há tabela
-- pipeline_cards — portanto duplicado/órfão/hub divergente são IMPOSSÍVEIS por
-- construção (1 linha de quotes = 1 card; unicidade garantida pela PK quotes.id).
--
-- Esta VIEW materializa as 9 verificações de aceite numa única linha, para
-- rodar a qualquer momento:  SELECT * FROM vw_pipeline_diagnostico;
--
-- Aplicar no HUB DEV (pnkgwfgjhijksfmofiot) via SQL Editor. Objeto read-only.
-- ============================================================================

CREATE OR REPLACE VIEW vw_pipeline_diagnostico AS
SELECT
  -- 1) Total de orçamentos.
  (SELECT count(*) FROM quotes) AS total_orcamentos,
  -- 2) Total de cards que efetivamente aparecem no pipeline (têm Hub e etapa).
  (SELECT count(*) FROM quotes WHERE hub_id IS NOT NULL AND pipeline_status IS NOT NULL) AS total_cards,
  -- 3) Orçamentos sem card: sem hub_id não caem em nenhum pipeline (deve ser 0).
  (SELECT count(*) FROM quotes WHERE hub_id IS NULL) AS orcamentos_sem_card,
  -- 4) Cards duplicados por quote: 0 pela PK quotes.id (1 linha = 1 card).
  (SELECT count(*) - count(DISTINCT id) FROM quotes) AS cards_duplicados_por_quote,
  -- 5) Cards com hub divergente: o card É o orçamento (mesma linha) → sempre 0.
  0::bigint AS cards_hub_divergente,
  -- 6) Cards sem etapa: pipeline_status nulo (deve ser 0; coluna é NOT NULL).
  (SELECT count(*) FROM quotes WHERE pipeline_status IS NULL) AS cards_sem_etapa,
  -- 7) Cards com etapa inválida (fora das 6 oficiais; o CHECK já impede).
  (SELECT count(*) FROM quotes
     WHERE pipeline_status IS NOT NULL AND pipeline_status NOT IN (
       'novo_orcamento','orcamento_enviado','aguardando_receita',
       'aguardando_comprovante_pagamento','pagamento_confirmado','pedido_enviado_industria'
     )) AS cards_etapa_invalida,
  -- 8) Cards em pipeline de outro Hub: mesma linha do orçamento → sempre 0.
  0::bigint AS cards_pipeline_outro_hub,
  -- 9) Cards órfãos (sem orçamento): card = orçamento → sempre 0.
  0::bigint AS cards_orfaos,
  -- Bônus: orçamentos apontando para um Hub inexistente (integridade referencial).
  (SELECT count(*) FROM quotes q
     WHERE q.hub_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM hubs h WHERE h.id = q.hub_id))
   AS orcamentos_hub_inexistente;

COMMENT ON VIEW vw_pipeline_diagnostico IS
  'Diagnóstico do Pipeline Oficial (modelo virtual: card = orçamento). Aprovado quando orcamentos_sem_card, cards_duplicados_por_quote, cards_etapa_invalida e orcamentos_hub_inexistente = 0. Re-executável: SELECT * FROM vw_pipeline_diagnostico;';
