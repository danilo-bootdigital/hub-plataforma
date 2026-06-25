-- Migration 055: public-assets bucket
-- Bucket para logos de hubs e outros assets públicos
-- Idempotente: seguro para rodar múltiplas vezes

-- Criar bucket public-assets (público para leitura)
INSERT INTO storage.buckets (id, name, public)
VALUES ('public-assets', 'public-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Remover policy existente se houver (para permitir re-execução)
DROP POLICY IF EXISTS "leitura publica public-assets" ON storage.objects;

-- Policy: Leitura pública para todos os arquivos do bucket
CREATE POLICY "leitura publica public-assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'public-assets');

-- Upload/Update/Delete: Apenas via service role (não cria policy pública)
-- O server action já valida admin/gestor e organization_id antes de fazer upload
