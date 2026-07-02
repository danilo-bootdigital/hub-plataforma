-- Migration 056: Receita do Orçamento (quote_receitas)
-- Escopo: adicionar Receita ao detalhe do orçamento (carregamento sob demanda).
-- A tabela guarda o MODELO/RASCUNHO gerado a partir do orçamento (texto_modelo)
-- E os metadados do arquivo assinado (Storage privado). Relação 1:N com quotes.
-- Idempotente: seguro para reexecução (IF NOT EXISTS / DROP POLICY IF EXISTS).

-- ============================================================
-- Tabela quote_receitas
-- ============================================================
CREATE TABLE IF NOT EXISTS quote_receitas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,

  -- Modelo/rascunho da receita gerado a partir do orçamento
  texto_modelo text,

  -- Fluxo da receita
  status_fluxo text NOT NULL DEFAULT 'rascunho'
    CHECK (status_fluxo IN ('rascunho','modelo_gerado','enviada','recebida','validada','rejeitada')),

  -- Metadados do arquivo assinado (o binário vive no Supabase Storage, NUNCA no banco)
  arquivo_path text,          -- caminho no bucket privado
  arquivo_nome text,          -- nome original do arquivo
  arquivo_tipo text,          -- mime type
  arquivo_tamanho bigint,     -- bytes
  enviado_em timestamptz,     -- data de upload do arquivo assinado

  -- Validação
  validada_por uuid REFERENCES profiles(id),
  validada_em timestamptz,
  validacao_comentario text,

  criado_por uuid REFERENCES profiles(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Índices mínimos (orcamento_id / status / created_at → quote_id / status_fluxo / criado_em)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_quote_receitas_quote_id ON quote_receitas(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_receitas_status ON quote_receitas(status_fluxo);
CREATE INDEX IF NOT EXISTS idx_quote_receitas_criado_em ON quote_receitas(criado_em);
CREATE INDEX IF NOT EXISTS idx_quote_receitas_org_id ON quote_receitas(organization_id);

-- ============================================================
-- RLS: cada organização vê apenas suas receitas (padrão do projeto)
-- ============================================================
ALTER TABLE quote_receitas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "receitas da organizacao" ON quote_receitas;
CREATE POLICY "receitas da organizacao" ON quote_receitas
  FOR ALL USING (organization_id = get_organization_id());

-- ============================================================
-- Índices auxiliares em quotes (requisito de performance da listagem)
-- Não altera colunas nem toca no legado leads/suppliers.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_criado_em ON quotes(criado_em DESC);

-- ============================================================
-- Bucket PRIVADO para as receitas assinadas (dado sensível).
-- Sem policy de leitura pública: acesso somente via service role + signed URL.
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('orcamento-receitas', 'orcamento-receitas', false)
ON CONFLICT (id) DO NOTHING;

-- Comentários
COMMENT ON TABLE quote_receitas IS 'Receitas do orçamento: modelo/rascunho (texto_modelo) + metadados do arquivo assinado no Storage. 1:N com quotes.';
COMMENT ON COLUMN quote_receitas.status_fluxo IS 'rascunho | modelo_gerado | enviada | recebida | validada | rejeitada';
COMMENT ON COLUMN quote_receitas.arquivo_path IS 'Caminho no bucket privado orcamento-receitas. Binário nunca fica no banco.';
