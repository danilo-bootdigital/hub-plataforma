-- FIX incremental — CRM/UF (regex tolerante) + Via (match por token) — DEC-019
-- ============================================================================
-- Corrige falsos positivos de CRM/UF e Via. ROBUSTO: atualiza TODOS os itens
-- crm_uf / via_administracao (independe de qual checklist é resolvido), usando
-- jsonb_set para preservar as demais chaves do config. Idempotente.
-- Rodar no SQL Editor do HUB DEV (pnkgwfgjhijksfmofiot).
-- ============================================================================

-- ---- DIAGNÓSTICO (rode primeiro para ver o estado atual) ----
SELECT c.nome, c.escopo, c.ativo, i.config_json->>'regex' AS regex_crm
  FROM receita_checklists c
  LEFT JOIN receita_checklist_itens i ON i.checklist_id = c.id AND i.chave = 'crm_uf'
 WHERE c.ativo = true
 ORDER BY c.nome;

-- 1) CRM/UF em TODOS os checklists: aceita número+UF e UF+número (ex.: "CRM: MG 46173",
--    "104352/SP", "104352 - SP"); valida UF REAL (27 UFs) — evita falso positivo do "RM" de "CRM".
UPDATE receita_checklist_itens
   SET config_json = jsonb_set(
     coalesce(config_json, '{}'::jsonb),
     '{regex}',
     '"(\\d{4,7}[^0-9A-Za-z]+(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO))|((AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)[^0-9A-Za-z]+\\d{4,7})"'::jsonb
   )
 WHERE chave = 'crm_uf';

-- 2) Via de administração em TODOS os itens valor_esperado: passa a casar por TOKEN/substring
--    (contem), aceitando compostos como "via sc / subcutânea".
UPDATE receita_checklist_itens
   SET config_json = jsonb_set(coalesce(config_json, '{}'::jsonb), '{contem}', 'true'::jsonb)
 WHERE chave = 'via_administracao' AND tipo_regra = 'valor_esperado';

-- 3) Metadados: vias permitidas com equivalências (SC, S.C., subcutânea, via sc, …).
UPDATE product_validation_metadata
   SET valores = ARRAY['subcutânea','subcutanea','SC','S.C.','via subcutânea','via SC']
 WHERE chave = 'vias_permitidas';

-- ---- Verificação (deve mostrar o novo regex e contem:true) ----
SELECT c.nome, i.chave, i.config_json
  FROM receita_checklist_itens i
  JOIN receita_checklists c ON c.id = i.checklist_id
 WHERE i.chave IN ('crm_uf','via_administracao') AND c.ativo = true
 ORDER BY c.nome, i.chave;
