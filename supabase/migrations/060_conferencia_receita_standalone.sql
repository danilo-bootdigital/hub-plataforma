-- Migration 060: Conferência de Receita STANDALONE (DEC-019 — emenda MVP-5′)
-- ============================================================================
-- ADITIVO PURO (Expand). Conferência de Receita INDEPENDENTE do orçamento:
-- upload → produto selecionado → pré-análise (IA extrai; motor decide) →
-- resultado documental → decisão humana. NÃO compara com orçamento, NÃO calcula
-- cobertura, NÃO bloqueia pedido, NÃO cria Central (tudo pós-MVP).
--
-- ARQUITETURA SIMPLIFICADA (MVP — sem Event Sourcing):
--   • conferencias_receita                    → tabela principal (status atual p/ leitura da UI).
--   • conferencia_receita_pendencias          → detalhe das pendências do motor.
--   • historico_decisoes_conferencia_receita  → auditoria IMUTÁVEL (append-only) das
--                                                DECISÕES HUMANAS (aprovada/reprovada/devolvida).
-- Sem trigger de projeção, sem log de eventos, sem payload. A aplicação escreve o
-- status direto na tabela principal e registra cada decisão no histórico append-only.
--
-- Estrutura PRÓPRIA E LIMPA: tabelas acopladas (quote_receitas / receita_conferencias,
-- 056/057) NÃO são tocadas — reservadas ao fluxo acoplado ao orçamento (futuro).
--
-- Storage: reuso do bucket privado, prefixo 'conferencia/'
-- (conferencia/{hub_id}/{conferencia_id}/{arquivo}). NÃO cria bucket aqui.
--
-- Diagnóstico DOCUMENTAL-ONLY: resultado_analise sem 'divergente_do_orcamento'.
-- Motor ganha regra 'limite_maximo' → CHECK de receita_checklist_itens estendido abaixo.
--
-- IA NUNCA decide: a decisão exige usuário humano (NOT NULL + CHECK). O motor cuida
-- de pendências, score e diagnóstico; a decisão é sempre humana.
--
-- RBAC (DEC-015): nenhuma ação operacional funciona sem permissão dedicada (camada app).
-- Idempotente: seguro para reexecução.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0) Extensões de CHECK nas tabelas de CHECKLIST compartilhadas (057)
--    para suportar a regra 'limite_maximo' e o motivo 'limite_maximo_excedido'.
-- ----------------------------------------------------------------------------
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
    CHECK (tipo_regra IN ('presenca','formato','comparacao_orcamento','valor_esperado','limite_maximo'));

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
      'documento_ilegivel','limite_maximo_excedido','outro'
    ));
END $$;

-- ----------------------------------------------------------------------------
-- 1) conferencias_receita — tabela principal (status atual p/ leitura da UI)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conferencias_receita (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  hub_id uuid REFERENCES hubs(id),
  product_id uuid NOT NULL REFERENCES products(id),   -- produto selecionado (referência da conferência)
  storage_path text,                                  -- bucket privado, prefixo 'conferencia/'
  arquivo_nome text,                                  -- nome original do arquivo enviado
  arquivo_tipo text,                                  -- mime (application/pdf, image/*)
  arquivo_tamanho int,                                -- bytes
  checklist_id uuid REFERENCES receita_checklists(id),
  checklist_versao int,
  -- Estado do ciclo de vida (negócio) — escrito direto pela aplicação:
  status_atual text NOT NULL DEFAULT 'criada' CHECK (status_atual IN (
    'criada','aguardando_decisao','aprovada','reprovada','devolvida_para_correcao','erro'
  )),
  -- Estado do pipeline técnico (IA/OCR):
  status_processamento text NOT NULL DEFAULT 'pendente' CHECK (status_processamento IN (
    'pendente','processando','concluido','erro'
  )),
  -- Resultado do motor (DOCUMENTAL-ONLY: sem 'divergente_do_orcamento'):
  resultado_analise text CHECK (resultado_analise IN (
    'sem_pendencias_aparentes','pendencias_encontradas','ilegivel','precisa_de_revisao_humana'
  )),
  -- Metadados da pré-análise (IA só EXTRAI; motor DECIDE):
  provedor_ia text,
  modelo_ia text,
  prompt_versao text,
  extracao_json jsonb,
  explicacao_ia text,
  score int CHECK (score BETWEEN 0 AND 100),
  confianca_extracao numeric(4,3) CHECK (confianca_extracao >= 0 AND confianca_extracao <= 1),
  -- Snapshot da ÚLTIMA decisão humana (trilha completa vive no histórico append-only):
  decidido_por uuid REFERENCES profiles(id),
  decidido_em timestamptz,
  observacao_decisao text,
  criado_por uuid REFERENCES profiles(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  -- Status de decisão exige autor humano (a IA/motor nunca decide).
  CONSTRAINT chk_conferencia_decisao_humana CHECK (
    status_atual NOT IN ('aprovada','reprovada','devolvida_para_correcao') OR decidido_por IS NOT NULL
  )
);

-- ----------------------------------------------------------------------------
-- 2) conferencia_receita_pendencias (detalhe das pendências do motor)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conferencia_receita_pendencias (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conferencia_id uuid NOT NULL REFERENCES conferencias_receita(id) ON DELETE CASCADE,
  origem text NOT NULL CHECK (origem IN ('regra','extracao')),
  chave text,
  motivo text CHECK (motivo IS NULL OR motivo IN (
    'crm_ausente','crm_uf_ausente','assinatura_ausente','paciente_ausente',
    'cpf_ausente_obrigatorio','produto_divergente','concentracao_divergente',
    'quantidade_divergente','posologia_ausente','data_ausente','receita_vencida',
    'documento_ilegivel','limite_maximo_excedido','outro'
  )),
  tipo text NOT NULL CHECK (tipo IN ('campo_ausente','divergencia','formato_invalido','ilegivel','suspeita')),
  severidade text NOT NULL DEFAULT 'aviso' CHECK (severidade IN ('info','aviso','critico')),
  mensagem text,
  esperado text,
  encontrado text
);

-- ----------------------------------------------------------------------------
-- 3) historico_decisoes_conferencia_receita — AUDITORIA IMUTÁVEL (append-only)
--    Só decisões HUMANAS. usuário (NOT NULL) + data/hora + decisão + observação.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS historico_decisoes_conferencia_receita (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conferencia_id uuid NOT NULL REFERENCES conferencias_receita(id) ON DELETE CASCADE,
  decisao text NOT NULL CHECK (decisao IN ('aprovada','reprovada','devolvida_para_correcao')),
  observacao text,
  decidido_por uuid NOT NULL REFERENCES profiles(id),   -- NOT NULL: a IA não decide
  decidido_em timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 4) Índices
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_conf_receita_org        ON conferencias_receita(organization_id);
CREATE INDEX IF NOT EXISTS idx_conf_receita_hub        ON conferencias_receita(hub_id);
CREATE INDEX IF NOT EXISTS idx_conf_receita_produto    ON conferencias_receita(product_id);
CREATE INDEX IF NOT EXISTS idx_conf_receita_status     ON conferencias_receita(status_atual);
CREATE INDEX IF NOT EXISTS idx_conf_receita_proc       ON conferencias_receita(status_processamento);
CREATE INDEX IF NOT EXISTS idx_conf_receita_criado     ON conferencias_receita(criado_em);
CREATE INDEX IF NOT EXISTS idx_conf_receita_pend_conf  ON conferencia_receita_pendencias(conferencia_id);
CREATE INDEX IF NOT EXISTS idx_conf_receita_pend_sev   ON conferencia_receita_pendencias(severidade);
CREATE INDEX IF NOT EXISTS idx_conf_hist_dec_conf      ON historico_decisoes_conferencia_receita(conferencia_id);
CREATE INDEX IF NOT EXISTS idx_conf_hist_dec_quando    ON historico_decisoes_conferencia_receita(decidido_em);

-- ----------------------------------------------------------------------------
-- 5) atualizado_em automático na tabela principal (hygiene; não é projeção)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_conferencias_receita_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_conferencias_receita_touch ON conferencias_receita;
CREATE TRIGGER trg_conferencias_receita_touch
  BEFORE UPDATE ON conferencias_receita
  FOR EACH ROW EXECUTE FUNCTION fn_conferencias_receita_touch();

-- ----------------------------------------------------------------------------
-- 6) Append-only forte no histórico de decisões: bloqueia UPDATE/DELETE
--    (vale inclusive para service role) — a auditoria de decisão é imutável.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_historico_decisoes_append_only()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'historico_decisoes_conferencia_receita é append-only: % não é permitido', TG_OP;
END $$;

DROP TRIGGER IF EXISTS trg_historico_decisoes_append_only ON historico_decisoes_conferencia_receita;
CREATE TRIGGER trg_historico_decisoes_append_only
  BEFORE UPDATE OR DELETE ON historico_decisoes_conferencia_receita
  FOR EACH ROW EXECUTE FUNCTION fn_historico_decisoes_append_only();

-- ----------------------------------------------------------------------------
-- 7) RLS (escopo por organização; padrão get_organization_id(), consistente com 057)
-- ----------------------------------------------------------------------------
ALTER TABLE conferencias_receita ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conferencias_receita da organizacao" ON conferencias_receita;
CREATE POLICY "conferencias_receita da organizacao" ON conferencias_receita
  FOR ALL USING (organization_id = get_organization_id())
  WITH CHECK (organization_id = get_organization_id());

ALTER TABLE conferencia_receita_pendencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conferencia_receita_pendencias via pai" ON conferencia_receita_pendencias;
CREATE POLICY "conferencia_receita_pendencias via pai" ON conferencia_receita_pendencias
  FOR ALL USING (EXISTS (
    SELECT 1 FROM conferencias_receita k
     WHERE k.id = conferencia_id AND k.organization_id = get_organization_id()
  ));

-- Histórico: SELECT + INSERT via organização do pai (append-only já no nível de trigger).
ALTER TABLE historico_decisoes_conferencia_receita ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "historico_decisoes select" ON historico_decisoes_conferencia_receita;
CREATE POLICY "historico_decisoes select" ON historico_decisoes_conferencia_receita
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM conferencias_receita k
     WHERE k.id = conferencia_id AND k.organization_id = get_organization_id()
  ));
DROP POLICY IF EXISTS "historico_decisoes insert" ON historico_decisoes_conferencia_receita;
CREATE POLICY "historico_decisoes insert" ON historico_decisoes_conferencia_receita
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM conferencias_receita k
     WHERE k.id = conferencia_id AND k.organization_id = get_organization_id()
  ));

-- ----------------------------------------------------------------------------
-- 8) Comentários (documentação + governança)
-- ----------------------------------------------------------------------------
COMMENT ON TABLE conferencias_receita IS 'DEC-019 emenda MVP-5′ (arquitetura simplificada, sem Event Sourcing). Tabela principal da Conferência de Receita STANDALONE (independente do orçamento). status_atual/status_processamento/resultado_analise escritos direto pela aplicação. IA só extrai; motor decide pendências/score (documental-only); decisão SEMPRE humana.';
COMMENT ON TABLE historico_decisoes_conferencia_receita IS 'DEC-019 emenda MVP-5′. Auditoria IMUTÁVEL (append-only) das decisões humanas: aprovada/reprovada/devolvida_para_correcao, com usuário (NOT NULL), data/hora e observação. A IA não decide.';
COMMENT ON COLUMN conferencias_receita.product_id IS 'DEC-019 MVP-5′: produto selecionado como referência (medicamento/concentração/limite_maximo).';
COMMENT ON CONSTRAINT chk_conferencia_decisao_humana ON conferencias_receita IS 'DEC-019: status de decisão exige decidido_por (a IA não decide).';
