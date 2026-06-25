-- Migration: 047_contacts_dados_profissionais
-- Adiciona campos opcionais para dados profissionais em contacts
-- Suporta médicos, dentistas, biomédicos, etc.

-- Campos adicionados:
-- tipo_pessoa: PF ou PJ
-- categoria_cliente: tipo de profissional/entidade
-- tipo_conselho: CRM, CRO, CRBM, etc.
-- numero_conselho: número do conselho profissional
-- uf_conselho: UF do conselho
-- especialidade: área de especialização

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tipo_pessoa TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS categoria_cliente TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tipo_conselho TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS numero_conselho TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS uf_conselho TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS especialidade TEXT;

-- Comentários para documentação
COMMENT ON COLUMN contacts.tipo_pessoa IS 'Tipo de pessoa: PF (Pessoa Física) ou PJ (Pessoa Jurídica)';
COMMENT ON COLUMN contacts.categoria_cliente IS 'Categoria: Médico, Dentista, Biomédico, Nutricionista, Farmacêutico, Fisioterapeuta, Clínica, Hospital, Distribuidor, Outro';
COMMENT ON COLUMN contacts.tipo_conselho IS 'Tipo de conselho profissional: CRM, CRO, CRBM, CRN, CRF, CREFITO, OUTRO';
COMMENT ON COLUMN contacts.numero_conselho IS 'Número de registro no conselho profissional';
COMMENT ON COLUMN contacts.uf_conselho IS 'UF de registro do conselho profissional';
COMMENT ON COLUMN contacts.especialidade IS 'Área de especialização do profissional';

-- Índices para performance em buscas
CREATE INDEX IF NOT EXISTS idx_contacts_tipo_pessoa ON contacts(tipo_pessoa);
CREATE INDEX IF NOT EXISTS idx_contacts_categoria_cliente ON contacts(categoria_cliente);
CREATE INDEX IF NOT EXISTS idx_contacts_tipo_conselho ON contacts(tipo_conselho);
