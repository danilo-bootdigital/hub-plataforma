-- Migration: 049_quotes_dados_nota_fiscal
-- Adiciona campos de snapshot para dados de emissão da nota fiscal
-- Objetivo: preservar dados no momento do orçamento

-- Campos adicionados:
-- nota_tipo_pessoa: PF ou PJ
-- nota_nome: nome para a nota
-- nota_documento: CPF ou CNPJ
-- nota_razao_social: razão social (para PJ)
-- nota_nome_fantasia: nome fantasia (para PJ)
-- nota_endereco: endereço para a nota
-- nota_ie: inscrição estadual
-- nota_im: inscrição municipal

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS nota_tipo_pessoa TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS nota_nome TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS nota_documento TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS nota_razao_social TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS nota_nome_fantasia TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS nota_endereco TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS nota_ie TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS nota_im TEXT;

-- Comentários para documentação
COMMENT ON COLUMN quotes.nota_tipo_pessoa IS 'Tipo de pessoa para emissão da nota: PF ou PJ';
COMMENT ON COLUMN quotes.nota_nome IS 'Nome/Razão Social para emissão da nota';
COMMENT ON COLUMN quotes.nota_documento IS 'CPF ou CNPJ para emissão da nota';
COMMENT ON COLUMN quotes.nota_razao_social IS 'Razão Social para emissão da nota (PJ)';
COMMENT ON COLUMN quotes.nota_nome_fantasia IS 'Nome Fantasia para emissão da nota (PJ)';
COMMENT ON COLUMN quotes.nota_endereco IS 'Endereço para emissão da nota';
COMMENT ON COLUMN quotes.nota_ie IS 'Inscrição Estadual para emissão da nota';
COMMENT ON COLUMN quotes.nota_im IS 'Inscrição Municipal para emissão da nota';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_quotes_nota_tipo_pessoa ON quotes(nota_tipo_pessoa);
