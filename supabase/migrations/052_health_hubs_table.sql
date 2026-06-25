-- Migration 052: health_hubs
-- Criar tabela de Hubs de Saúde parceiros
CREATE TABLE health_hubs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  nome text NOT NULL,
  logo_url text,
  status text NOT NULL DEFAULT 'ativo',
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_hub_nome_por_org UNIQUE (organization_id, nome)
);

-- Índice para busca por organização
CREATE INDEX idx_health_hubs_org_id ON health_hubs(organization_id);

-- Habilitar RLS
ALTER TABLE health_hubs ENABLE ROW LEVEL SECURITY;

-- Policy: Usuário vê apenas hubs da sua organização
CREATE POLICY "hubs da organizacao" ON health_hubs
  FOR ALL USING (organization_id = get_organization_id());

-- Comentários para documentação
COMMENT ON TABLE health_hubs IS 'Hubs de Saúde parceiros (ex: Smart Health Company)';
COMMENT ON COLUMN health_hubs.logo_url IS 'Path no Supabase Storage para o logo do hub (Sprint 2)';
