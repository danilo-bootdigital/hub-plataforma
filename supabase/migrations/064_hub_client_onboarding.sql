-- Migration 064: Cadastro de Clientes — Pré-cadastro Hub → Aprovação Indústria (DEC-020)
-- ============================================================================
-- ADITIVO PURO (Expand). Idempotente (CREATE ... IF NOT EXISTS / DROP POLICY IF EXISTS /
-- CREATE OR REPLACE FUNCTION). TEXT + CHECK (padrão do projeto). Não remove nada.
--
-- Entrega:
--  (1) helper get_hub_id() (espelha get_organization_id()) — escopo por Hub.
--  (2) tabelas: hub_client_onboarding, _files, _events (append-only), notifications.
--  (3) RLS: Hub vê/edita o próprio Hub; Indústria (admin/gestor) vê o que lhe é destinado.
--  (4) bucket privado 'client-onboarding-docs' (public:false, sem policy pública).
--  (5) RPCs SECURITY DEFINER (authz no banco): fluxo de status + conversão + leitura
--      + notificações. O Hub cria/envia/corrige; a Indústria decide (aprovar/reprovar/
--      solicitar correção) e converte — decisão EXCLUSIVA de admin/gestor.
--
-- RBAC (DEC-015): módulo 'cadastro_clientes' (ações visualizar/criar/editar) já cabe no
-- vocabulário de funcao_permissoes.chk_acao — esta migration NÃO altera chk_acao nem
-- concede permissões. aprovar/reprovar são da Indústria por Perfil (não por Função).
--
-- Aplicar no HUB DEV (pnkgwfgjhijksfmofiot) via SQL Editor (CLI linkado a projeto incorreto).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0) Helper de escopo por Hub (espelha get_organization_id() da migration 001)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_hub_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT hub_id FROM profiles WHERE id = auth.uid()
$$;

-- ----------------------------------------------------------------------------
-- 1) hub_client_onboarding — pré-cadastro (escopo Hub, propriedade Indústria)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hub_client_onboarding (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hub_id uuid REFERENCES hubs(id),
  industry_id uuid NOT NULL REFERENCES organizations(id),
  tipo_pessoa text NOT NULL CHECK (tipo_pessoa IN ('fisica','juridica')),
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN (
    'rascunho','enviado','em_analise','correcao_solicitada','aprovado','reprovado'
  )),
  -- Dados cadastrais (PF/PJ)
  nome_completo text,      -- PF: nome do profissional; PJ: nome do responsável
  razao_social text,       -- PJ
  nome_fantasia text,      -- PJ
  registro_conselho text,  -- número do Conselho (CRM etc.)
  cpf text,                -- PF: do profissional; PJ: do responsável
  cnpj text,               -- PJ
  data_nascimento date,
  email text,
  endereco_completo text,
  cep text,
  telefones jsonb NOT NULL DEFAULT '[]'::jsonb,  -- array de strings
  -- Decisão da Indústria
  observacao_correcao text,
  motivo_reprovacao text,
  -- Auditoria / vínculo
  criado_por uuid REFERENCES profiles(id),
  enviado_em timestamptz,
  aprovado_por_industria_id uuid REFERENCES profiles(id),
  aprovado_em timestamptz,
  reprovado_em timestamptz,
  converted_contact_id uuid REFERENCES contacts(id),  -- Cliente ativo gerado (nunca apaga o pré-cadastro)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hco_hub ON hub_client_onboarding(hub_id);
CREATE INDEX IF NOT EXISTS idx_hco_industry ON hub_client_onboarding(industry_id);
CREATE INDEX IF NOT EXISTS idx_hco_status ON hub_client_onboarding(status);
CREATE INDEX IF NOT EXISTS idx_hco_criado_por ON hub_client_onboarding(criado_por);

-- ----------------------------------------------------------------------------
-- 2) hub_client_onboarding_files — anexos (metadados; arquivo no bucket privado)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hub_client_onboarding_files (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  onboarding_id uuid NOT NULL REFERENCES hub_client_onboarding(id) ON DELETE CASCADE,
  hub_id uuid REFERENCES hubs(id),
  tipo_documento text NOT NULL CHECK (tipo_documento IN (
    'comprovante_endereco','contrato_social','alvara_funcionamento',
    'alvara_vigilancia_sanitaria','crm_frente','crm_verso'
  )),
  nome_arquivo text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  tamanho bigint,
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hco_files_onboarding ON hub_client_onboarding_files(onboarding_id);
-- Um documento por tipo por cadastro (substituir = delete + insert, ou upsert na action)
CREATE UNIQUE INDEX IF NOT EXISTS uq_hco_files_tipo ON hub_client_onboarding_files(onboarding_id, tipo_documento);

-- ----------------------------------------------------------------------------
-- 3) hub_client_onboarding_events — histórico / linha do tempo (APPEND-ONLY)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hub_client_onboarding_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  onboarding_id uuid NOT NULL REFERENCES hub_client_onboarding(id) ON DELETE CASCADE,
  tipo_evento text NOT NULL CHECK (tipo_evento IN (
    'criado','documento_enviado','documento_removido','enviado_industria',
    'correcao_solicitada','reapresentado','aprovado','reprovado','convertido','email_enviado'
  )),
  ator_id uuid REFERENCES profiles(id),
  observacao text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hco_events_onboarding ON hub_client_onboarding_events(onboarding_id, created_at);

-- Append-only forte: trigger bloqueia UPDATE/DELETE (inclusive service role)
CREATE OR REPLACE FUNCTION fn_hco_events_append_only()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'hub_client_onboarding_events é append-only: % não é permitido', TG_OP;
END $$;

DROP TRIGGER IF EXISTS trg_hco_events_append_only ON hub_client_onboarding_events;
CREATE TRIGGER trg_hco_events_append_only
  BEFORE UPDATE OR DELETE ON hub_client_onboarding_events
  FOR EACH ROW EXECUTE FUNCTION fn_hco_events_append_only();

-- ----------------------------------------------------------------------------
-- 4) notifications — central genérica in-app
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id),
  tipo text NOT NULL,
  titulo text NOT NULL,
  mensagem text,
  link text,
  lida boolean NOT NULL DEFAULT false,
  entidade_tipo text,
  entidade_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, lida, created_at DESC);

-- ----------------------------------------------------------------------------
-- 5) updated_at automático em hub_client_onboarding
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_hco_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_hco_touch ON hub_client_onboarding;
CREATE TRIGGER trg_hco_touch
  BEFORE UPDATE ON hub_client_onboarding
  FOR EACH ROW EXECUTE FUNCTION fn_hco_touch_updated_at();

-- ============================================================================
-- 6) RLS
-- ============================================================================
ALTER TABLE hub_client_onboarding ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hco select" ON hub_client_onboarding;
CREATE POLICY "hco select" ON hub_client_onboarding
  FOR SELECT USING (hub_id = get_hub_id() OR industry_id = get_organization_id());
-- Hub insere/edita apenas os próprios (decisão da Indústria vai por RPC SECURITY DEFINER).
DROP POLICY IF EXISTS "hco insert hub" ON hub_client_onboarding;
CREATE POLICY "hco insert hub" ON hub_client_onboarding
  FOR INSERT WITH CHECK (hub_id = get_hub_id());
DROP POLICY IF EXISTS "hco update hub" ON hub_client_onboarding;
CREATE POLICY "hco update hub" ON hub_client_onboarding
  FOR UPDATE USING (hub_id = get_hub_id()) WITH CHECK (hub_id = get_hub_id());

ALTER TABLE hub_client_onboarding_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hco_files via pai" ON hub_client_onboarding_files;
CREATE POLICY "hco_files via pai" ON hub_client_onboarding_files
  FOR ALL USING (EXISTS (
    SELECT 1 FROM hub_client_onboarding o
     WHERE o.id = onboarding_id
       AND (o.hub_id = get_hub_id() OR o.industry_id = get_organization_id())
  ));

ALTER TABLE hub_client_onboarding_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hco_events select" ON hub_client_onboarding_events;
CREATE POLICY "hco_events select" ON hub_client_onboarding_events
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM hub_client_onboarding o
     WHERE o.id = onboarding_id
       AND (o.hub_id = get_hub_id() OR o.industry_id = get_organization_id())
  ));
DROP POLICY IF EXISTS "hco_events insert" ON hub_client_onboarding_events;
CREATE POLICY "hco_events insert" ON hub_client_onboarding_events
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM hub_client_onboarding o
     WHERE o.id = onboarding_id
       AND (o.hub_id = get_hub_id() OR o.industry_id = get_organization_id())
  ));

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications próprias" ON notifications;
CREATE POLICY "notifications próprias" ON notifications
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 7) Storage — bucket privado (sem policy pública; acesso só via service role + signed URL)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-onboarding-docs', 'client-onboarding-docs', false)
ON CONFLICT (id) DO NOTHING;
-- NÃO criar policy pública de SELECT. Upload/leitura via service role no server action;
-- visualização por createSignedUrl (TTL curto). Nenhum arquivo é público.

-- ============================================================================
-- 8) Helpers internos das RPCs
-- ============================================================================
-- Perfil do chamador (id, cargo, hub_id, organization_id)
CREATE OR REPLACE FUNCTION fn_hco_caller()
RETURNS TABLE(uid uuid, cargo text, hub_id uuid, organization_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.cargo::text, p.hub_id, p.organization_id
  FROM profiles p WHERE p.id = auth.uid()
$$;

-- Notifica todos os usuários da Indústria (admin/gestor) da organização
CREATE OR REPLACE FUNCTION fn_hco_notificar_industria(
  p_org uuid, p_titulo text, p_msg text, p_link text, p_entidade uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO notifications (user_id, organization_id, tipo, titulo, mensagem, link, entidade_tipo, entidade_id)
  SELECT p.id, p_org, 'cadastro_cliente', p_titulo, p_msg, p_link, 'cadastro_cliente', p_entidade
  FROM profiles p
  WHERE p.organization_id = p_org AND p.cargo IN ('admin','gestor');
END $$;

-- Notifica um usuário específico do Hub
CREATE OR REPLACE FUNCTION fn_hco_notificar_usuario(
  p_user uuid, p_org uuid, p_titulo text, p_msg text, p_link text, p_entidade uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_user IS NULL THEN RETURN; END IF;
  INSERT INTO notifications (user_id, organization_id, tipo, titulo, mensagem, link, entidade_tipo, entidade_id)
  VALUES (p_user, p_org, 'cadastro_cliente', p_titulo, p_msg, p_link, 'cadastro_cliente', p_entidade);
END $$;

-- ============================================================================
-- 9) RPCs do HUB (criar/salvar/enviar/anexar/remover arquivo)
-- ============================================================================

-- Criar pré-cadastro (rascunho). p_dados = jsonb com os campos cadastrais.
CREATE OR REPLACE FUNCTION hub_onboarding_criar(p_tipo_pessoa text, p_dados jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; v_id uuid;
BEGIN
  SELECT * INTO c FROM fn_hco_caller();
  IF c.uid IS NULL THEN RAISE EXCEPTION 'não autenticado'; END IF;
  IF c.cargo NOT IN ('proprietario_hub','assistente') THEN
    RAISE EXCEPTION 'apenas usuários do Hub podem criar pré-cadastro';
  END IF;
  IF c.hub_id IS NULL THEN RAISE EXCEPTION 'usuário sem Hub vinculado'; END IF;
  IF p_tipo_pessoa NOT IN ('fisica','juridica') THEN RAISE EXCEPTION 'tipo_pessoa inválido'; END IF;

  INSERT INTO hub_client_onboarding (
    hub_id, industry_id, tipo_pessoa, status,
    nome_completo, razao_social, nome_fantasia, registro_conselho, cpf, cnpj,
    data_nascimento, email, endereco_completo, cep, telefones, criado_por
  ) VALUES (
    c.hub_id, c.organization_id, p_tipo_pessoa, 'rascunho',
    p_dados->>'nome_completo', p_dados->>'razao_social', p_dados->>'nome_fantasia',
    p_dados->>'registro_conselho', p_dados->>'cpf', p_dados->>'cnpj',
    NULLIF(p_dados->>'data_nascimento','')::date, p_dados->>'email',
    p_dados->>'endereco_completo', p_dados->>'cep',
    COALESCE(p_dados->'telefones', '[]'::jsonb), c.uid
  ) RETURNING id INTO v_id;

  INSERT INTO hub_client_onboarding_events (onboarding_id, tipo_evento, ator_id)
  VALUES (v_id, 'criado', c.uid);
  RETURN v_id;
END $$;

-- Salvar rascunho (edição). Só o Hub dono e status editável (rascunho|correcao_solicitada).
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
    data_nascimento   = COALESCE(NULLIF(p_dados->>'data_nascimento','')::date, data_nascimento),
    email             = COALESCE(p_dados->>'email', email),
    endereco_completo = COALESCE(p_dados->>'endereco_completo', endereco_completo),
    cep               = COALESCE(p_dados->>'cep', cep),
    telefones         = COALESCE(p_dados->'telefones', telefones)
  WHERE id = p_id;
END $$;

-- Registrar/atualizar metadado de arquivo (após upload no storage via service role).
CREATE OR REPLACE FUNCTION hub_onboarding_anexar(
  p_onboarding_id uuid, p_tipo_documento text, p_nome text,
  p_path text, p_mime text, p_tamanho bigint
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; o record; v_id uuid;
BEGIN
  SELECT * INTO c FROM fn_hco_caller();
  SELECT * INTO o FROM hub_client_onboarding WHERE id = p_onboarding_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'cadastro não encontrado'; END IF;
  IF o.hub_id IS DISTINCT FROM c.hub_id THEN RAISE EXCEPTION 'sem acesso a este cadastro'; END IF;
  IF o.status NOT IN ('rascunho','correcao_solicitada') THEN
    RAISE EXCEPTION 'documentos só podem ser anexados em rascunho/correção'; END IF;

  INSERT INTO hub_client_onboarding_files (onboarding_id, hub_id, tipo_documento, nome_arquivo, storage_path, mime_type, tamanho, uploaded_by)
  VALUES (p_onboarding_id, o.hub_id, p_tipo_documento, p_nome, p_path, p_mime, p_tamanho, c.uid)
  ON CONFLICT (onboarding_id, tipo_documento) DO UPDATE
    SET nome_arquivo = EXCLUDED.nome_arquivo, storage_path = EXCLUDED.storage_path,
        mime_type = EXCLUDED.mime_type, tamanho = EXCLUDED.tamanho,
        uploaded_by = EXCLUDED.uploaded_by, created_at = now()
  RETURNING id INTO v_id;

  INSERT INTO hub_client_onboarding_events (onboarding_id, tipo_evento, ator_id, metadata)
  VALUES (p_onboarding_id, 'documento_enviado', c.uid, jsonb_build_object('tipo_documento', p_tipo_documento));
  RETURN v_id;
END $$;

-- Remover arquivo (retorna o storage_path para a action apagar do bucket).
CREATE OR REPLACE FUNCTION hub_onboarding_remover_arquivo(p_file_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; f record;
BEGIN
  SELECT * INTO c FROM fn_hco_caller();
  SELECT ff.*, o.hub_id AS o_hub, o.status AS o_status
    INTO f FROM hub_client_onboarding_files ff
    JOIN hub_client_onboarding o ON o.id = ff.onboarding_id
   WHERE ff.id = p_file_id;
  IF f.id IS NULL THEN RAISE EXCEPTION 'arquivo não encontrado'; END IF;
  IF f.o_hub IS DISTINCT FROM c.hub_id THEN RAISE EXCEPTION 'sem acesso a este arquivo'; END IF;
  IF f.o_status NOT IN ('rascunho','correcao_solicitada') THEN
    RAISE EXCEPTION 'documentos só podem ser removidos em rascunho/correção'; END IF;

  DELETE FROM hub_client_onboarding_files WHERE id = p_file_id;
  INSERT INTO hub_client_onboarding_events (onboarding_id, tipo_evento, ator_id, metadata)
  VALUES (f.onboarding_id, 'documento_removido', c.uid, jsonb_build_object('tipo_documento', f.tipo_documento));
  RETURN f.storage_path;
END $$;

-- Enviar para a Indústria (valida obrigatórios + documentos). rascunho|correcao_solicitada → enviado.
CREATE OR REPLACE FUNCTION hub_onboarding_enviar(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; o record; v_reapresentado boolean; v_docs text[]; v_faltando text[];
BEGIN
  SELECT * INTO c FROM fn_hco_caller();
  SELECT * INTO o FROM hub_client_onboarding WHERE id = p_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'cadastro não encontrado'; END IF;
  IF o.hub_id IS DISTINCT FROM c.hub_id THEN RAISE EXCEPTION 'sem acesso a este cadastro'; END IF;
  IF o.status NOT IN ('rascunho','correcao_solicitada') THEN
    RAISE EXCEPTION 'cadastro não pode ser enviado no status %', o.status; END IF;

  -- Validação de campos obrigatórios (autoritativa)
  IF COALESCE(o.email,'') = '' OR COALESCE(o.cep,'') = ''
     OR COALESCE(o.registro_conselho,'') = ''
     OR jsonb_array_length(COALESCE(o.telefones,'[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'Preencha email, CEP, registro do Conselho e ao menos um telefone.';
  END IF;
  IF o.tipo_pessoa = 'fisica' THEN
    IF COALESCE(o.nome_completo,'') = '' OR COALESCE(o.cpf,'') = '' THEN
      RAISE EXCEPTION 'Pessoa Física exige nome completo e CPF.'; END IF;
    v_docs := ARRAY['comprovante_endereco','crm_frente','crm_verso'];
  ELSE
    IF COALESCE(o.razao_social,'') = '' OR COALESCE(o.nome_fantasia,'') = ''
       OR COALESCE(o.cnpj,'') = '' OR COALESCE(o.cpf,'') = '' THEN
      RAISE EXCEPTION 'Pessoa Jurídica exige razão social, nome fantasia, CNPJ e CPF do responsável.'; END IF;
    v_docs := ARRAY['comprovante_endereco','contrato_social','alvara_funcionamento',
                    'alvara_vigilancia_sanitaria','crm_frente','crm_verso'];
  END IF;

  -- Documentos obrigatórios presentes?
  SELECT array_agg(d) INTO v_faltando FROM unnest(v_docs) d
   WHERE NOT EXISTS (
     SELECT 1 FROM hub_client_onboarding_files f
      WHERE f.onboarding_id = p_id AND f.tipo_documento = d);
  IF v_faltando IS NOT NULL AND array_length(v_faltando,1) > 0 THEN
    RAISE EXCEPTION 'Documentos obrigatórios faltando: %', array_to_string(v_faltando, ', ');
  END IF;

  v_reapresentado := (o.status = 'correcao_solicitada');
  UPDATE hub_client_onboarding
     SET status = 'enviado', enviado_em = now()
   WHERE id = p_id;

  INSERT INTO hub_client_onboarding_events (onboarding_id, tipo_evento, ator_id)
  VALUES (p_id, CASE WHEN v_reapresentado THEN 'reapresentado' ELSE 'enviado_industria' END, c.uid);

  PERFORM fn_hco_notificar_industria(
    o.industry_id,
    CASE WHEN v_reapresentado THEN 'Cadastro reapresentado' ELSE 'Novo cadastro para análise' END,
    COALESCE(o.nome_completo, o.razao_social, 'Pré-cadastro') || ' aguarda análise da Indústria.',
    '/configuracoes/cadastro-clientes/' || p_id::text, p_id);
END $$;

-- ============================================================================
-- 10) RPCs da INDÚSTRIA (decisão + conversão) — exclusivo admin/gestor
-- ============================================================================

-- Decisão unificada: 'solicitar_correcao' | 'aprovar' | 'reprovar'
CREATE OR REPLACE FUNCTION industria_onboarding_decidir(p_id uuid, p_acao text, p_texto text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; o record; v_titulo text; v_evento text;
BEGIN
  SELECT * INTO c FROM fn_hco_caller();
  IF c.cargo NOT IN ('admin','gestor') THEN
    RAISE EXCEPTION 'apenas a Indústria pode decidir sobre o cadastro'; END IF;
  SELECT * INTO o FROM hub_client_onboarding WHERE id = p_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'cadastro não encontrado'; END IF;
  IF o.industry_id IS DISTINCT FROM c.organization_id THEN
    RAISE EXCEPTION 'cadastro não pertence à sua Indústria'; END IF;
  IF o.status NOT IN ('enviado','em_analise') THEN
    RAISE EXCEPTION 'só é possível decidir cadastros enviados/em análise (status atual: %)', o.status; END IF;

  IF p_acao = 'solicitar_correcao' THEN
    IF COALESCE(trim(p_texto),'') = '' THEN RAISE EXCEPTION 'observação é obrigatória para solicitar correção'; END IF;
    UPDATE hub_client_onboarding SET status = 'correcao_solicitada', observacao_correcao = p_texto WHERE id = p_id;
    v_evento := 'correcao_solicitada'; v_titulo := 'Correção solicitada';
  ELSIF p_acao = 'aprovar' THEN
    UPDATE hub_client_onboarding
       SET status = 'aprovado', aprovado_por_industria_id = c.uid, aprovado_em = now()
     WHERE id = p_id;
    v_evento := 'aprovado'; v_titulo := 'Cadastro aprovado pela Indústria';
  ELSIF p_acao = 'reprovar' THEN
    IF COALESCE(trim(p_texto),'') = '' THEN RAISE EXCEPTION 'motivo é obrigatório para reprovar'; END IF;
    UPDATE hub_client_onboarding SET status = 'reprovado', motivo_reprovacao = p_texto, reprovado_em = now() WHERE id = p_id;
    v_evento := 'reprovado'; v_titulo := 'Cadastro reprovado pela Indústria';
  ELSE
    RAISE EXCEPTION 'ação inválida: %', p_acao;
  END IF;

  INSERT INTO hub_client_onboarding_events (onboarding_id, tipo_evento, ator_id, observacao)
  VALUES (p_id, v_evento, c.uid, p_texto);

  -- Notifica quem criou (Hub)
  PERFORM fn_hco_notificar_usuario(
    o.criado_por, o.industry_id, v_titulo,
    COALESCE(o.nome_completo, o.razao_social, 'Pré-cadastro') || ': ' || v_titulo || '.',
    '/hub/cadastro-clientes/' || p_id::text, p_id);
END $$;

-- Converter cadastro aprovado em Cliente ativo (contacts). Nunca apaga o pré-cadastro.
CREATE OR REPLACE FUNCTION industria_onboarding_converter(p_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; o record; v_contact uuid; v_tel text;
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

  INSERT INTO contacts (
    organization_id, nome, email, telefone, cpf_cnpj, tipo_pessoa,
    numero_conselho, endereco, endereco_cep, observacoes, criado_em, atualizado_em
  ) VALUES (
    o.industry_id,
    COALESCE(o.nome_completo, o.nome_fantasia, o.razao_social),
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

-- ============================================================================
-- 11) RPCs de LEITURA (escopo por perfil) + notificações
-- ============================================================================

-- Lista paginada/filtrada. Escopo: Indústria vê industry_id=org; Hub vê hub_id=seu.
CREATE OR REPLACE FUNCTION onboarding_listar(
  p_status text DEFAULT NULL, p_busca text DEFAULT NULL, p_cpf text DEFAULT NULL,
  p_cnpj text DEFAULT NULL, p_conselho text DEFAULT NULL, p_email text DEFAULT NULL,
  p_hub_id uuid DEFAULT NULL, p_limit int DEFAULT 25, p_offset int DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; v_industria boolean; v_total bigint; v_rows jsonb;
BEGIN
  SELECT * INTO c FROM fn_hco_caller();
  v_industria := c.cargo IN ('admin','gestor');

  WITH base AS (
    SELECT o.*,
           cr.nome AS responsavel_nome,
           h.nome AS hub_nome
    FROM hub_client_onboarding o
    LEFT JOIN profiles cr ON cr.id = o.criado_por
    LEFT JOIN hubs h ON h.id = o.hub_id
    WHERE (
      (v_industria AND o.industry_id = c.organization_id)
      OR (NOT v_industria AND o.hub_id = c.hub_id)
    )
    AND (p_status   IS NULL OR o.status = p_status)
    AND (p_hub_id   IS NULL OR o.hub_id = p_hub_id)
    AND (p_cpf      IS NULL OR o.cpf ILIKE '%'||p_cpf||'%')
    AND (p_cnpj     IS NULL OR o.cnpj ILIKE '%'||p_cnpj||'%')
    AND (p_conselho IS NULL OR o.registro_conselho ILIKE '%'||p_conselho||'%')
    AND (p_email    IS NULL OR o.email ILIKE '%'||p_email||'%')
    AND (p_busca    IS NULL OR o.nome_completo ILIKE '%'||p_busca||'%'
                            OR o.razao_social ILIKE '%'||p_busca||'%'
                            OR o.nome_fantasia ILIKE '%'||p_busca||'%')
  )
  SELECT count(*) INTO v_total FROM base;

  WITH base AS (
    SELECT o.*, cr.nome AS responsavel_nome, h.nome AS hub_nome
    FROM hub_client_onboarding o
    LEFT JOIN profiles cr ON cr.id = o.criado_por
    LEFT JOIN hubs h ON h.id = o.hub_id
    WHERE (
      (v_industria AND o.industry_id = c.organization_id)
      OR (NOT v_industria AND o.hub_id = c.hub_id)
    )
    AND (p_status   IS NULL OR o.status = p_status)
    AND (p_hub_id   IS NULL OR o.hub_id = p_hub_id)
    AND (p_cpf      IS NULL OR o.cpf ILIKE '%'||p_cpf||'%')
    AND (p_cnpj     IS NULL OR o.cnpj ILIKE '%'||p_cnpj||'%')
    AND (p_conselho IS NULL OR o.registro_conselho ILIKE '%'||p_conselho||'%')
    AND (p_email    IS NULL OR o.email ILIKE '%'||p_email||'%')
    AND (p_busca    IS NULL OR o.nome_completo ILIKE '%'||p_busca||'%'
                            OR o.razao_social ILIKE '%'||p_busca||'%'
                            OR o.nome_fantasia ILIKE '%'||p_busca||'%')
    ORDER BY o.updated_at DESC
    LIMIT GREATEST(p_limit,1) OFFSET GREATEST(p_offset,0)
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'tipo_pessoa', tipo_pessoa, 'status', status,
    'nome', COALESCE(nome_completo, nome_fantasia, razao_social),
    'cpf_cnpj', COALESCE(cnpj, cpf), 'registro_conselho', registro_conselho,
    'email', email, 'hub_id', hub_id, 'hub_nome', hub_nome,
    'responsavel_nome', responsavel_nome,
    'enviado_em', enviado_em, 'updated_at', updated_at, 'created_at', created_at
  )), '[]'::jsonb) INTO v_rows FROM base;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END $$;

-- Detalhe: dados + arquivos + eventos (timeline). Escopo enforced.
CREATE OR REPLACE FUNCTION onboarding_detalhe(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; o record; v_files jsonb; v_events jsonb;
BEGIN
  SELECT * INTO c FROM fn_hco_caller();
  SELECT * INTO o FROM hub_client_onboarding WHERE id = p_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'cadastro não encontrado'; END IF;
  IF NOT (o.hub_id = c.hub_id OR o.industry_id = c.organization_id) THEN
    RAISE EXCEPTION 'sem acesso a este cadastro'; END IF;

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
    'papel', CASE WHEN c.cargo IN ('admin','gestor') THEN 'industria' ELSE 'hub' END
  );
END $$;

-- Opções de filtro (para a Indústria: hubs distintos com cadastros).
CREATE OR REPLACE FUNCTION onboarding_filtros()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; v_hubs jsonb;
BEGIN
  SELECT * INTO c FROM fn_hco_caller();
  IF c.cargo NOT IN ('admin','gestor') THEN RETURN jsonb_build_object('hubs', '[]'::jsonb); END IF;
  SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object('id', h.id, 'nome', h.nome)), '[]'::jsonb)
    INTO v_hubs
  FROM hub_client_onboarding o JOIN hubs h ON h.id = o.hub_id
  WHERE o.industry_id = c.organization_id;
  RETURN jsonb_build_object('hubs', v_hubs);
END $$;

-- Notificações do usuário logado
CREATE OR REPLACE FUNCTION notificacoes_listar(p_limit int DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rows jsonb; v_nao_lidas int;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'tipo', tipo, 'titulo', titulo, 'mensagem', mensagem,
    'link', link, 'lida', lida, 'created_at', created_at
  ) ORDER BY created_at DESC), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT * FROM notifications WHERE user_id = auth.uid()
    ORDER BY created_at DESC LIMIT GREATEST(p_limit,1)
  ) t;
  SELECT count(*) INTO v_nao_lidas FROM notifications WHERE user_id = auth.uid() AND NOT lida;
  RETURN jsonb_build_object('nao_lidas', v_nao_lidas, 'rows', v_rows);
END $$;

CREATE OR REPLACE FUNCTION notificacoes_marcar_lida(p_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_id IS NULL THEN
    UPDATE notifications SET lida = true WHERE user_id = auth.uid() AND NOT lida;
  ELSE
    UPDATE notifications SET lida = true WHERE id = p_id AND user_id = auth.uid();
  END IF;
END $$;

-- ============================================================================
-- 12) Comentários (documentação / governança)
-- ============================================================================
COMMENT ON TABLE hub_client_onboarding IS 'DEC-020: pré-cadastro de Cliente pelo Hub → aprovação da Indústria. Hub cria/envia/corrige; Indústria (admin/gestor) decide via RPC. converted_contact_id vincula o Cliente ativo (contacts) gerado; o pré-cadastro nunca é excluído.';
COMMENT ON TABLE hub_client_onboarding_events IS 'DEC-020: linha do tempo append-only (trigger bloqueia UPDATE/DELETE).';
COMMENT ON TABLE notifications IS 'DEC-020: central de notificações in-app genérica (RLS por user_id).';
COMMENT ON FUNCTION get_hub_id() IS 'DEC-020: hub_id do usuário autenticado (escopo por Hub em RLS/RPCs).';
