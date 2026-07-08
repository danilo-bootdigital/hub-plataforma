-- Migration 072: Mensageria — fundação do banco (DEC-023, Fatia 0)
-- ============================================================================
-- ADITIVO PURO (Expand). Idempotente (CREATE ... IF NOT EXISTS / CREATE INDEX IF NOT
-- EXISTS / CREATE OR REPLACE FUNCTION / DROP POLICY IF EXISTS / ON CONFLICT DO NOTHING).
-- TEXT + CHECK (padrão do projeto). NÃO remove nem altera nada do legado.
--
-- Escopo desta migration (SOMENTE fundação de banco):
--  (1) Tabelas do namespace communication_* (catálogos + entidades operacionais).
--  (2) Índices, constraints, foreign keys.
--  (3) RLS + políticas (Perfil + Hub via get_hub_id(); inbox só service role).
--  (4) Funções auxiliares estritamente necessárias (touch updated_at; append-only de eventos).
--  (5) Seed dos catálogos (canais/providers) — reference data intrínseca às tabelas.
--
-- FORA DESTA MIGRATION (por decisão da Fatia 0): telas, Server Actions, Provider Adapter,
-- webhook, poller, integração WhatsApp/Cloud API, bucket de mídia (Storage) — etapas seguintes.
--
-- Namespace communication_* resolve a colisão com o legado (conversations/messages/
-- whatsapp_instances), que permanece INTOCADO (removido só no Contract).
-- get_hub_id() e get_organization_id() já existem (migrations 001/064) — não recriados.
--
-- Aplicar no HUB DEV (pnkgwfgjhijksfmofiot) via SQL Editor (CLI linkado a projeto incorreto).
-- ============================================================================

-- ============================================================================
-- 1) CATÁLOGOS GLOBAIS (sem hub_id) — reference data
-- ============================================================================

-- 1.1) communication_channels — tipos de canal suportados
CREATE TABLE IF NOT EXISTS communication_channels (
  code       text PRIMARY KEY CHECK (code ~ '^[a-z_]+$'),
  nome       text NOT NULL,
  ativo      boolean NOT NULL DEFAULT false,
  ordem      int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 1.2) communication_providers — adaptadores técnicos (declaram os canais que atendem)
CREATE TABLE IF NOT EXISTS communication_providers (
  code       text PRIMARY KEY CHECK (code ~ '^[a-z_]+$'),
  nome       text NOT NULL,
  channels   text[] NOT NULL DEFAULT '{}',
  ativo      boolean NOT NULL DEFAULT false,
  is_legacy  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2) ENTIDADES OPERACIONAIS (todas com hub_id + RLS)
-- ============================================================================

-- 2.1) communication_accounts — conta/caixa conectada de um Hub (canal + provider)
CREATE TABLE IF NOT EXISTS communication_accounts (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hub_id              uuid NOT NULL REFERENCES hubs(id),
  channel             text NOT NULL REFERENCES communication_channels(code),
  provider            text NOT NULL REFERENCES communication_providers(code),
  external_account_id text NOT NULL,            -- ex.: PHONE_NUMBER_ID (Cloud API)
  display_label       text,
  status              text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','erro')),
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,  -- dados NÃO sensíveis (segredos ficam em env)
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comm_accounts_hub ON communication_accounts(hub_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_comm_accounts_provider_ext
  ON communication_accounts(provider, external_account_id);

-- 2.2) communication_channel_identities — identidade externa → Contato canônico (não é cadastro)
CREATE TABLE IF NOT EXISTS communication_channel_identities (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hub_id           uuid NOT NULL REFERENCES hubs(id),
  channel          text NOT NULL REFERENCES communication_channels(code),
  provider         text NOT NULL REFERENCES communication_providers(code),
  external_user_id text NOT NULL,               -- ex.: wa_id
  telefone         text,                         -- E.164 (normalize_phone na aplicação)
  display_name     text,
  contact_id       uuid REFERENCES contacts(id), -- nullable: vínculo é da Fatia 1
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_comm_identity_ext
  ON communication_channel_identities(hub_id, channel, provider, external_user_id);
CREATE INDEX IF NOT EXISTS idx_comm_identity_tel ON communication_channel_identities(hub_id, telefone);
CREATE INDEX IF NOT EXISTS idx_comm_identity_contact ON communication_channel_identities(contact_id);

-- 2.3) communication_inbound_events — inbox bruto idempotente (precede communication_messages)
CREATE TABLE IF NOT EXISTS communication_inbound_events (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider             text NOT NULL REFERENCES communication_providers(code),
  external_event_id    text NOT NULL,            -- id estável derivado pelo adapter
  hub_id               uuid REFERENCES hubs(id), -- nullable até resolver a conta
  account_external_id  text,
  payload              jsonb NOT NULL,
  status               text NOT NULL DEFAULT 'pendente'
                         CHECK (status IN ('pendente','processando','processado','erro','ignorado')),
  processado_em        timestamptz,
  erro                 text,
  tentativas           int NOT NULL DEFAULT 0,
  proxima_tentativa_em timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);
-- Dedup total: um evento do provider entra uma única vez
CREATE UNIQUE INDEX IF NOT EXISTS uq_comm_inbound_event
  ON communication_inbound_events(provider, external_event_id);
-- Fila do poller (§6.3): elegíveis por status + backoff
CREATE INDEX IF NOT EXISTS idx_comm_inbound_fila
  ON communication_inbound_events(status, proxima_tentativa_em);

-- 2.4) communication_conversations — thread de atendimento (identidade = channel_identity_id)
CREATE TABLE IF NOT EXISTS communication_conversations (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hub_id              uuid NOT NULL REFERENCES hubs(id),
  account_id          uuid NOT NULL REFERENCES communication_accounts(id),
  channel             text NOT NULL REFERENCES communication_channels(code),
  channel_identity_id uuid NOT NULL REFERENCES communication_channel_identities(id), -- chave de identidade
  contact_id          uuid REFERENCES contacts(id),      -- vínculo OPCIONAL (Fatia 1), NÃO é chave
  assigned_user_id    uuid REFERENCES profiles(id),
  status              text NOT NULL DEFAULT 'novo' CHECK (status IN (
                        -- Fatia 0: SOMENTE estado de atendimento (comercial vive no Pipeline/Orçamento — DEC-023 §1)
                        'novo','em_atendimento','aguardando_cliente','finalizado','perdido'
                      )),
  unread_count        int NOT NULL DEFAULT 0,
  last_message_at     timestamptz,
  arquivada           boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
-- Identidade da conversa (bloqueador C): evita duplicidade por participante externo.
-- contact_id (nullable) NÃO participa da chave.
CREATE UNIQUE INDEX IF NOT EXISTS uq_comm_conversation_identity
  ON communication_conversations(account_id, channel_identity_id);
CREATE INDEX IF NOT EXISTS idx_comm_conv_hub_lastmsg
  ON communication_conversations(hub_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_conv_hub_status   ON communication_conversations(hub_id, status);
CREATE INDEX IF NOT EXISTS idx_comm_conv_hub_assigned ON communication_conversations(hub_id, assigned_user_id);
-- (removido idx_comm_conv_account: coberto pelo leftmost-prefix de uq_comm_conversation_identity)
CREATE INDEX IF NOT EXISTS idx_comm_conv_contact      ON communication_conversations(contact_id);

-- Reconciliação do CHECK de status (idempotente). Necessária porque CREATE TABLE IF NOT EXISTS
-- NÃO altera o CHECK de uma tabela já existente: ao reexecutar a 072, isto aperta o domínio
-- do status para SOMENTE estado de atendimento (Fatia 0). Seguro: tabela sem dados nesta fase.
-- (Se algum dia houver linha com status removido, migrar os dados antes de reexecutar.)
DO $$ BEGIN
  ALTER TABLE communication_conversations DROP CONSTRAINT IF EXISTS communication_conversations_status_check;
  ALTER TABLE communication_conversations
    ADD CONSTRAINT communication_conversations_status_check
    CHECK (status IN ('novo','em_atendimento','aguardando_cliente','finalizado','perdido'));
END $$;

-- 2.5) communication_conversation_participants — participantes (externos e internos; base p/ grupos)
CREATE TABLE IF NOT EXISTS communication_conversation_participants (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hub_id              uuid NOT NULL REFERENCES hubs(id),
  conversation_id     uuid NOT NULL REFERENCES communication_conversations(id) ON DELETE CASCADE,
  tipo                text NOT NULL CHECK (tipo IN ('externo','usuario')),
  channel_identity_id uuid REFERENCES communication_channel_identities(id),
  user_id             uuid REFERENCES profiles(id),
  papel               text NOT NULL DEFAULT 'cliente' CHECK (papel IN ('cliente','atendente','observador')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  -- Exatamente um lado preenchido conforme o tipo
  CONSTRAINT chk_comm_participant_ref CHECK (
    (tipo = 'externo' AND channel_identity_id IS NOT NULL AND user_id IS NULL)
    OR (tipo = 'usuario' AND user_id IS NOT NULL AND channel_identity_id IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_comm_part_conversation ON communication_conversation_participants(conversation_id);
-- (removido idx_comm_part_hub: acesso sempre via conversation_id; hub_id só filtro RLS)
CREATE UNIQUE INDEX IF NOT EXISTS uq_comm_part_externo
  ON communication_conversation_participants(conversation_id, channel_identity_id)
  WHERE channel_identity_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_comm_part_usuario
  ON communication_conversation_participants(conversation_id, user_id)
  WHERE user_id IS NOT NULL;

-- 2.6) communication_messages — mensagem normalizada (agnóstica de provider)
CREATE TABLE IF NOT EXISTS communication_messages (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hub_id               uuid NOT NULL REFERENCES hubs(id),
  conversation_id      uuid NOT NULL REFERENCES communication_conversations(id) ON DELETE CASCADE,
  direction            text NOT NULL CHECK (direction IN ('inbound','outbound')),
  sender_participant_id uuid REFERENCES communication_conversation_participants(id),
  tipo                 text NOT NULL DEFAULT 'texto' CHECK (tipo IN (
                         'texto','imagem','audio','video','documento','localizacao','contato','sistema'
                       )),
  corpo                text,
  provider             text NOT NULL REFERENCES communication_providers(code),
  provider_message_id  text,                     -- ex.: wamid (nullable p/ outbound antes do ack)
  status               text NOT NULL DEFAULT 'recebida' CHECK (status IN (
                         'recebida','enfileirada','enviada','entregue','lida','falha'
                       )),
  enviada_em           timestamptz,
  payload_ref          uuid REFERENCES communication_inbound_events(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comm_msg_conv ON communication_messages(conversation_id, created_at);
-- (removido idx_comm_msg_hub: acesso sempre via conversation_id; hub_id só filtro RLS)
-- Idempotência de mensagem por provider (parcial: permite múltiplos NULL em outbound pré-ack)
CREATE UNIQUE INDEX IF NOT EXISTS uq_comm_msg_provider_id
  ON communication_messages(provider, provider_message_id)
  WHERE provider_message_id IS NOT NULL;

-- 2.7) communication_message_attachments — metadados de mídia (binário no bucket privado, futuro)
CREATE TABLE IF NOT EXISTS communication_message_attachments (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hub_id           uuid NOT NULL REFERENCES hubs(id),
  message_id       uuid NOT NULL REFERENCES communication_messages(id) ON DELETE CASCADE,
  storage_path     text,                          -- preenchido após download (poller)
  mime             text,
  tamanho          bigint,
  nome_arquivo     text,
  sensivel_saude   boolean NOT NULL DEFAULT false, -- receita/saúde: tratamento LGPD diferenciado
  provider_media_id text,                          -- ref p/ download sob demanda no provider
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comm_attach_msg ON communication_message_attachments(message_id);
-- (removido idx_comm_attach_hub: acesso sempre via message_id; hub_id só filtro RLS)

-- 2.8) communication_message_events — ciclo de vida por mensagem (APPEND-ONLY)
CREATE TABLE IF NOT EXISTS communication_message_events (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hub_id      uuid NOT NULL REFERENCES hubs(id),
  message_id  uuid NOT NULL REFERENCES communication_messages(id) ON DELETE CASCADE,
  evento      text NOT NULL CHECK (evento IN ('recebida','enfileirada','enviada','entregue','lida','falha')),
  provider    text REFERENCES communication_providers(code),
  erro        text,
  ocorrido_em timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comm_msgevt_msg ON communication_message_events(message_id, ocorrido_em);
-- (removido idx_comm_msgevt_hub: acesso sempre via message_id; hub_id só filtro RLS)

-- ============================================================================
-- 3) FUNÇÕES AUXILIARES (estritamente necessárias)
-- ============================================================================

-- 3.1) touch updated_at (genérica do módulo)
CREATE OR REPLACE FUNCTION fn_comm_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_comm_accounts_touch ON communication_accounts;
CREATE TRIGGER trg_comm_accounts_touch BEFORE UPDATE ON communication_accounts
  FOR EACH ROW EXECUTE FUNCTION fn_comm_touch_updated_at();

DROP TRIGGER IF EXISTS trg_comm_identity_touch ON communication_channel_identities;
CREATE TRIGGER trg_comm_identity_touch BEFORE UPDATE ON communication_channel_identities
  FOR EACH ROW EXECUTE FUNCTION fn_comm_touch_updated_at();

DROP TRIGGER IF EXISTS trg_comm_conv_touch ON communication_conversations;
CREATE TRIGGER trg_comm_conv_touch BEFORE UPDATE ON communication_conversations
  FOR EACH ROW EXECUTE FUNCTION fn_comm_touch_updated_at();

DROP TRIGGER IF EXISTS trg_comm_msg_touch ON communication_messages;
CREATE TRIGGER trg_comm_msg_touch BEFORE UPDATE ON communication_messages
  FOR EACH ROW EXECUTE FUNCTION fn_comm_touch_updated_at();

-- 3.2) append-only forte em communication_message_events (bloqueia UPDATE/DELETE, incl. service role)
CREATE OR REPLACE FUNCTION fn_comm_message_events_append_only()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'communication_message_events é append-only: % não é permitido', TG_OP;
END $$;

DROP TRIGGER IF EXISTS trg_comm_msgevt_append_only ON communication_message_events;
CREATE TRIGGER trg_comm_msgevt_append_only
  BEFORE UPDATE OR DELETE ON communication_message_events
  FOR EACH ROW EXECUTE FUNCTION fn_comm_message_events_append_only();

-- ============================================================================
-- 4) RLS + POLÍTICAS
-- ============================================================================

-- 4.1) Catálogos: leitura para autenticados; escrita apenas service role (sem policy de escrita)
ALTER TABLE communication_channels  ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comm_channels select" ON communication_channels;
CREATE POLICY "comm_channels select" ON communication_channels
  FOR SELECT USING (auth.uid() IS NOT NULL);

ALTER TABLE communication_providers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comm_providers select" ON communication_providers;
CREATE POLICY "comm_providers select" ON communication_providers
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 4.2) Entidades operacionais: escopo Perfil + Hub (DEC-015 §206). Escopo por Assistente
--      é aplicado na camada de query/action (não em RLS granular). Service role bypassa RLS.
ALTER TABLE communication_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comm_accounts hub" ON communication_accounts;
CREATE POLICY "comm_accounts hub" ON communication_accounts
  FOR ALL USING (hub_id = get_hub_id()) WITH CHECK (hub_id = get_hub_id());

ALTER TABLE communication_channel_identities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comm_identity hub" ON communication_channel_identities;
CREATE POLICY "comm_identity hub" ON communication_channel_identities
  FOR ALL USING (hub_id = get_hub_id()) WITH CHECK (hub_id = get_hub_id());

ALTER TABLE communication_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comm_conv hub" ON communication_conversations;
CREATE POLICY "comm_conv hub" ON communication_conversations
  FOR ALL USING (hub_id = get_hub_id()) WITH CHECK (hub_id = get_hub_id());

ALTER TABLE communication_conversation_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comm_part hub" ON communication_conversation_participants;
CREATE POLICY "comm_part hub" ON communication_conversation_participants
  FOR ALL USING (hub_id = get_hub_id()) WITH CHECK (hub_id = get_hub_id());

ALTER TABLE communication_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comm_msg hub" ON communication_messages;
CREATE POLICY "comm_msg hub" ON communication_messages
  FOR ALL USING (hub_id = get_hub_id()) WITH CHECK (hub_id = get_hub_id());

ALTER TABLE communication_message_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comm_attach hub" ON communication_message_attachments;
CREATE POLICY "comm_attach hub" ON communication_message_attachments
  FOR ALL USING (hub_id = get_hub_id()) WITH CHECK (hub_id = get_hub_id());

ALTER TABLE communication_message_events ENABLE ROW LEVEL SECURITY;
-- SELECT pelo Hub; INSERT pelo Hub/serviço. UPDATE/DELETE bloqueados pelo trigger append-only.
DROP POLICY IF EXISTS "comm_msgevt select" ON communication_message_events;
CREATE POLICY "comm_msgevt select" ON communication_message_events
  FOR SELECT USING (hub_id = get_hub_id());
DROP POLICY IF EXISTS "comm_msgevt insert" ON communication_message_events;
CREATE POLICY "comm_msgevt insert" ON communication_message_events
  FOR INSERT WITH CHECK (hub_id = get_hub_id());

-- 4.3) Inbox bruto: infraestrutura, NÃO exposta à UI do Hub. RLS ligada SEM policy →
--      nega tudo para authenticated; apenas service role (bypassa RLS) lê/escreve.
ALTER TABLE communication_inbound_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5) SEED DOS CATÁLOGOS (reference data — idempotente)
-- ============================================================================
INSERT INTO communication_channels (code, nome, ativo, ordem) VALUES
  ('whatsapp',  'WhatsApp',          true,  1),
  ('instagram', 'Instagram Direct',  false, 2),
  ('messenger', 'Facebook Messenger',false, 3),
  ('telegram',  'Telegram',          false, 4),
  ('webchat',   'Chat do Site',      false, 5),
  ('email',     'E-mail',            false, 6),
  ('sms',       'SMS',               false, 7),
  ('rcs',       'RCS',               false, 8)
ON CONFLICT (code) DO NOTHING;

INSERT INTO communication_providers (code, nome, channels, ativo, is_legacy) VALUES
  ('cloud_api', 'WhatsApp Business Platform (Cloud API)', ARRAY['whatsapp'], true,  false),
  ('evolution', 'Evolution API (referência do legado)',  ARRAY['whatsapp'], false, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 6) COMENTÁRIOS (documentação / governança)
-- ============================================================================
COMMENT ON TABLE communication_channels IS 'DEC-023: catálogo de canais suportados pela Mensageria (omnichannel). Adicionar canal = inserir linha.';
COMMENT ON TABLE communication_providers IS 'DEC-023: catálogo de providers/adaptadores. cloud_api ativo; evolution = referência do legado (is_legacy).';
COMMENT ON TABLE communication_accounts IS 'DEC-023: conta/caixa conectada de um Hub (canal + provider). Segredos NÃO ficam aqui (env).';
COMMENT ON TABLE communication_channel_identities IS 'DEC-023: identidade externa (provider+external_user_id) → contact_id canônico. NÃO é cadastro paralelo; contact_id nullable (vínculo é Fatia 1).';
COMMENT ON TABLE communication_conversations IS 'DEC-023: thread de atendimento. Identidade = UNIQUE(account_id, channel_identity_id); contact_id é vínculo opcional (Fatia 1), fora da chave.';
COMMENT ON TABLE communication_conversation_participants IS 'DEC-023: participantes externos/internos da conversa (base para grupos futuros).';
COMMENT ON TABLE communication_messages IS 'DEC-023: mensagem normalizada (agnóstica de provider). Idempotência por UNIQUE(provider, provider_message_id).';
COMMENT ON TABLE communication_message_attachments IS 'DEC-023: metadados de mídia; binário em bucket privado (etapa futura). sensivel_saude = LGPD diferenciado.';
COMMENT ON TABLE communication_message_events IS 'DEC-023: ciclo de vida por mensagem (append-only; trigger bloqueia UPDATE/DELETE).';
COMMENT ON TABLE communication_inbound_events IS 'DEC-023: inbox bruto idempotente (UNIQUE provider+external_event_id). Infra; só service role (RLS sem policy). Processado pelo poller (§6.3 do blueprint).';
