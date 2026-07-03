-- INCREMENTAL — Atualiza os checklists JÁ EXISTENTes da Validação de Receita (DEC-019)
-- ============================================================================
-- Objetivo: adicionar/atualizar as regras de Emitente/Paciente/Medicamento nos
-- checklists já semeados, SEM recriar o checklist e SEM duplicar itens.
--
-- Técnica (idempotente, atômica): para cada checklist EXISTENTE, apaga os ITENS e
-- reinsere o conjunto CANÔNICO. Isso: (a) atualiza severidade/peso/config de quem já
-- existia; (b) insere os novos campos; (c) remove chaves obsoletas (ex.: cpf_paciente
-- → paciente_documento) e reordena. A LINHA do checklist é preservada. Nada referencia
-- receita_checklist_itens.id, então recriar os itens é seguro.
--
-- Rodar no SQL Editor do HUB DEV (pnkgwfgjhijksfmofiot). Reexecutável (mesmo estado final).
-- Só afeta checklists que EXISTEM (não cria). Bloco DO = 1 statement atômico (all-or-nothing).
-- CHECKs de tipo_regra/motivo já suportam os valores usados (migrations 057/060).
-- ============================================================================

DO $$
DECLARE
  org RECORD;
  cl_gen uuid;
  cl_tz  uuid;
BEGIN
  FOR org IN SELECT id FROM organizations LOOP

    -- ---------- Validação de Receita — Genérico ----------
    SELECT id INTO cl_gen FROM receita_checklists
     WHERE organization_id = org.id AND nome = 'Validação de Receita — Genérico';
    IF cl_gen IS NOT NULL THEN
      DELETE FROM receita_checklist_itens WHERE checklist_id = cl_gen;
      INSERT INTO receita_checklist_itens
        (checklist_id, chave, rotulo, obrigatorio, tipo_regra, config_json, motivo, severidade, peso, ordem)
      VALUES
        -- EMITENTE / documento
        (cl_gen,'prescritor_nome','Nome do emitente/prescritor',true,'presenca','{"camada":"documental"}'::jsonb,'outro','critico',3,1),
        (cl_gen,'crm_uf','CRM',true,'formato','{"camada":"documental","regex":"\\d{4,7}\\s*[-/]\\s*[A-Za-z]{2}"}'::jsonb,'crm_uf_ausente','critico',3,2),
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
      RAISE NOTICE 'Org %: "Validação de Receita — Genérico" reconciliado (17 regras)', org.id;
    ELSE
      RAISE NOTICE 'Org %: "Validação de Receita — Genérico" NAO existe — pulado (rode a seed base primeiro)', org.id;
    END IF;

    -- ---------- Validação de Receita — Tirzepatida ----------
    SELECT id INTO cl_tz FROM receita_checklists
     WHERE organization_id = org.id AND nome = 'Validação de Receita — Tirzepatida';
    IF cl_tz IS NOT NULL THEN
      DELETE FROM receita_checklist_itens WHERE checklist_id = cl_tz;
      INSERT INTO receita_checklist_itens
        (checklist_id, chave, rotulo, obrigatorio, tipo_regra, config_json, motivo, severidade, peso, ordem)
      VALUES
        -- EMITENTE / documento
        (cl_tz,'prescritor_nome','Nome do emitente/prescritor',true,'presenca','{"camada":"documental"}'::jsonb,'outro','critico',3,1),
        (cl_tz,'crm_uf','CRM',true,'formato','{"camada":"documental","regex":"\\d{4,7}\\s*[-/]\\s*[A-Za-z]{2}"}'::jsonb,'crm_uf_ausente','critico',3,2),
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
        -- MEDICAMENTO — origemValores hidratado de product_validation_metadata (sem hardcode)
        (cl_tz,'via_administracao','Via de administração',false,'valor_esperado','{"camada":"documental","origemValores":"vias_permitidas","contem":true}'::jsonb,'outro','info',1,14),
        (cl_tz,'medicamento','Medicamento esperado',true,'valor_esperado','{"camada":"documental","origemValores":"medicamento_aliases"}'::jsonb,'produto_divergente','critico',3,15),
        (cl_tz,'concentracao','Concentração esperada',true,'valor_esperado','{"camada":"documental","origemValores":"concentracoes_permitidas"}'::jsonb,'concentracao_divergente','critico',3,16),
        (cl_tz,'quantidade','Quantidade máxima por receita',true,'limite_maximo','{"camada":"documental","campo":"quantidade","origemValores":"limite_maximo_por_receita"}'::jsonb,'limite_maximo_excedido','critico',3,17),
        (cl_tz,'posologia','Posologia',true,'presenca','{"camada":"documental"}'::jsonb,'posologia_ausente','critico',3,18);
      RAISE NOTICE 'Org %: "Validação de Receita — Tirzepatida" reconciliado (18 regras)', org.id;
    ELSE
      RAISE NOTICE 'Org %: "Validação de Receita — Tirzepatida" NAO existe — pulado', org.id;
    END IF;

  END LOOP;
END $$;
