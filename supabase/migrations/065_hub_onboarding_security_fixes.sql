-- Migration 065: Correções de segurança e integridade do Cadastro de Clientes (DEC-020)
-- ============================================================================
-- ADITIVO / CORRETIVO. Idempotente (CREATE OR REPLACE / DROP POLICY IF EXISTS /
-- ADD COLUMN IF NOT EXISTS). NÃO remove dados nem colunas. Emenda a migration 064.
--
-- Corrige três defeitos apontados em code review:
--
--  #1 (CRÍTICO — vazamento de PII entre Hubs)
--     onboarding_detalhe e as policies RLS autorizavam o Hub por
--     `industry_id = get_organization_id()`. Como todo usuário do Hub carrega o
--     organization_id da Indústria, esse ramo era verdadeiro para TODOS os
--     cadastros da Indústria — um Hub enxergava pré-cadastros (CPF, endereço,
--     documentos assinados) de OUTRO Hub via URL direta. Agora o ramo da
--     Indústria é restrito a admin/gestor; o Hub só acessa `hub_id = get_hub_id()`
--     (mesma regra que onboarding_listar já aplicava).
--
--  #2 (integridade — nome de PJ)
--     Na conversão, o Cliente PJ recebia o nome do responsável (pessoa física).
--     Agora PJ usa razão social (fallback nome fantasia); o nome do responsável
--     vai para a coluna própria contacts.contato_responsavel.
--
--  #3 (integridade — data de nascimento)
--     COALESCE(NULLIF(...)) impedia LIMPAR uma data já salva. Agora, se a chave
--     `data_nascimento` vier no payload, o valor é sobrescrito (vazio => NULL);
--     se a chave estiver ausente, o valor é preservado.
--
-- Aplicar no HUB DEV (pnkgwfgjhijksfmofiot) via SQL Editor (CLI linkado a projeto incorreto).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0) Coluna própria para o responsável de PJ em contacts (aditivo)
-- ----------------------------------------------------------------------------
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contato_responsavel text;
COMMENT ON COLUMN contacts.contato_responsavel IS
  'DEC-020: nome do responsável (pessoa física) quando o Cliente é Pessoa Jurídica. O nome principal (contacts.nome) usa a razão social/fantasia.';

-- ----------------------------------------------------------------------------
-- 1) Helper: o chamador é da Indústria (admin/gestor)? — usado nas policies RLS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_hco_is_industria()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
     WHERE p.id = auth.uid() AND p.cargo IN ('admin','gestor')
  )
$$;
COMMENT ON FUNCTION fn_hco_is_industria() IS
  'DEC-020: TRUE se o usuário autenticado é da Indústria (admin/gestor). Restringe o ramo industry_id nas policies para não vazar cadastros entre Hubs.';

-- ============================================================================
-- 2) RLS — gate do ramo da Indústria por perfil (defesa em profundidade)
--    (as RPCs são SECURITY DEFINER e já aplicam escopo; isto protege qualquer
--     leitura direta futura da tabela)
-- ============================================================================
DROP POLICY IF EXISTS "hco select" ON hub_client_onboarding;
CREATE POLICY "hco select" ON hub_client_onboarding
  FOR SELECT USING (
    hub_id = get_hub_id()
    OR (fn_hco_is_industria() AND industry_id = get_organization_id())
  );

DROP POLICY IF EXISTS "hco_files via pai" ON hub_client_onboarding_files;
CREATE POLICY "hco_files via pai" ON hub_client_onboarding_files
  FOR ALL USING (EXISTS (
    SELECT 1 FROM hub_client_onboarding o
     WHERE o.id = onboarding_id
       AND (o.hub_id = get_hub_id()
            OR (fn_hco_is_industria() AND o.industry_id = get_organization_id()))
  ));

DROP POLICY IF EXISTS "hco_events select" ON hub_client_onboarding_events;
CREATE POLICY "hco_events select" ON hub_client_onboarding_events
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM hub_client_onboarding o
     WHERE o.id = onboarding_id
       AND (o.hub_id = get_hub_id()
            OR (fn_hco_is_industria() AND o.industry_id = get_organization_id()))
  ));

DROP POLICY IF EXISTS "hco_events insert" ON hub_client_onboarding_events;
CREATE POLICY "hco_events insert" ON hub_client_onboarding_events
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM hub_client_onboarding o
     WHERE o.id = onboarding_id
       AND (o.hub_id = get_hub_id()
            OR (fn_hco_is_industria() AND o.industry_id = get_organization_id()))
  ));

-- ============================================================================
-- 3) #1 — onboarding_detalhe: escopo por perfil (Hub ⇒ hub_id; Indústria ⇒ industry_id)
-- ============================================================================
CREATE OR REPLACE FUNCTION onboarding_detalhe(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; o record; v_files jsonb; v_events jsonb; v_industria boolean;
BEGIN
  SELECT * INTO c FROM fn_hco_caller();
  SELECT * INTO o FROM hub_client_onboarding WHERE id = p_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'cadastro não encontrado'; END IF;

  v_industria := c.cargo IN ('admin','gestor');
  -- Indústria: só o que pertence à sua organização. Hub: só o próprio hub_id.
  IF v_industria THEN
    IF o.industry_id IS DISTINCT FROM c.organization_id THEN
      RAISE EXCEPTION 'sem acesso a este cadastro'; END IF;
  ELSE
    IF o.hub_id IS DISTINCT FROM c.hub_id THEN
      RAISE EXCEPTION 'sem acesso a este cadastro'; END IF;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', f.id, 'tipo_documento', f.tipo_documento, 'nome_arquivo', f.nome_arquivo,
    'storage_path', f.storage_path, 'mime_type', f.mime_type, 'tamanho', f.tamanho,
    'uploaded_by_nome', up.nome, 'created_at', f.created_at
  ) ORDER BY f.created_at), '[]'::jsonb) INTO v_files
  FROM hub_client_onboarding_files f
  LEFT JOIN profiles up ON up.id = f.uploaded_by
  WHERE f.onboarding_id = p_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', e.id, 'tipo_evento', e.tipo_evento, 'ator_nome', at.nome,
    'observacao', e.observacao, 'metadata', e.metadata, 'created_at', e.created_at
  ) ORDER BY e.created_at), '[]'::jsonb) INTO v_events
  FROM hub_client_onboarding_events e
  LEFT JOIN profiles at ON at.id = e.ator_id
  WHERE e.onboarding_id = p_id;

  RETURN jsonb_build_object(
    'cadastro', to_jsonb(o),
    'arquivos', v_files,
    'eventos', v_events,
    'papel', CASE WHEN v_industria THEN 'industria' ELSE 'hub' END
  );
END $$;

-- ============================================================================
-- 4) #3 — hub_onboarding_salvar: data_nascimento vazia LIMPA o valor
--    (chave presente ⇒ sobrescreve; ausente ⇒ preserva). Demais campos inalterados.
-- ============================================================================
CREATE OR REPLACE FUNCTION hub_onboarding_salvar(p_id uuid, p_dados jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; o record;
BEGIN
  SELECT * INTO c FROM fn_hco_caller();
  SELECT * INTO o FROM hub_client_onboarding WHERE id = p_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'cadastro não encontrado'; END IF;
  IF o.hub_id IS DISTINCT FROM c.hub_id THEN RAISE EXCEPTION 'sem acesso a este cadastro'; END IF;
  IF o.status NOT IN ('rascunho','correcao_solicitada') THEN
    RAISE EXCEPTION 'cadastro não editável no status %', o.status;
  END IF;

  UPDATE hub_client_onboarding SET
    nome_completo     = COALESCE(p_dados->>'nome_completo', nome_completo),
    razao_social      = COALESCE(p_dados->>'razao_social', razao_social),
    nome_fantasia     = COALESCE(p_dados->>'nome_fantasia', nome_fantasia),
    registro_conselho = COALESCE(p_dados->>'registro_conselho', registro_conselho),
    cpf               = COALESCE(p_dados->>'cpf', cpf),
    cnpj              = COALESCE(p_dados->>'cnpj', cnpj),
    -- chave presente ⇒ sobrescreve (vazio => NULL); ausente ⇒ mantém o valor atual
    data_nascimento   = CASE WHEN p_dados ? 'data_nascimento'
                             THEN NULLIF(p_dados->>'data_nascimento','')::date
                             ELSE data_nascimento END,
    email             = COALESCE(p_dados->>'email', email),
    endereco_completo = COALESCE(p_dados->>'endereco_completo', endereco_completo),
    cep               = COALESCE(p_dados->>'cep', cep),
    telefones         = COALESCE(p_dados->'telefones', telefones)
  WHERE id = p_id;
END $$;

-- ============================================================================
-- 5) #2 — industria_onboarding_converter: nome de PJ correto + responsável em campo próprio
-- ============================================================================
CREATE OR REPLACE FUNCTION industria_onboarding_converter(p_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; o record; v_contact uuid; v_tel text; v_nome text; v_responsavel text;
BEGIN
  SELECT * INTO c FROM fn_hco_caller();
  IF c.cargo NOT IN ('admin','gestor') THEN
    RAISE EXCEPTION 'apenas a Indústria pode converter o cadastro'; END IF;
  SELECT * INTO o FROM hub_client_onboarding WHERE id = p_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'cadastro não encontrado'; END IF;
  IF o.industry_id IS DISTINCT FROM c.organization_id THEN
    RAISE EXCEPTION 'cadastro não pertence à sua Indústria'; END IF;
  IF o.status <> 'aprovado' THEN RAISE EXCEPTION 'só é possível converter cadastros aprovados'; END IF;
  IF o.converted_contact_id IS NOT NULL THEN RAISE EXCEPTION 'cadastro já convertido'; END IF;

  v_tel := NULLIF(o.telefones->>0, '');

  -- PJ: nome principal = razão social (fallback fantasia); responsável (PF) em campo próprio.
  -- PF: nome principal = nome do profissional; sem responsável separado.
  IF o.tipo_pessoa = 'juridica' THEN
    v_nome        := COALESCE(o.razao_social, o.nome_fantasia);
    v_responsavel := o.nome_completo;
  ELSE
    v_nome        := o.nome_completo;
    v_responsavel := NULL;
  END IF;

  INSERT INTO contacts (
    organization_id, nome, contato_responsavel, email, telefone, cpf_cnpj, tipo_pessoa,
    numero_conselho, endereco, endereco_cep, observacoes, criado_em, atualizado_em
  ) VALUES (
    o.industry_id,
    v_nome, v_responsavel,
    o.email, v_tel, COALESCE(o.cnpj, o.cpf),
    CASE WHEN o.tipo_pessoa = 'fisica' THEN 'PF' ELSE 'PJ' END,  -- convenção de contacts (PF/PJ)
    o.registro_conselho, o.endereco_completo, o.cep,
    'Convertido do pré-cadastro ' || p_id::text, now(), now()
  ) RETURNING id INTO v_contact;

  UPDATE hub_client_onboarding SET converted_contact_id = v_contact WHERE id = p_id;

  INSERT INTO hub_client_onboarding_events (onboarding_id, tipo_evento, ator_id, metadata)
  VALUES (p_id, 'convertido', c.uid, jsonb_build_object('contact_id', v_contact));
  RETURN v_contact;
END $$;
