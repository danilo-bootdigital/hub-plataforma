-- Migration 073: Mensageria — RPC de claim do poller (DEC-023 · Fatia 0, Etapa 8A)
-- ============================================================================
-- ADITIVO. Idempotente (DROP da assinatura antiga + CREATE OR REPLACE). NÃO cria
-- tabela/coluna: reutiliza communication_inbound_events.proxima_tentativa_em como
-- campo de visibilidade (pendente = deadline de backoff; processando = deadline de visibilidade).
--
-- communication_inbound_claim(p_limit, p_visibilidade_seg, p_max_tentativas):
--  (a) DEAD-LETTER: presos em 'processando' com visibilidade EXPIRADA que já atingiram
--      max_tentativas viram 'erro' — evita crash-loop infinito quando o worker morre
--      antes de aplicar a transição (a tentativa é contada no claim; ver (b)).
--  (b) CLAIM: reivindica um lote elegível com FOR UPDATE SKIP LOCKED, INCREMENTANDO
--      tentativas (cada claim = 1 tentativa), marca 'processando' e
--      proxima_tentativa_em = now()+visibilidade. NÃO reivindica quem já atingiu max_tentativas.
--
-- Elegível: (pendente com backoff cumprido) OU (processando com visibilidade expirada),
-- em ambos os casos com tentativas < max_tentativas.
-- A decisão pós-processamento (processado / backoff / dead-letter) é feita no poller (TS),
-- SEM incrementar tentativas de novo (já contada aqui) — evita incremento duplo.
--
-- Escopo Etapa 8A: SÓ a infra da fila. NÃO cria conversation/message e NÃO agenda cron.
-- Aplicar no HUB DEV (pnkgwfgjhijksfmofiot) via SQL Editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- IMPORTANTE:
-- As tentativas são contabilizadas no momento do CLAIM, e não após o processamento.
-- Isso garante que crashes, timeouts e encerramentos inesperados do worker também
-- consumam tentativas, evitando crash-loops infinitos.
-- ----------------------------------------------------------------------------

-- Remove a assinatura anterior (2 args), se existir, para não deixar overload órfão.
DROP FUNCTION IF EXISTS communication_inbound_claim(int, int);

CREATE OR REPLACE FUNCTION communication_inbound_claim(
  p_limit int DEFAULT 20,
  p_visibilidade_seg int DEFAULT 300,
  p_max_tentativas int DEFAULT 5
)
RETURNS SETOF communication_inbound_events
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- (a) dead-letter dos presos expirados que esgotaram as tentativas (worker morreu/timeout).
  UPDATE communication_inbound_events
     SET status = 'erro',
         erro = COALESCE(erro, 'esgotou tentativas: worker não concluiu (visibilidade expirada)')
   WHERE status = 'processando'
     AND proxima_tentativa_em IS NOT NULL AND proxima_tentativa_em <= now()
     AND tentativas >= GREATEST(p_max_tentativas, 1);

  -- (b) claim: reivindica lote elegível, contando a tentativa (tentativas + 1).
  UPDATE communication_inbound_events t
     SET status = 'processando',
         tentativas = t.tentativas + 1,
         proxima_tentativa_em = now() + make_interval(secs => GREATEST(p_visibilidade_seg, 0))
   WHERE t.id IN (
     SELECT e.id
       FROM communication_inbound_events e
      WHERE (
              (e.status = 'pendente'    AND (e.proxima_tentativa_em IS NULL OR e.proxima_tentativa_em <= now()))
           OR (e.status = 'processando' AND e.proxima_tentativa_em IS NOT NULL AND e.proxima_tentativa_em <= now())
            )
        AND e.tentativas < GREATEST(p_max_tentativas, 1)
      ORDER BY e.created_at
      LIMIT GREATEST(p_limit, 1)
      FOR UPDATE SKIP LOCKED
   )
  RETURNING t.*;
$$;

COMMENT ON FUNCTION communication_inbound_claim(int, int, int) IS
  'DEC-023 Etapa 8A: reivindica lote do inbox (FOR UPDATE SKIP LOCKED) contando a tentativa no claim; dead-leta presos expirados que esgotaram tentativas (evita crash-loop). Transição pós-processamento decidida no poller (TS), sem re-incrementar.';

-- Exposição: só o service role (poller) executa. Remove o EXECUTE default de PUBLIC.
REVOKE ALL ON FUNCTION communication_inbound_claim(int, int, int) FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION communication_inbound_claim(int, int, int) TO service_role;
  END IF;
END $$;
