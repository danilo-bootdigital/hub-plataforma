-- Bucket para mídia do WhatsApp (imagens, áudios, documentos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO NOTHING;

-- Leitura pública
CREATE POLICY "leitura publica whatsapp media"
ON storage.objects FOR SELECT
USING (bucket_id = 'whatsapp-media');

-- Upload apenas via service role (não precisa de policy de INSERT para service role)
