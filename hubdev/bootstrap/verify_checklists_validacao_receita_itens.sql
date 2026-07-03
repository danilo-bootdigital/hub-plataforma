-- VERIFICAÇÃO — itens dos checklists da Validação de Receita (após o incremental)
-- Rodar no SQL Editor do HUB DEV.

-- (1) Contagem por checklist + severidades. Esperado: Genérico 17 (8 crítico / 8 aviso / 1 info);
--     Tirzepatida 18 (8 crítico / 8 aviso / 2 info).
SELECT c.nome,
       count(i.*)                                        AS regras,
       count(*) FILTER (WHERE i.severidade='critico')    AS criticas,
       count(*) FILTER (WHERE i.severidade='aviso')      AS avisos,
       count(*) FILTER (WHERE i.severidade='info')       AS infos
FROM receita_checklists c
LEFT JOIN receita_checklist_itens i ON i.checklist_id = c.id
WHERE c.nome IN ('Validação de Receita — Genérico','Validação de Receita — Tirzepatida')
GROUP BY c.nome
ORDER BY c.nome;

-- (2) Duplicatas por (checklist, chave). Esperado: NENHUMA linha.
SELECT c.nome, i.chave, count(*)
FROM receita_checklist_itens i
JOIN receita_checklists c ON c.id = i.checklist_id
WHERE c.nome IN ('Validação de Receita — Genérico','Validação de Receita — Tirzepatida')
GROUP BY c.nome, i.chave
HAVING count(*) > 1;

-- (3) Itens da Tirzepatida em ordem (confere origemValores/severidade).
SELECT i.ordem, i.chave, i.tipo_regra, i.severidade, i.peso, i.config_json->>'origemValores' AS origem_valores
FROM receita_checklist_itens i
JOIN receita_checklists c ON c.id = i.checklist_id
WHERE c.nome = 'Validação de Receita — Tirzepatida'
ORDER BY i.ordem;
