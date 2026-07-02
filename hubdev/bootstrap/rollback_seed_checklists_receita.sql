-- ROLLBACK do seed 058 — remove os checklists iniciais (itens caem por cascade).
-- Seguro: só apaga os checklists semeados por nome. Não toca em conferências/receitas.
DELETE FROM receita_checklists WHERE nome IN ('Checklist Genérico','Checklist Tirzepatida');
