-- VERIFICAÇÃO — checklists ATIVOS do módulo Validação de Receita (DEC-019 MVP-5′)
-- Rodar no SQL Editor do HUB DEV DEPOIS da seed. Mostra nome, escopo, produto e nº de regras.
-- Após a PARTE 2 da seed, só os checklists documentais standalone ficam ativos.
SELECT
  c.nome                              AS nome,
  c.escopo                            AS escopo,
  p.nome                              AS produto_vinculado,
  count(i.id)                         AS qtd_regras
FROM receita_checklists c
LEFT JOIN products p                  ON p.id = c.produto_id
LEFT JOIN receita_checklist_itens i   ON i.checklist_id = c.id
WHERE c.ativo = true
GROUP BY c.nome, c.escopo, p.nome
ORDER BY c.escopo, c.nome;
