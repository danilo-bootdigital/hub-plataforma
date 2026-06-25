-- Função para normalizar telefone (remove tudo exceto dígitos, remove DDI 55 se presente)
CREATE OR REPLACE FUNCTION normalize_phone(phone text)
RETURNS text AS $$
DECLARE
  digits text;
BEGIN
  IF phone IS NULL THEN RETURN NULL; END IF;
  digits := regexp_replace(phone, '[^0-9]', '', 'g');
  -- Remover DDI 55 se tiver 12 ou 13 dígitos
  IF length(digits) >= 12 AND left(digits, 2) = '55' THEN
    digits := substring(digits from 3);
  END IF;
  RETURN digits;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Índice para busca rápida por telefone normalizado em contacts
CREATE INDEX IF NOT EXISTS idx_contacts_phone_normalized
  ON contacts (normalize_phone(telefone));

-- Índice para busca rápida por telefone normalizado em leads
CREATE INDEX IF NOT EXISTS idx_leads_phone_normalized
  ON leads (normalize_phone(telefone));

-- Agora corrigir os leads que ficaram com telefone como nome
-- buscando pelo telefone normalizado na tabela contacts
UPDATE leads l
SET nome = c.nome, atualizado_em = now()
FROM contacts c
WHERE c.organization_id = l.organization_id
  AND normalize_phone(c.telefone) = normalize_phone(l.telefone)
  AND c.nome IS NOT NULL
  AND c.nome != ''
  AND (
    l.nome IS NULL
    OR l.nome = ''
    OR l.nome = 'Contato WhatsApp'
    OR l.nome ~ '^\d{8,15}$'
    OR l.nome ~ '^\d{2}\d{8,9}$'
    OR l.nome = l.telefone
  );

-- Corrigir títulos dos deals
UPDATE deals d
SET titulo = l.nome
FROM leads l
WHERE d.lead_id = l.id
  AND l.nome IS NOT NULL
  AND l.nome != ''
  AND l.nome != 'Contato WhatsApp'
  AND l.nome != l.telefone
  AND (
    d.titulo ~ '^\d{8,15}$'
    OR d.titulo ~ '^\d{2}\d{8,9}$'
    OR d.titulo = 'Contato WhatsApp'
    OR d.titulo = 'Novo Lead'
    OR d.titulo = l.telefone
  );
