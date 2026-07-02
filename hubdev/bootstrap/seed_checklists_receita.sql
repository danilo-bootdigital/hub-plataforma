-- Migration 058: SEED de checklists de Conferência de Receita (DEC-019 / MVP-3)
-- ============================================================================
-- Insere os checklists INICIAIS no banco (fonte de verdade — NÃO ficam no código):
--   • Checklist Genérico   (escopo 'organizacao')
--   • Checklist Tirzepatida (escopo 'produto' — apenas se existir o produto)
-- Sem CRUD (a administração é fase futura). Idempotente: só insere se ainda não existir.
-- config_json de cada item carrega a config da regra (regex/validadeDias/alvo/tolerancia/
-- valores) e 'camada' ('documental' | 'comercial') para o Diagnóstico da Receita.
-- Roda para TODAS as organizações; Tirzepatida é semeada por org que tenha o produto.
-- ============================================================================

DO $$
DECLARE
  org RECORD;
  cl_gen uuid;
  cl_tz uuid;
  prod_tz uuid;
BEGIN
  FOR org IN SELECT id FROM organizations LOOP

    -- ---------- Checklist Genérico (organizacao) ----------
    IF NOT EXISTS (
      SELECT 1 FROM receita_checklists
       WHERE organization_id = org.id AND nome = 'Checklist Genérico'
    ) THEN
      INSERT INTO receita_checklists (organization_id, nome, escopo, tipo_documento)
      VALUES (org.id, 'Checklist Genérico', 'organizacao', 'receita_generica')
      RETURNING id INTO cl_gen;

      INSERT INTO receita_checklist_itens
        (checklist_id, chave, rotulo, obrigatorio, tipo_regra, config_json, motivo, severidade, peso, ordem)
      VALUES
        (cl_gen,'nome_paciente','Paciente',true,'presenca','{"camada":"documental"}'::jsonb,'paciente_ausente','critico',3,1),
        (cl_gen,'prescritor_nome','Prescritor',true,'presenca','{"camada":"documental"}'::jsonb,'outro','critico',3,2),
        (cl_gen,'crm_uf','CRM/UF',true,'formato','{"camada":"documental","regex":"CRM \\d+/[A-Z]{2}"}'::jsonb,'crm_uf_ausente','critico',3,3),
        (cl_gen,'data_emissao','Data de emissão',true,'formato','{"camada":"documental","validadeDias":180}'::jsonb,'data_ausente','aviso',1,4),
        (cl_gen,'posologia','Posologia',true,'presenca','{"camada":"documental"}'::jsonb,'posologia_ausente','aviso',1,5),
        (cl_gen,'assinatura','Assinatura',true,'presenca','{"camada":"documental"}'::jsonb,'assinatura_ausente','critico',3,6),
        (cl_gen,'medicamento','Medicamento',true,'comparacao_orcamento','{"camada":"comercial","alvo":"produto"}'::jsonb,'produto_divergente','critico',3,7),
        (cl_gen,'concentracao_dose','Concentração',true,'comparacao_orcamento','{"camada":"comercial","alvo":"concentracao"}'::jsonb,'concentracao_divergente','critico',3,8),
        (cl_gen,'quantidade','Quantidade',true,'comparacao_orcamento','{"camada":"comercial","alvo":"quantidade","tolerancia":0}'::jsonb,'quantidade_divergente','critico',3,9),
        (cl_gen,'paciente_vs_orcamento','Paciente x Orçamento',false,'comparacao_orcamento','{"camada":"comercial","alvo":"paciente","campo":"nome_paciente"}'::jsonb,'outro','aviso',1,10);
      RAISE NOTICE 'Org %: Checklist Genérico semeado', org.id;
    END IF;

    -- ---------- Checklist Tirzepatida (produto) ----------
    SELECT id INTO prod_tz
      FROM products
     WHERE organization_id = org.id AND nome ILIKE '%tirzepatida%'
     LIMIT 1;

    IF prod_tz IS NULL THEN
      RAISE NOTICE 'Org %: produto Tirzepatida não encontrado — checklist Tirzepatida NAO semeado (vincular quando o produto existir)', org.id;
    ELSIF NOT EXISTS (
      SELECT 1 FROM receita_checklists
       WHERE organization_id = org.id AND nome = 'Checklist Tirzepatida'
    ) THEN
      INSERT INTO receita_checklists (organization_id, nome, escopo, produto_id, tipo_documento)
      VALUES (org.id, 'Checklist Tirzepatida', 'produto', prod_tz, 'receita_tirzepatida')
      RETURNING id INTO cl_tz;

      INSERT INTO receita_checklist_itens
        (checklist_id, chave, rotulo, obrigatorio, tipo_regra, config_json, motivo, severidade, peso, ordem)
      VALUES
        (cl_tz,'nome_paciente','Paciente',true,'presenca','{"camada":"documental"}'::jsonb,'paciente_ausente','critico',3,1),
        (cl_tz,'prescritor_nome','Prescritor',true,'presenca','{"camada":"documental"}'::jsonb,'outro','critico',3,2),
        (cl_tz,'crm_uf','CRM/UF',true,'formato','{"camada":"documental","regex":"CRM \\d+/[A-Z]{2}"}'::jsonb,'crm_uf_ausente','critico',3,3),
        (cl_tz,'cpf_paciente','CPF',true,'presenca','{"camada":"documental"}'::jsonb,'cpf_ausente_obrigatorio','aviso',1,4),
        (cl_tz,'data_emissao','Data de emissão',true,'formato','{"camada":"documental","validadeDias":90}'::jsonb,'data_ausente','aviso',1,5),
        (cl_tz,'posologia','Posologia',true,'presenca','{"camada":"documental"}'::jsonb,'posologia_ausente','aviso',1,6),
        (cl_tz,'via_administracao','Via de administração',false,'valor_esperado','{"camada":"documental","valores":["subcutanea"]}'::jsonb,'outro','info',1,7),
        (cl_tz,'assinatura','Assinatura',true,'presenca','{"camada":"documental"}'::jsonb,'assinatura_ausente','critico',3,8),
        (cl_tz,'medicamento','Medicamento',true,'comparacao_orcamento','{"camada":"comercial","alvo":"produto"}'::jsonb,'produto_divergente','critico',3,9),
        (cl_tz,'concentracao_dose','Concentração',true,'comparacao_orcamento','{"camada":"comercial","alvo":"concentracao"}'::jsonb,'concentracao_divergente','critico',3,10),
        (cl_tz,'quantidade','Quantidade',true,'comparacao_orcamento','{"camada":"comercial","alvo":"quantidade","tolerancia":0}'::jsonb,'quantidade_divergente','critico',3,11);
      RAISE NOTICE 'Org %: Checklist Tirzepatida semeado (produto %)', org.id, prod_tz;
    END IF;

  END LOOP;
END $$;
