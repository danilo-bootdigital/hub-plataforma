-- Migration 028: Reimportar produtos Medsate
-- Executar no Supabase SQL Editor

DO $$
DECLARE
  v_supplier_id UUID;
  v_org_id UUID;
  v_cat_injetaveis UUID;
  v_cat_protocolos_im UUID;
  v_cat_protocolos_ev UUID;
  v_cat_protocolos_esteticos UUID;
BEGIN
  SELECT id, organization_id INTO v_supplier_id, v_org_id
  FROM suppliers WHERE LOWER(nome) LIKE '%medsat%' LIMIT 1;

  IF v_supplier_id IS NULL THEN
    RAISE EXCEPTION 'Fornecedor Medsate não encontrado';
  END IF;

  DELETE FROM products WHERE supplier_id = v_supplier_id;
  DELETE FROM supplier_categories WHERE supplier_id = v_supplier_id;

  INSERT INTO supplier_categories (organization_id, supplier_id, nome) VALUES (v_org_id, v_supplier_id, 'Injetáveis') RETURNING id INTO v_cat_injetaveis;
  INSERT INTO supplier_categories (organization_id, supplier_id, nome) VALUES (v_org_id, v_supplier_id, 'Protocolos IM') RETURNING id INTO v_cat_protocolos_im;
  INSERT INTO supplier_categories (organization_id, supplier_id, nome) VALUES (v_org_id, v_supplier_id, 'Protocolos EV') RETURNING id INTO v_cat_protocolos_ev;
  INSERT INTO supplier_categories (organization_id, supplier_id, nome) VALUES (v_org_id, v_supplier_id, 'Protocolos Estéticos') RETURNING id INTO v_cat_protocolos_esteticos;

  -- Injetáveis
  INSERT INTO products (organization_id, supplier_id, category_id, nome, via_administracao, apresentacao, preco_unitario, unidade, ativo)
  VALUES (v_org_id, v_supplier_id, v_cat_injetaveis, '17-Alfa-Estradiol (0,025%) - 0,25 mg/1 mL - Box | 10 ampolas', 'ID', 'Box | 10 ampolas', 70.77, 'box', true);
  INSERT INTO products (organization_id, supplier_id, category_id, nome, via_administracao, apresentacao, preco_unitario, unidade, ativo)
  VALUES (v_org_id, v_supplier_id, v_cat_injetaveis, '5-Hidroxitriptofano (0,2%) - 4 mg/2 mL - Box | 10 ampolas', 'EV/IM/SC', 'Box | 10 ampolas', 55.38, 'box', true);
  INSERT INTO products (organization_id, supplier_id, category_id, nome, via_administracao, apresentacao, preco_unitario, unidade, ativo)
  VALUES (v_org_id, v_supplier_id, v_cat_injetaveis, 'Acetil L-Carnitina (40%) - 800 mg/2 mL- Box | 10 ampolas', 'EV/IM', 'Box | 10 ampolas', 160.15, 'box', true);
  INSERT INTO products (organization_id, supplier_id, category_id, nome, via_administracao, apresentacao, preco_unitario, unidade, ativo)
  VALUES (v_org_id, v_supplier_id, v_cat_injetaveis, 'Ácido Lipóico (0,5%) - 10 mg/2 mL- Box | 10 ampolas', 'EV', 'Box | 10 ampolas', 107.54, 'box', true);
  INSERT INTO products (organization_id, supplier_id, category_id, nome, via_administracao, apresentacao, preco_unitario, unidade, ativo)
  VALUES (v_org_id, v_supplier_id, v_cat_injetaveis, 'Azul de Metileno (2,0%) - 40 mg/2 mL- Box | 10 ampolas', 'EV', 'Box | 10 ampolas', 107.69, 'box', true);
  INSERT INTO products (organization_id, supplier_id, category_id, nome, via_administracao, apresentacao, preco_unitario, unidade, ativo)
  VALUES (v_org_id, v_supplier_id, v_cat_injetaveis, 'Complexo B (sem B1) - 2 mL- Box | 10 ampolas', 'EV/IM/SC', 'Box | 10 ampolas', 69.23, 'box', true);
  INSERT INTO products (organization_id, supplier_id, category_id, nome, via_administracao, apresentacao, preco_unitario, unidade, ativo)
  VALUES (v_org_id, v_supplier_id, v_cat_injetaveis, 'Furosemida (0,5%) - 10 mg/2 mL- Box | 10 ampolas', 'IM/SC/ID', 'Box | 10 ampolas', 100.00, 'box', true);
  INSERT INTO products (organization_id, supplier_id, category_id, nome, via_administracao, apresentacao, preco_unitario, unidade, ativo)
  VALUES (v_org_id, v_supplier_id, v_cat_injetaveis, 'L-Carnitina (30%) - 600 mg/2 mL- Box | 10 ampolas', 'EV/IM/SC/ID', 'Box | 10 ampolas', 146.15, 'box', true);
  INSERT INTO products (organization_id, supplier_id, category_id, nome, via_administracao, apresentacao, preco_unitario, unidade, ativo)
  VALUES (v_org_id, v_supplier_id, v_cat_injetaveis, 'Melatonina (0,5%) - 10 mg/2 mL- Box | 10 ampolas', 'EV/IM/SC/ID', 'Box | 10 ampolas', 275.38, 'box', true);
  INSERT INTO products (organization_id, supplier_id, category_id, nome, via_administracao, apresentacao, preco_unitario, unidade, ativo)
  VALUES (v_org_id, v_supplier_id, v_cat_injetaveis, 'Vitamina C - Ácido Ascórbico (20%) - 400 mg/2 mL- Box | 10 ampolas', 'EV/IM/SC/ID', 'Box | 10 ampolas', 76.92, 'box', true);

  -- Protocolos IM
  INSERT INTO products (organization_id, supplier_id, category_id, nome, via_administracao, apresentacao, preco_unitario, unidade, ativo)
  VALUES (v_org_id, v_supplier_id, v_cat_protocolos_im, 'Emagrecimento e ganho de massa magra - Box | 10 sessões', 'IM', 'Box | 10 sessões', 441.54, 'box', true);
  INSERT INTO products (organization_id, supplier_id, category_id, nome, via_administracao, apresentacao, preco_unitario, unidade, ativo)
  VALUES (v_org_id, v_supplier_id, v_cat_protocolos_im, 'Performance esportiva - Box | 10 sessões', 'IM', 'Box | 10 sessões', 655.38, 'box', true);
  INSERT INTO products (organization_id, supplier_id, category_id, nome, via_administracao, apresentacao, preco_unitario, unidade, ativo)
  VALUES (v_org_id, v_supplier_id, v_cat_protocolos_im, 'Detox hepático - Box | 10 sessões', 'IM', 'Box | 10 sessões', 576.92, 'box', true);
  INSERT INTO products (organization_id, supplier_id, category_id, nome, via_administracao, apresentacao, preco_unitario, unidade, ativo)
  VALUES (v_org_id, v_supplier_id, v_cat_protocolos_im, 'Sono reparador - Box | 10 sessões', 'IM', 'Box | 10 sessões', 443.08, 'box', true);

  -- Protocolos EV
  INSERT INTO products (organization_id, supplier_id, category_id, nome, via_administracao, apresentacao, preco_unitario, unidade, ativo)
  VALUES (v_org_id, v_supplier_id, v_cat_protocolos_ev, 'Energia mitocondrial - Box | 10 sessões', 'EV/IM', 'Box | 10 sessões', 1073.85, 'box', true);
  INSERT INTO products (organization_id, supplier_id, category_id, nome, via_administracao, apresentacao, preco_unitario, unidade, ativo)
  VALUES (v_org_id, v_supplier_id, v_cat_protocolos_ev, 'Detox hepático - Box | 10 sessões', 'EV/IM', 'Box | 10 sessões', 1038.46, 'box', true);
  INSERT INTO products (organization_id, supplier_id, category_id, nome, via_administracao, apresentacao, preco_unitario, unidade, ativo)
  VALUES (v_org_id, v_supplier_id, v_cat_protocolos_ev, 'Performance esportiva - Box | 10 sessões', 'EV', 'Box | 10 sessões', 1038.46, 'box', true);
  INSERT INTO products (organization_id, supplier_id, category_id, nome, via_administracao, apresentacao, preco_unitario, unidade, ativo)
  VALUES (v_org_id, v_supplier_id, v_cat_protocolos_ev, 'Ansiedade e regulação do sono - Box | 10 sessões', 'EV', 'Box | 10 sessões', 476.92, 'box', true);

  -- Protocolos Estéticos
  INSERT INTO products (organization_id, supplier_id, category_id, nome, via_administracao, apresentacao, preco_unitario, unidade, ativo)
  VALUES (v_org_id, v_supplier_id, v_cat_protocolos_esteticos, 'Gordura localizada - Box | 10 sessões', 'SC', 'Box | 10 sessões', 341.54, 'box', true);
  INSERT INTO products (organization_id, supplier_id, category_id, nome, via_administracao, apresentacao, preco_unitario, unidade, ativo)
  VALUES (v_org_id, v_supplier_id, v_cat_protocolos_esteticos, 'Flacidez - Box | 10 sessões', 'ID/retroinjeção', 'Box | 10 sessões', 472.15, 'box', true);
  INSERT INTO products (organization_id, supplier_id, category_id, nome, via_administracao, apresentacao, preco_unitario, unidade, ativo)
  VALUES (v_org_id, v_supplier_id, v_cat_protocolos_esteticos, 'Alopecia - Box | 10 sessões', 'ID', 'Box | 10 sessões', 595.38, 'box', true);
  INSERT INTO products (organization_id, supplier_id, category_id, nome, via_administracao, apresentacao, preco_unitario, unidade, ativo)
  VALUES (v_org_id, v_supplier_id, v_cat_protocolos_esteticos, 'Melasma resistente (Fórmula A) - Box | 10 sessões', 'ID / MMP', 'Box | 10 sessões', 770.77, 'box', true);

END $$;