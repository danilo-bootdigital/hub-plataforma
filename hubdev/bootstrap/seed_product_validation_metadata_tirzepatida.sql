-- SEED — Metadados de validação do produto Tirzepatida (DEC-019 MVP-5′)
-- ============================================================================
-- Rodar no SQL Editor do HUB DEV DEPOIS de aplicar a 061 e de existir o produto.
-- Idempotente (ON CONFLICT em UNIQUE(product_id, chave)). São DADOS do produto:
-- ajustar aliases/concentrações/vias/limite aqui NÃO exige mexer em seed de checklist,
-- helper nem motor. Valores exemplo — confirmar regra clínica/comercial.
-- ============================================================================
DO $$
DECLARE org RECORD; prod uuid;
BEGIN
  FOR org IN SELECT id FROM organizations LOOP
    SELECT id INTO prod FROM products WHERE organization_id = org.id AND nome ILIKE '%tirzepatida%' LIMIT 1;
    IF prod IS NULL THEN
      RAISE WARNING 'Org %: produto Tirzepatida NAO encontrado — metadados NAO semeados. Reexecute apos cadastrar o produto.', org.id;
    ELSE
      INSERT INTO product_validation_metadata(organization_id, product_id, chave, tipo, valores, valor_num) VALUES
        (org.id, prod, 'medicamento_aliases',      'lista',  ARRAY['Tirzepatida','Mounjaro','Zepbound'], NULL),
        (org.id, prod, 'concentracoes_permitidas', 'lista',  ARRAY['2.5 mg','5 mg','7.5 mg','10 mg','12.5 mg','15 mg'], NULL),
        (org.id, prod, 'vias_permitidas',          'lista',  ARRAY['subcutânea','subcutanea','SC','S.C.','via subcutânea','via SC'], NULL),
        (org.id, prod, 'limite_maximo_por_receita','numero', NULL, 3)
      ON CONFLICT (product_id, chave) DO NOTHING;
      RAISE NOTICE 'Org %: metadados Tirzepatida semeados (produto %)', org.id, prod;
    END IF;
  END LOOP;
END $$;
