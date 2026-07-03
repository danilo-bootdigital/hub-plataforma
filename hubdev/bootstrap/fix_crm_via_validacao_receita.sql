-- FIX incremental — CRM/UF (regex tolerante) + Via (match por token) — DEC-019
-- ============================================================================
-- Corrige 2 falsos positivos, SEM tocar no motor (regra em dado) exceto o modo 'contem'
-- do valor_esperado, que é capacidade genérica de comparação (já no código).
-- Rodar no SQL Editor do HUB DEV (pnkgwfgjhijksfmofiot). Idempotente (UPDATE por chave).
-- ============================================================================

-- 1) CRM/UF: aceita "104352/SP", "104352 - SP", "CRM: 104352 - SP" etc.
--    Ainda EXIGE número (4–7 díg.) + separador (/ ou -) + UF (2 letras).
UPDATE receita_checklist_itens
   SET config_json = '{"camada":"documental","regex":"\\d{4,7}\\s*[-/]\\s*[A-Za-z]{2}"}'::jsonb
 WHERE chave = 'crm_uf'
   AND checklist_id IN (
     SELECT id FROM receita_checklists
      WHERE nome IN ('Validação de Receita — Genérico','Validação de Receita — Tirzepatida')
   );

-- 2) Via de administração: valor_esperado passa a casar por TOKEN/substring (contem),
--    aceitando compostos como "via sc / subcutânea".
UPDATE receita_checklist_itens
   SET config_json = '{"camada":"documental","origemValores":"vias_permitidas","contem":true}'::jsonb
 WHERE chave = 'via_administracao'
   AND checklist_id IN (
     SELECT id FROM receita_checklists WHERE nome = 'Validação de Receita — Tirzepatida'
   );

-- 3) Metadados: vias permitidas com equivalências (SC, S.C., subcutânea, via sc, …).
UPDATE product_validation_metadata
   SET valores = ARRAY['subcutânea','subcutanea','SC','S.C.','via subcutânea','via SC']
 WHERE chave = 'vias_permitidas';

-- ---- Verificação ----
-- (a) regex do CRM e config da via
SELECT c.nome, i.chave, i.config_json
  FROM receita_checklist_itens i
  JOIN receita_checklists c ON c.id = i.checklist_id
 WHERE i.chave IN ('crm_uf','via_administracao')
   AND c.nome IN ('Validação de Receita — Genérico','Validação de Receita — Tirzepatida')
 ORDER BY c.nome, i.chave;

-- (b) vias permitidas nos metadados
SELECT p.nome AS produto, m.valores
  FROM product_validation_metadata m
  JOIN products p ON p.id = m.product_id
 WHERE m.chave = 'vias_permitidas';
