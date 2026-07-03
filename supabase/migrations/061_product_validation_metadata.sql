-- Migration 061: product_validation_metadata (DEC-019 emenda MVP-5′ + DEC-012)
-- ============================================================================
-- ADITIVO PURO (Expand). CATÁLOGO ÚNICO de metadados de validação de receita por
-- produto (Opção B disciplinada). Substitui a ideia de N tabelas específicas
-- (aliases/concentrações/vias/limite): cada metadado é uma linha keyed por `chave`.
--
-- Usado pela Validação de Receita: a regra do checklist declara `origemValores:"<chave>"`
-- e a COMPOSIÇÃO (server action) hidrata config.valores (lista) ou config.limiteMaximo
-- (numero) antes do motor. O MOTOR não conhece esta tabela.
--
-- Guarda-corpos (EAV disciplinado): `chave` e `tipo` restritos por CHECK; CHECK garante
-- que a coluna certa esteja preenchida por tipo; UNIQUE(product_id, chave).
-- Idempotente: seguro para reexecução.
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_validation_metadata (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  chave text NOT NULL CHECK (chave IN (
    'medicamento_aliases','concentracoes_permitidas','vias_permitidas','limite_maximo_por_receita'
  )),
  tipo text NOT NULL CHECK (tipo IN ('lista','numero','texto')),
  valores text[],
  valor_num numeric,
  valor_texto text,
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid REFERENCES profiles(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  -- Um metadado por (produto, chave).
  CONSTRAINT uq_pvm_produto_chave UNIQUE (product_id, chave),
  -- A coluna de valor tem de casar com o tipo.
  CONSTRAINT chk_pvm_tipo_valor CHECK (
    (tipo = 'lista'  AND valores IS NOT NULL AND valor_num IS NULL AND valor_texto IS NULL) OR
    (tipo = 'numero' AND valor_num IS NOT NULL AND valores IS NULL AND valor_texto IS NULL) OR
    (tipo = 'texto'  AND valor_texto IS NOT NULL AND valores IS NULL AND valor_num IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_pvm_product ON product_validation_metadata(product_id);
CREATE INDEX IF NOT EXISTS idx_pvm_org     ON product_validation_metadata(organization_id);
CREATE INDEX IF NOT EXISTS idx_pvm_ativo   ON product_validation_metadata(product_id, ativo);

-- RLS por organização (padrão get_organization_id()).
ALTER TABLE product_validation_metadata ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "product_validation_metadata da organizacao" ON product_validation_metadata;
CREATE POLICY "product_validation_metadata da organizacao" ON product_validation_metadata
  FOR ALL USING (organization_id = get_organization_id())
  WITH CHECK (organization_id = get_organization_id());

COMMENT ON TABLE product_validation_metadata IS 'DEC-019 MVP-5′ / DEC-012. Catálogo keyed de metadados de validação de receita por produto (medicamento_aliases, concentracoes_permitidas, vias_permitidas, limite_maximo_por_receita). A Validação de Receita hidrata as regras do checklist (origemValores) a partir daqui. O motor não conhece esta tabela.';
COMMENT ON COLUMN product_validation_metadata.chave IS 'Nome do metadado; casa com origemValores da regra do checklist. Restrito por CHECK.';
COMMENT ON COLUMN product_validation_metadata.ativo IS 'Metadado inativo é ignorado na hidratação (liga/desliga sem apagar).';
