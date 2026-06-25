-- ============================================================
-- 046: Backfill nome_contato com regra oficial
-- ============================================================
-- Ordem IDENTICA a lib/whatsapp/resolver-nome-conversa.ts:
--   1) manual    = is_name_manually_edited = true (NAO TOCAR)
--   2) contact   = contacts.nome
--   3) lead      = leads.nome
--   4) pushname  = whatsapp_push_name
--   5) phone     = 'Contato ' || telefone_externo
--                  (igual a funcao TS: "Contato " + telefone formatado;
--                   aqui usamos telefone_externo puro porque nao temos
--                   formatarTelefone() em SQL puro)
--
-- Estimativa (validada contra dados reais em 2026-06):
--   contact  ~118  (32%)
--   lead     ~246  (67%)
--   pushname ~0    (todas com pushName tambem tem lead)
--   phone    ~5    (conversas sem contato e sem lead)
-- ============================================================

UPDATE conversations c
SET
  nome_contato = COALESCE(
    NULLIF(TRIM(ct.nome), ''),                              -- 1) contact
    NULLIF(TRIM(l.nome), ''),                               -- 2) lead
    NULLIF(TRIM(c.whatsapp_push_name), ''),                 -- 3) pushname
    'Contato ' || c.telefone_externo                        -- 4) phone (prefixo igual a funcao TS)
  ),
  name_source = CASE
    WHEN NULLIF(TRIM(ct.nome), '') IS NOT NULL THEN 'contact'
    WHEN NULLIF(TRIM(l.nome), '') IS NOT NULL THEN 'lead'
    WHEN NULLIF(TRIM(c.whatsapp_push_name), '') IS NOT NULL THEN 'pushname'
    ELSE 'phone'
  END,
  atualizado_em = now()
FROM conversations c2
  LEFT JOIN contacts ct
    ON ct.id = c2.contato_id
    AND ct.organization_id = c2.organization_id
  LEFT JOIN leads l
    ON l.id = c2.lead_id
    AND l.organization_id = c2.organization_id
WHERE c.id = c2.id
  AND COALESCE(c.is_name_manually_edited, false) = false;   -- respeita manual

-- Comentarios
COMMENT ON COLUMN conversations.nome_contato IS
  'Cache do nome de exibicao. Resolvido por lib/whatsapp/resolver-nome-conversa.ts seguindo regra oficial: manual > contact > lead > pushname > phone. Quando cai em phone, valor e "Contato " + telefone.';

COMMENT ON COLUMN conversations.name_source IS
  'Origem do nome: manual (editado pelo usuario) | contact (cadastro de contato) | lead (cadastro de lead) | pushname (WhatsApp) | phone (telefone formatado).';
