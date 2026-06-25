-- ============================================================
-- Conversas: status, responsável, tags e anotações internas
-- ============================================================

-- Enum de status da conversa
CREATE TYPE conversa_status AS ENUM (
  'nao_atendida',
  'em_atendimento',
  'aguardando_cliente',
  'finalizada'
);

-- Adicionar campos na tabela conversations
ALTER TABLE conversations
  ADD COLUMN status conversa_status NOT NULL DEFAULT 'nao_atendida',
  ADD COLUMN responsavel_id UUID REFERENCES profiles(id);

CREATE INDEX ON conversations(organization_id, status);
CREATE INDEX ON conversations(organization_id, responsavel_id);

-- ============================================================
-- Tags de conversa
-- ============================================================
CREATE TABLE conversation_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#6366f1',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, nome)
);

ALTER TABLE conversation_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags da organizacao" ON conversation_tags
  FOR ALL USING (organization_id = get_organization_id());

-- Tabela de junção conversa <-> tag
CREATE TABLE conversation_tag_links (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES conversation_tags(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, tag_id)
);

ALTER TABLE conversation_tag_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "links de tag da organizacao" ON conversation_tag_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_tag_links.conversation_id
        AND c.organization_id = get_organization_id()
    )
  );

-- ============================================================
-- Anotações internas (visíveis só para equipe)
-- ============================================================
CREATE TABLE conversation_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES profiles(id),
  conteudo TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON conversation_notes(conversation_id, criado_em);

ALTER TABLE conversation_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notas da organizacao" ON conversation_notes
  FOR ALL USING (organization_id = get_organization_id());

-- ============================================================
-- Histórico de transferências
-- ============================================================
CREATE TABLE conversation_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  de_usuario_id UUID REFERENCES profiles(id),
  para_usuario_id UUID NOT NULL REFERENCES profiles(id),
  motivo TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE conversation_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transferencias da organizacao" ON conversation_transfers
  FOR ALL USING (organization_id = get_organization_id());
