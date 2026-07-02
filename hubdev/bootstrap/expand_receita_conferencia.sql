-- Migration 057: Conferência Operacional de Receita (DEC-019) — Sprint 1 (Expand)
-- ============================================================================
-- ADITIVO PURO (Expand): novas tabelas + colunas nullable em quote_receitas.
-- Nada é removido. TEXT + CHECK (consistência com 056). RLS via get_organization_id().
-- receita_conferencias é APPEND-ONLY (trigger bloqueia UPDATE/DELETE, inclusive service role).
--
-- RBAC (IMPORTANTE): NENHUMA ação operacional deste módulo (conferir / aprovar /
-- configurar_checklist) pode funcionar sem PERMISSÃO DEDICADA. As permissões reais
-- e a extensão de funcao_permissoes.chk_acao ficam para Sprint 3/6. Esta migration
-- NÃO insere permissões nem altera chk_acao.
--
-- Storage: reuso do bucket privado 'orcamento-receitas' (DEC-018). Receitas-modelo
-- ficam sob o prefixo 'modelos/'. Esta migration NÃO cria bucket nem policies de Storage.
--
-- Escopo do checklist: Indústria = organizations (tenant). Não há industria_id;
-- o escopo raiz é organization_id. escopo ∈ ('organizacao','portfolio','produto').
-- Idempotente: seguro para reexecução.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) receita_checklists
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS receita_checklists (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  nome text NOT NULL,
  escopo text NOT NULL CHECK (escopo IN ('organizacao','portfolio','produto')),
  portfolio_id uuid REFERENCES portfolios(id),
  produto_id uuid REFERENCES products(id),
  tipo_documento text,
  versao int NOT NULL DEFAULT 1,
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid REFERENCES profiles(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_checklist_escopo_alvo CHECK (
    (escopo = 'organizacao' AND portfolio_id IS NULL AND produto_id IS NULL) OR
    (escopo = 'portfolio'   AND portfolio_id IS NOT NULL AND produto_id IS NULL) OR
    (escopo = 'produto'     AND produto_id IS NOT NULL)
  )
);

-- ----------------------------------------------------------------------------
-- 2) receita_checklist_itens
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS receita_checklist_itens (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id uuid NOT NULL REFERENCES receita_checklists(id) ON DELETE CASCADE,
  chave text NOT NULL,
  rotulo text NOT NULL,
  obrigatorio boolean NOT NULL DEFAULT true,
  tipo_regra text NOT NULL CHECK (tipo_regra IN ('presenca','formato','comparacao_orcamento','valor_esperado')),
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  motivo text CHECK (motivo IN (
    'crm_ausente','crm_uf_ausente','assinatura_ausente','paciente_ausente',
    'cpf_ausente_obrigatorio','produto_divergente','concentracao_divergente',
    'quantidade_divergente','posologia_ausente','data_ausente','receita_vencida',
    'documento_ilegivel','outro'
  )),
  severidade text NOT NULL DEFAULT 'aviso' CHECK (severidade IN ('info','aviso','critico')),
  peso int NOT NULL DEFAULT 1,
  ordem int NOT NULL DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- 3) receita_modelos (receitas-modelo/exemplos por produto)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS receita_modelos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  produto_id uuid NOT NULL REFERENCES products(id),
  nome text NOT NULL,
  arquivo_path text,  -- bucket privado 'orcamento-receitas', prefixo 'modelos/'
  campos_referencia_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid REFERENCES profiles(id),
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 4) receita_conferencias (APPEND-ONLY — histórico de versões da pré-análise)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS receita_conferencias (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  quote_receita_id uuid NOT NULL REFERENCES quote_receitas(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES quotes(id),
  checklist_id uuid REFERENCES receita_checklists(id),
  checklist_versao int,
  provedor_ocr text,
  provedor_ia text,
  modelo_ia text,
  prompt_versao text,
  texto_ocr text,
  extracao_json jsonb,
  explicacao_ia text,
  status_analise text CHECK (status_analise IN (
    'sem_pendencias_aparentes','pendencias_encontradas','ilegivel',
    'divergente_do_orcamento','precisa_de_revisao_humana'
  )),
  score int CHECK (score BETWEEN 0 AND 100),
  confianca_extracao numeric(4,3) CHECK (confianca_extracao >= 0 AND confianca_extracao <= 1),
  tokens_entrada int,
  tokens_saida int,
  custo_estimado numeric(12,4),
  criado_por uuid REFERENCES profiles(id),
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 5) receita_conferencia_pendencias
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS receita_conferencia_pendencias (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conferencia_id uuid NOT NULL REFERENCES receita_conferencias(id) ON DELETE CASCADE,
  origem text NOT NULL CHECK (origem IN ('regra','extracao')),
  chave text,
  motivo text CHECK (motivo IN (
    'crm_ausente','crm_uf_ausente','assinatura_ausente','paciente_ausente',
    'cpf_ausente_obrigatorio','produto_divergente','concentracao_divergente',
    'quantidade_divergente','posologia_ausente','data_ausente','receita_vencida',
    'documento_ilegivel','outro'
  )),
  tipo text NOT NULL CHECK (tipo IN ('campo_ausente','divergencia','formato_invalido','ilegivel','suspeita')),
  severidade text NOT NULL DEFAULT 'aviso' CHECK (severidade IN ('info','aviso','critico')),
  mensagem text,
  esperado text,
  encontrado text
);

-- ----------------------------------------------------------------------------
-- Índices
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_receita_checklists_org        ON receita_checklists(organization_id);
CREATE INDEX IF NOT EXISTS idx_receita_checklists_portfolio  ON receita_checklists(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_receita_checklists_produto    ON receita_checklists(produto_id);
CREATE INDEX IF NOT EXISTS idx_receita_checklists_escopo     ON receita_checklists(escopo);
CREATE INDEX IF NOT EXISTS idx_receita_checklist_itens_cl    ON receita_checklist_itens(checklist_id);
CREATE INDEX IF NOT EXISTS idx_receita_modelos_org           ON receita_modelos(organization_id);
CREATE INDEX IF NOT EXISTS idx_receita_modelos_produto       ON receita_modelos(produto_id);
CREATE INDEX IF NOT EXISTS idx_receita_conferencias_qr       ON receita_conferencias(quote_receita_id);
CREATE INDEX IF NOT EXISTS idx_receita_conferencias_quote    ON receita_conferencias(quote_id);
CREATE INDEX IF NOT EXISTS idx_receita_conferencias_status   ON receita_conferencias(status_analise);
CREATE INDEX IF NOT EXISTS idx_receita_conferencias_criado   ON receita_conferencias(criado_em);
CREATE INDEX IF NOT EXISTS idx_receita_conferencias_org      ON receita_conferencias(organization_id);
CREATE INDEX IF NOT EXISTS idx_receita_pendencias_conf       ON receita_conferencia_pendencias(conferencia_id);
CREATE INDEX IF NOT EXISTS idx_receita_pendencias_sev        ON receita_conferencia_pendencias(severidade);
CREATE INDEX IF NOT EXISTS idx_receita_pendencias_motivo     ON receita_conferencia_pendencias(motivo);

-- ----------------------------------------------------------------------------
-- Extensão aditiva de quote_receitas (DEC-018)
-- ----------------------------------------------------------------------------
ALTER TABLE quote_receitas ADD COLUMN IF NOT EXISTS checklist_id uuid REFERENCES receita_checklists(id);
ALTER TABLE quote_receitas ADD COLUMN IF NOT EXISTS status_analise_ia text;
ALTER TABLE quote_receitas ADD COLUMN IF NOT EXISTS score_ultima_conferencia int;

-- Estender o CHECK de status_fluxo (mantém valores da DEC-018 + novos da DEC-019).
-- Remove a constraint inline antiga (nome auto-gerado) e cria uma nomeada.
DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint
   WHERE conrelid = 'quote_receitas'::regclass AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%status_fluxo%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE quote_receitas DROP CONSTRAINT %I', c);
  END IF;
END $$;

ALTER TABLE quote_receitas ADD CONSTRAINT chk_quote_receitas_status_fluxo
  CHECK (status_fluxo IN (
    'rascunho','modelo_gerado','enviada','recebida',
    'em_conferencia','validada','aprovada_operacionalmente','rejeitada','precisa_revisao_humana'
  ));

-- Constraint: só é aprovada operacionalmente com validada_por (usuário) preenchido.
-- (A IA nunca aprova — não possui user_id, logo não satisfaz esta constraint.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'chk_receita_aprovacao_humana' AND conrelid = 'quote_receitas'::regclass
  ) THEN
    ALTER TABLE quote_receitas ADD CONSTRAINT chk_receita_aprovacao_humana
      CHECK (status_fluxo <> 'aprovada_operacionalmente' OR validada_por IS NOT NULL);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- RLS (escopo por organização; padrão get_organization_id())
-- ----------------------------------------------------------------------------
ALTER TABLE receita_checklists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "receita_checklists da organizacao" ON receita_checklists;
CREATE POLICY "receita_checklists da organizacao" ON receita_checklists
  FOR ALL USING (organization_id = get_organization_id());

ALTER TABLE receita_modelos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "receita_modelos da organizacao" ON receita_modelos;
CREATE POLICY "receita_modelos da organizacao" ON receita_modelos
  FOR ALL USING (organization_id = get_organization_id());

-- Tabelas-filhas: escopo herdado do pai via EXISTS.
ALTER TABLE receita_checklist_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "receita_checklist_itens via pai" ON receita_checklist_itens;
CREATE POLICY "receita_checklist_itens via pai" ON receita_checklist_itens
  FOR ALL USING (EXISTS (
    SELECT 1 FROM receita_checklists c
     WHERE c.id = checklist_id AND c.organization_id = get_organization_id()
  ));

-- receita_conferencias: append-only também no nível RLS (apenas SELECT + INSERT).
ALTER TABLE receita_conferencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "receita_conferencias select" ON receita_conferencias;
CREATE POLICY "receita_conferencias select" ON receita_conferencias
  FOR SELECT USING (organization_id = get_organization_id());
DROP POLICY IF EXISTS "receita_conferencias insert" ON receita_conferencias;
CREATE POLICY "receita_conferencias insert" ON receita_conferencias
  FOR INSERT WITH CHECK (organization_id = get_organization_id());

ALTER TABLE receita_conferencia_pendencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "receita_pendencias via pai" ON receita_conferencia_pendencias;
CREATE POLICY "receita_pendencias via pai" ON receita_conferencia_pendencias
  FOR ALL USING (EXISTS (
    SELECT 1 FROM receita_conferencias k
     WHERE k.id = conferencia_id AND k.organization_id = get_organization_id()
  ));

-- ----------------------------------------------------------------------------
-- Append-only forte: trigger bloqueia UPDATE/DELETE (vale inclusive p/ service role)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_receita_conferencias_append_only()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'receita_conferencias é append-only: % não é permitido', TG_OP;
END $$;

DROP TRIGGER IF EXISTS trg_receita_conferencias_append_only ON receita_conferencias;
CREATE TRIGGER trg_receita_conferencias_append_only
  BEFORE UPDATE OR DELETE ON receita_conferencias
  FOR EACH ROW EXECUTE FUNCTION fn_receita_conferencias_append_only();

-- ----------------------------------------------------------------------------
-- Comentários (documentação + governança)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE receita_checklists IS 'DEC-019 Sprint 1. Checklist hierárquico (organizacao>portfolio>produto). Nenhuma ação operacional (conferir/aprovar/configurar_checklist) pode funcionar sem permissão RBAC dedicada — wiring em Sprint 3/6.';
COMMENT ON TABLE receita_conferencias IS 'DEC-019. Append-only (trigger + RLS sem update/delete). IA apenas extrai/explica; decisão = motor de regras (Sprint 2) + humano.';
COMMENT ON COLUMN quote_receitas.status_analise_ia IS 'DEC-019: último status da pré-análise (sugestão do motor de regras). Nunca aprova por si só.';
COMMENT ON CONSTRAINT chk_receita_aprovacao_humana ON quote_receitas IS 'DEC-019: aprovada_operacionalmente exige validada_por (usuário). A IA não aprova.';
