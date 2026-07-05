-- Migration 067: Identidade do Hub — campos de branding (DEC-021, Config-1)
-- ============================================================================
-- ADITIVO PURO (Expand). Idempotente (ADD COLUMN IF NOT EXISTS). Não remove nada.
-- Preenche a tela "Configurações → Identidade" com os campos da spec.
-- White-label (theming) é a Config-2; aqui só criamos/armazenamos os campos.
--
-- Aplicar no HUB DEV (pnkgwfgjhijksfmofiot) via SQL Editor ANTES do deploy da app.
-- ============================================================================

ALTER TABLE hubs ADD COLUMN IF NOT EXISTS nome_fantasia   text;
ALTER TABLE hubs ADD COLUMN IF NOT EXISTS favicon_url      text;
ALTER TABLE hubs ADD COLUMN IF NOT EXISTS cor_primaria     text;   -- hex, ex.: #0F766E
ALTER TABLE hubs ADD COLUMN IF NOT EXISTS cor_secundaria   text;   -- hex
ALTER TABLE hubs ADD COLUMN IF NOT EXISTS whatsapp         text;   -- WhatsApp principal (telefone segue p/ PDF)
ALTER TABLE hubs ADD COLUMN IF NOT EXISTS redes_sociais    jsonb NOT NULL DEFAULT '{}'::jsonb; -- {facebook,linkedin,youtube,tiktok,...}

COMMENT ON COLUMN hubs.nome_fantasia IS 'DEC-021: nome fantasia do Hub (branding).';
COMMENT ON COLUMN hubs.favicon_url   IS 'DEC-021: favicon do Hub (white-label; bucket público public-assets).';
COMMENT ON COLUMN hubs.cor_primaria  IS 'DEC-021: cor primária (hex) para theming white-label (Config-2).';
COMMENT ON COLUMN hubs.cor_secundaria IS 'DEC-021: cor secundária (hex) para theming white-label (Config-2).';
COMMENT ON COLUMN hubs.whatsapp      IS 'DEC-021: WhatsApp principal do Hub (contato); hubs.telefone permanece para o PDF de orçamento.';
COMMENT ON COLUMN hubs.redes_sociais IS 'DEC-021: redes sociais além do Instagram (que segue em hubs.instagram): {facebook,linkedin,youtube,tiktok}.';
