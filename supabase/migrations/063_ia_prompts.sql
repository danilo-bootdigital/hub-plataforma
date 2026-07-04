-- Migration 063: ia_prompts (DEC-019) — prompts de IA editáveis por organização
-- ============================================================================
-- ADITIVO. Guarda overrides do prompt de extração por organização (1 linha/org).
-- Campos NULL → usa o prompt PADRÃO do código. Editável pelo Proprietário do Hub.
-- Idempotente. RLS por organização.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ia_prompts (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id),
  extracao_system text,
  extracao_instrucao text,   -- pode conter o placeholder {campos}
  atualizado_por uuid REFERENCES profiles(id),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ia_prompts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ia_prompts da organizacao" ON ia_prompts;
CREATE POLICY "ia_prompts da organizacao" ON ia_prompts
  FOR ALL USING (organization_id = get_organization_id())
  WITH CHECK (organization_id = get_organization_id());

COMMENT ON TABLE ia_prompts IS 'DEC-019: override do prompt de extração da IA por organização (editor na área do Proprietário do Hub). NULL → prompt padrão do código.';
