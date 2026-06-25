-- ============================================================
-- CORREÇÃO: Registros com nome "Juliane Foreze" indevido
-- Este script corrige leads e deals que receberam o nome da
-- sessão WhatsApp em vez do nome real do contato.
-- ============================================================

-- 1. Atualizar leads que têm nome "Juliane Foreze" mas cujo telefone
--    existe na tabela contacts com outro nome
UPDATE leads l
SET nome = c.nome, atualizado_em = now()
FROM contacts c
WHERE c.organization_id = l.organization_id
  AND c.telefone = l.telefone
  AND c.nome IS NOT NULL
  AND c.nome != ''
  AND l.nome = 'Juliane Foreze';

-- 2. Leads com "Juliane Foreze" que NÃO têm contato cadastrado:
--    substituir pelo telefone formatado (nunca manter nome da sessão)
UPDATE leads
SET nome = telefone, atualizado_em = now()
WHERE nome = 'Juliane Foreze';

-- 3. Atualizar títulos dos deals que estão com "Juliane Foreze"
--    usando o nome correto do lead vinculado
UPDATE deals d
SET titulo = l.nome
FROM leads l
WHERE d.lead_id = l.id
  AND d.titulo = 'Juliane Foreze'
  AND l.nome IS NOT NULL
  AND l.nome != ''
  AND l.nome != 'Juliane Foreze';

-- 4. Deals que ainda ficaram com "Juliane Foreze" (lead sem nome bom):
--    usar o telefone do lead
UPDATE deals d
SET titulo = l.telefone
FROM leads l
WHERE d.lead_id = l.id
  AND d.titulo = 'Juliane Foreze'
  AND l.telefone IS NOT NULL;
