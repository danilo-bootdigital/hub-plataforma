-- SEED — Checklists STANDALONE do módulo Validação de Receita (DEC-019 emenda MVP-5′)
-- ============================================================================
-- Objetivo: garantir que rodarPreAnalise NUNCA falhe por ausência de checklist
-- quando houver produto selecionado. Cria checklists DOCUMENTAL-ONLY (sem nenhuma
-- regra 'comparacao_orcamento'), resolvíveis por Produto > Organização.
--
-- Rodar no SQL Editor do HUB DEV (pnkgwfgjhijksfmofiot). Idempotente (só insere se
-- ainda não existir, por nome). NÃO deixa dados de teste.
--
-- Regras incluídas (extração estendida: medicamento/concentracao/quantidade em `campos`):
--   Genérico:   paciente · prescritor · CRM/UF · data (validade) · posologia · assinatura · medicamento (presença)
--   Tirzepatida: + CPF · via · MEDICAMENTO · CONCENTRAÇÃO · QUANTIDADE máxima
-- SEM hardcode: as regras da Tirzepatida (medicamento/concentração/via/limite) declaram
--   `origemValores:"<chave>"` e são HIDRATADAS de product_validation_metadata (migration 061)
--   na composição (server action), via helper hidratarChecklistComMetadadosProduto. Motor intacto.
--   Chaves: medicamento_aliases · concentracoes_permitidas · vias_permitidas · limite_maximo_por_receita.
-- Legibilidade NÃO é item de checklist: é tratada pelo MOTOR via confiança da extração
--   (motivo 'documento_ilegivel' quando a leitura fica abaixo do limiar). Documental por natureza.
-- Genérico valida apenas PRESENÇA do medicamento (é produto-agnóstico); os valores esperados
--   (nome/concentração/via/limite) são validados no checklist de PRODUTO (Tirzepatida).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PARTE 1 (ADITIVA, SEGURA) — cria os checklists documentais standalone.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  org RECORD;
  cl_gen uuid;
  cl_tz uuid;
  prod_tz uuid;
BEGIN
  FOR org IN SELECT id FROM organizations LOOP

    -- ---------- Validação de Receita — Genérico (organizacao) ----------
    IF NOT EXISTS (
      SELECT 1 FROM receita_checklists
       WHERE organization_id = org.id AND nome = 'Validação de Receita — Genérico'
    ) THEN
      INSERT INTO receita_checklists (organization_id, nome, escopo, tipo_documento)
      VALUES (org.id, 'Validação de Receita — Genérico', 'organizacao', 'validacao_receita_generica')
      RETURNING id INTO cl_gen;

      INSERT INTO receita_checklist_itens
        (checklist_id, chave, rotulo, obrigatorio, tipo_regra, config_json, motivo, severidade, peso, ordem)
      VALUES
        -- EMITENTE / documento
        (cl_gen,'prescritor_nome','Nome do emitente/prescritor',true,'presenca','{"camada":"documental"}'::jsonb,'outro','critico',3,1),
        (cl_gen,'crm_uf','CRM',true,'formato','{"camada":"documental","regex":"(\\d{4,7}[\\s/.-]+(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO))|((AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)[\\s/.-]+\\d{4,7})"}'::jsonb,'crm_uf_ausente','critico',3,2),
        (cl_gen,'emitente_cpf','CPF do emitente',true,'presenca','{"camada":"documental"}'::jsonb,'outro','aviso',1,3),
        (cl_gen,'emitente_endereco','Endereço do emitente',true,'presenca','{"camada":"documental"}'::jsonb,'outro','aviso',1,4),
        (cl_gen,'emitente_cidade_uf','Cidade/UF do emitente',true,'presenca','{"camada":"documental"}'::jsonb,'outro','aviso',1,5),
        (cl_gen,'emitente_telefone','Telefone do emitente',true,'presenca','{"camada":"documental"}'::jsonb,'outro','info',1,6),
        (cl_gen,'assinatura','Assinatura',true,'presenca','{"camada":"documental"}'::jsonb,'assinatura_ausente','critico',3,7),
        (cl_gen,'data_emissao','Data de emissão',true,'formato','{"camada":"documental","validadeDias":180}'::jsonb,'data_ausente','aviso',1,8),
        -- PACIENTE
        (cl_gen,'nome_paciente','Nome completo do paciente',true,'presenca','{"camada":"documental"}'::jsonb,'paciente_ausente','critico',3,9),
        (cl_gen,'paciente_documento','RG/CPF do paciente',true,'presenca','{"camada":"documental"}'::jsonb,'outro','aviso',1,10),
        (cl_gen,'paciente_data_nascimento','Data de nascimento do paciente',true,'presenca','{"camada":"documental"}'::jsonb,'outro','aviso',1,11),
        (cl_gen,'paciente_endereco','Endereço do paciente',true,'presenca','{"camada":"documental"}'::jsonb,'outro','aviso',1,12),
        (cl_gen,'paciente_cidade_uf','Cidade/UF do paciente',true,'presenca','{"camada":"documental"}'::jsonb,'outro','aviso',1,13),
        -- MEDICAMENTO (genérico: presença; sem valores esperados por ser produto-agnóstico)
        (cl_gen,'medicamento','Medicamento',true,'presenca','{"camada":"documental"}'::jsonb,'outro','critico',3,14),
        (cl_gen,'concentracao','Concentração',true,'presenca','{"camada":"documental"}'::jsonb,'outro','critico',3,15),
        (cl_gen,'quantidade','Quantidade',true,'presenca','{"camada":"documental"}'::jsonb,'outro','critico',3,16),
        (cl_gen,'posologia','Posologia',true,'presenca','{"camada":"documental"}'::jsonb,'posologia_ausente','critico',3,17);
      RAISE NOTICE 'Org %: "Validação de Receita — Genérico" semeado (17 regras)', org.id;
    ELSE
      RAISE NOTICE 'Org %: "Validação de Receita — Genérico" já existe — pulado', org.id;
    END IF;

    -- ---------- Validação de Receita — Tirzepatida (produto) ----------
    SELECT id INTO prod_tz
      FROM products
     WHERE organization_id = org.id AND nome ILIKE '%tirzepatida%'
     LIMIT 1;

    IF prod_tz IS NULL THEN
      RAISE WARNING 'Org %: produto (nome ILIKE %%tirzepatida%%) NAO encontrado — checklist Tirzepatida NAO semeado. REEXECUTE apos cadastrar o produto (idempotente).', org.id;
    ELSIF NOT EXISTS (
      SELECT 1 FROM receita_checklists
       WHERE organization_id = org.id AND nome = 'Validação de Receita — Tirzepatida'
    ) THEN
      INSERT INTO receita_checklists (organization_id, nome, escopo, produto_id, tipo_documento)
      VALUES (org.id, 'Validação de Receita — Tirzepatida', 'produto', prod_tz, 'validacao_receita_tirzepatida')
      RETURNING id INTO cl_tz;

      INSERT INTO receita_checklist_itens
        (checklist_id, chave, rotulo, obrigatorio, tipo_regra, config_json, motivo, severidade, peso, ordem)
      VALUES
        -- EMITENTE / documento
        (cl_tz,'prescritor_nome','Nome do emitente/prescritor',true,'presenca','{"camada":"documental"}'::jsonb,'outro','critico',3,1),
        (cl_tz,'crm_uf','CRM',true,'formato','{"camada":"documental","regex":"(\\d{4,7}[\\s/.-]+(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO))|((AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)[\\s/.-]+\\d{4,7})"}'::jsonb,'crm_uf_ausente','critico',3,2),
        (cl_tz,'emitente_cpf','CPF do emitente',true,'presenca','{"camada":"documental"}'::jsonb,'outro','aviso',1,3),
        (cl_tz,'emitente_endereco','Endereço do emitente',true,'presenca','{"camada":"documental"}'::jsonb,'outro','aviso',1,4),
        (cl_tz,'emitente_cidade_uf','Cidade/UF do emitente',true,'presenca','{"camada":"documental"}'::jsonb,'outro','aviso',1,5),
        (cl_tz,'emitente_telefone','Telefone do emitente',true,'presenca','{"camada":"documental"}'::jsonb,'outro','info',1,6),
        (cl_tz,'assinatura','Assinatura',true,'presenca','{"camada":"documental"}'::jsonb,'assinatura_ausente','critico',3,7),
        (cl_tz,'data_emissao','Data de emissão',true,'formato','{"camada":"documental","validadeDias":90}'::jsonb,'data_ausente','aviso',1,8),
        -- PACIENTE
        (cl_tz,'nome_paciente','Nome completo do paciente',true,'presenca','{"camada":"documental"}'::jsonb,'paciente_ausente','critico',3,9),
        (cl_tz,'paciente_documento','RG/CPF do paciente',true,'presenca','{"camada":"documental"}'::jsonb,'outro','aviso',1,10),
        (cl_tz,'paciente_data_nascimento','Data de nascimento do paciente',true,'presenca','{"camada":"documental"}'::jsonb,'outro','aviso',1,11),
        (cl_tz,'paciente_endereco','Endereço do paciente',true,'presenca','{"camada":"documental"}'::jsonb,'outro','aviso',1,12),
        (cl_tz,'paciente_cidade_uf','Cidade/UF do paciente',true,'presenca','{"camada":"documental"}'::jsonb,'outro','aviso',1,13),
        (cl_tz,'via_administracao','Via de administração',false,'valor_esperado','{"camada":"documental","origemValores":"vias_permitidas","contem":true}'::jsonb,'outro','info',1,14),
        -- MEDICAMENTO — valores hidratados de product_validation_metadata (sem hardcode).
        (cl_tz,'medicamento','Medicamento esperado',true,'valor_esperado','{"camada":"documental","origemValores":"medicamento_aliases"}'::jsonb,'produto_divergente','critico',3,15),
        (cl_tz,'concentracao','Concentração esperada',true,'valor_esperado','{"camada":"documental","origemValores":"concentracoes_permitidas"}'::jsonb,'concentracao_divergente','critico',3,16),
        (cl_tz,'quantidade','Quantidade máxima por receita',true,'limite_maximo','{"camada":"documental","campo":"quantidade","origemValores":"limite_maximo_por_receita"}'::jsonb,'limite_maximo_excedido','critico',3,17),
        (cl_tz,'posologia','Posologia',true,'presenca','{"camada":"documental"}'::jsonb,'posologia_ausente','critico',3,18);
      RAISE NOTICE 'Org %: "Validação de Receita — Tirzepatida" semeado (18 regras; produto %)', org.id, prod_tz;
    ELSE
      RAISE NOTICE 'Org %: "Validação de Receita — Tirzepatida" já existe — pulado', org.id;
    END IF;

  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- PARTE 2 (RECOMENDADA · REVERSÍVEL) — desativar checklists COMERCIAIS/ACOPLADOS
--   para o fluxo standalone (documental) resolver de forma DETERMINÍSTICA.
--
-- PROBLEMA: se um checklist com regra 'comparacao_orcamento' (ex.: os do seed 058)
--   estiver ATIVO no mesmo escopo, a resolução por escopo pode escolhê-lo — e com
--   orçamento vazio as regras comerciais viram no-op (sem limite_maximo, resultado
--   pobre e não-determinístico).
-- REMEDIAÇÃO: desativa (ativo=false) qualquer checklist que contenha item
--   'comparacao_orcamento'. É REVERSÍVEL. O fluxo acoplado NÃO tem UI hoje (dormente).
--
-- >>> Se você NÃO quiser rodar isto agora, basta NÃO executar este bloco. <<<
-- >>> Para reverter depois: UPDATE receita_checklists SET ativo=true WHERE ...   <<<
-- ----------------------------------------------------------------------------
UPDATE receita_checklists c
   SET ativo = false, atualizado_em = now()
 WHERE c.ativo = true
   AND EXISTS (
     SELECT 1 FROM receita_checklist_itens i
      WHERE i.checklist_id = c.id AND i.tipo_regra = 'comparacao_orcamento'
   );
