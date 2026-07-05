-- Migration 068: Configuração do Assistente de IA comercial por Hub (DEC-021, Config-3)
-- ============================================================================
-- ADITIVO PURO (Expand). Idempotente. Nova tabela `hub_ia_config` (1 linha por Hub)
-- + RLS (leitura do próprio Hub) + RPCs SECURITY DEFINER (get/salvar; salvar só
-- proprietario_hub). Reusa fn_hco_caller() e get_hub_id() (migration 064).
--
-- O editor de EXTRAÇÃO de receita (DEC-019, ia_prompts) é outra finalidade e não é
-- tocado. O consumo destes campos por um assistente conversacional é a Config-4.
--
-- Aplicar no HUB DEV (pnkgwfgjhijksfmofiot) via SQL Editor antes do deploy.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hub_ia_config (
  hub_id uuid PRIMARY KEY REFERENCES hubs(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  prompt_mestre         text,
  objetivo              text,
  regras                text,
  tom_de_voz            text,
  restricoes            text,
  contexto_negocio      text,
  produtos_prioritarios text,
  informacoes_proibidas text,
  observacoes           text,
  atualizado_por uuid REFERENCES profiles(id),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hub_ia_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hub_ia_config select" ON hub_ia_config;
CREATE POLICY "hub_ia_config select" ON hub_ia_config
  FOR SELECT USING (hub_id = get_hub_id());

-- Leitura: config do Hub do usuário (ou {existe:false}).
CREATE OR REPLACE FUNCTION hub_ia_config_get()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; o record;
BEGIN
  SELECT * INTO c FROM fn_hco_caller();
  IF c.hub_id IS NULL THEN RETURN jsonb_build_object('existe', false); END IF;
  SELECT * INTO o FROM hub_ia_config WHERE hub_id = c.hub_id;
  IF o.hub_id IS NULL THEN RETURN jsonb_build_object('existe', false); END IF;
  RETURN jsonb_build_object(
    'existe', true,
    'prompt_mestre', o.prompt_mestre, 'objetivo', o.objetivo, 'regras', o.regras,
    'tom_de_voz', o.tom_de_voz, 'restricoes', o.restricoes, 'contexto_negocio', o.contexto_negocio,
    'produtos_prioritarios', o.produtos_prioritarios, 'informacoes_proibidas', o.informacoes_proibidas,
    'observacoes', o.observacoes
  );
END $$;

-- Escrita: upsert da config do Hub. Só o Proprietário do Hub.
CREATE OR REPLACE FUNCTION hub_ia_config_salvar(p_dados jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record;
BEGIN
  SELECT * INTO c FROM fn_hco_caller();
  IF c.cargo <> 'proprietario_hub' THEN
    RAISE EXCEPTION 'apenas o Proprietário do Hub pode editar a IA'; END IF;
  IF c.hub_id IS NULL THEN RAISE EXCEPTION 'usuário sem Hub vinculado'; END IF;

  INSERT INTO hub_ia_config (
    hub_id, organization_id, prompt_mestre, objetivo, regras, tom_de_voz, restricoes,
    contexto_negocio, produtos_prioritarios, informacoes_proibidas, observacoes, atualizado_por, atualizado_em
  ) VALUES (
    c.hub_id, c.organization_id,
    NULLIF(p_dados->>'prompt_mestre',''), NULLIF(p_dados->>'objetivo',''), NULLIF(p_dados->>'regras',''),
    NULLIF(p_dados->>'tom_de_voz',''), NULLIF(p_dados->>'restricoes',''), NULLIF(p_dados->>'contexto_negocio',''),
    NULLIF(p_dados->>'produtos_prioritarios',''), NULLIF(p_dados->>'informacoes_proibidas',''), NULLIF(p_dados->>'observacoes',''),
    c.uid, now()
  )
  ON CONFLICT (hub_id) DO UPDATE SET
    prompt_mestre = EXCLUDED.prompt_mestre, objetivo = EXCLUDED.objetivo, regras = EXCLUDED.regras,
    tom_de_voz = EXCLUDED.tom_de_voz, restricoes = EXCLUDED.restricoes, contexto_negocio = EXCLUDED.contexto_negocio,
    produtos_prioritarios = EXCLUDED.produtos_prioritarios, informacoes_proibidas = EXCLUDED.informacoes_proibidas,
    observacoes = EXCLUDED.observacoes, atualizado_por = EXCLUDED.atualizado_por, atualizado_em = now();
END $$;

COMMENT ON TABLE hub_ia_config IS 'DEC-021: configuração do assistente de IA comercial por Hub (system prompt do assistente). Consumo pelo assistente = Config-4.';
