-- Migration 069: Rastreamento total do Orçamento (Fase T-1)
-- ============================================================================
-- ADITIVO PURO. Cria a trilha append-only de eventos do Orçamento (quote_events).
-- NÃO altera status de orçamento, NÃO faz backfill, NÃO remove nada.
-- Escopo por hub_id/organization_id. Indústria (admin/gestor) NÃO lê (DEC-022):
-- get_hub_id() é null para a Indústria, então a policy de SELECT não casa.
--
-- Aplicar no HUB DEV (pnkgwfgjhijksfmofiot) via SQL Editor antes do deploy.
-- ============================================================================

CREATE TABLE IF NOT EXISTS quote_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  hub_id uuid,                                   -- desnormalizado do orçamento (escopo/segurança)
  organization_id uuid NOT NULL REFERENCES organizations(id),
  tipo_evento text NOT NULL,
  ator_id uuid REFERENCES profiles(id),
  ator_cargo text,                               -- cargo/perfil do ator no momento
  descricao text,                                -- legível (ex.: "Quantidade alterada de 1 para 2")
  valor_anterior jsonb,
  valor_novo jsonb,
  origem text,                                   -- 'hub_form' | 'api' | 'ia' | 'sistema'
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_events_quote   ON quote_events(quote_id, created_at);
CREATE INDEX IF NOT EXISTS idx_quote_events_hub     ON quote_events(hub_id);
CREATE INDEX IF NOT EXISTS idx_quote_events_org     ON quote_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_quote_events_created ON quote_events(created_at);

-- Append-only forte: bloqueia UPDATE/DELETE (inclusive service role).
CREATE OR REPLACE FUNCTION fn_quote_events_append_only()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'quote_events é append-only: % não é permitido', TG_OP;
END $$;

DROP TRIGGER IF EXISTS trg_quote_events_append_only ON quote_events;
CREATE TRIGGER trg_quote_events_append_only
  BEFORE UPDATE OR DELETE ON quote_events
  FOR EACH ROW EXECUTE FUNCTION fn_quote_events_append_only();

-- RLS: leitura só por usuários do MESMO Hub (proprietario_hub/assistente).
-- A Indústria (admin/gestor) tem hub_id nulo → get_hub_id() é null → não lê.
-- Escrita é feita via service role no servidor (helper registrarEventoOrcamento);
-- sem policy de INSERT/UPDATE/DELETE para usuários.
ALTER TABLE quote_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quote_events select hub" ON quote_events;
CREATE POLICY "quote_events select hub" ON quote_events
  FOR SELECT USING (hub_id IS NOT NULL AND hub_id = get_hub_id());

COMMENT ON TABLE quote_events IS 'Fase T-1: trilha append-only de eventos do Orçamento (rastreamento). Escopo por hub_id; Indústria não lê (DEC-022). Escrita via service role (helper server-side).';
