# Blueprint técnico — Mensageria · Fatia 0

> Guia de implementação da **Fatia 0** da DEC-023 (Mensageria omnichannel). Documento de planejamento — **não** contém código, migrations ou telas. Fonte arquitetural: `docs/DECISIONS.md` → DEC-023. Em qualquer divergência, a DEC prevalece.
>
> **Ambiente:** HUB DEV `pnkgwfgjhijksfmofiot` (único oficial). Migrations aplicadas via **SQL Editor** (CLI linkado a projeto incorreto — RISCOS.md).
> **Estratégia:** Expand → Migrate → Contract. A Fatia 0 é **Expand aditivo puro**: nada do WhatsApp/Evolution legado é alterado.
>
> **Correções de auditoria aplicadas (2026-07-06):** bloqueadores **A** (namespace `communication_*` consistente — resolve colisão com o legado), **B** (mecanismo de execução do normalizador — §6.3) e **C** (identidade da conversa por `channel_identity_id`). Achados D–N: ver `docs/planos/AUDITORIA-FATIA-0-MENSAGERIA.md` (não aplicados).

---

## Decisões de escopo confirmadas (revisão 2026-07-06)

Travas de escopo validadas para a Fatia 0. Prevalecem sobre qualquer interpretação em contrário no restante do documento.

1. **Escopo do Assistente na camada de query/action (sem RLS granular).** O escopo "Assistente vê só o permitido pela Função" é aplicado na **camada de aplicação** (helper único de escopo + server actions), **não** em RLS granular por assistente. A RLS de banco permanece por **Perfil + Hub** (`get_hub_id()`), conforme **DEC-015 §206**. RLS granular fica para **fase futura, se necessário**. Ver §4.5 e §10.5.
2. **Legado WhatsApp/Evolution intocado.** A Mensageria nasce em **namespace novo e aditivo** (`communication_*`). **Nada** de migração, reaproveitamento ou remoção do legado (`conversations`/`whatsapp_instances`/`messages`, `app/api/webhook/evolution`, `configuracoes/whatsapp`) agora — isso é fase **Contract**. Ver cabeçalho e §10.1.
3. **UI mínima apenas para validação operacional.** A Fatia 0 entrega **somente** UI de operação de atendimento (listar/abrir/ler, marcar lida, atribuir/transferir, filtrar). **Nada** de UI comercial, **nada** de orçamento pela conversa, **nada** de pipeline — tudo isso é **Fatia 1** (bloqueada pela DEC-014). Ver §1.1.6, §1.2 e Etapa 11.

---

## 1. Objetivos da Fatia 0

### 1.1 O que será entregue (encanamento, sem valor comercial)
1. **Domínio Mensageria no banco** — catálogos (`communication_channels`, `communication_providers`) + entidades operacionais (`communication_accounts`, `communication_channel_identities`, `communication_conversations`, `communication_conversation_participants`, `communication_messages`, `communication_message_attachments`, `communication_message_events`, `communication_inbound_events`), todas com `hub_id` + **RLS desde a primeira migration**.
2. **Camada de providers** — abstração `ProviderAdapter` com **um** provider implementado: **WhatsApp Business Platform (Cloud API)**. Domínio 100% agnóstico.
3. **Recepção de mensagens** — route handler de webhook provider-agnóstico → **inbox idempotente** (`communication_inbound_events`) → **normalizador** → `communication_conversations`/`communication_messages`.
4. **Envio de mensagens** — do domínio para o provider via adapter, com registro de `communication_message_events` (ciclo de vida) e reconciliação de status via callback.
5. **Identidade** — resolução `provider → external_user_id → telefone → contact_id`, sem cadastro paralelo (`contacts` canônico).
6. **UI mínima operacional** — listar conversas, abrir conversa, ler histórico, marcar como lida, atribuir/transferir, filtrar por responsável/status. Escopo por Hub.
7. **RBAC + escopo** — módulo `mensageria` (DEC-015): Proprietário vê tudo do Hub; Assistente vê conforme Função; Indústria sem acesso (DEC-022).
8. **LGPD desde o MVP** — mídia sensível em bucket privado, signed URL, service role, auditoria, retenção.

### 1.2 O que fica deliberadamente fora
- **Qualquer ação comercial** (vincular conversa→orçamento, criar orçamento pela conversa, mover pipeline, pedido) → **Fatia 1**, bloqueada pela DEC-014.
- **Novos canais** (Instagram, Messenger, Telegram, Webchat, E-mail, SMS, RCS) → pós-MVP (a arquitetura já os suporta, mas não se implementa adapter agora).
- **IA / auto-resposta / chatbot / análise de intenção** → fora por DEC-021 (Config-4 arquivada).
- **Automações, campanhas, disparos ativos, templates de marketing, SLA, relatórios** → pós-MVP.
- **Migração/retirada do WhatsApp/Evolution legado** → fase Contract (não se toca no legado agora).
- **Grupos** (conversas multi-participante) → o schema suporta, mas o fluxo não é exercido na Fatia 0.

---

## 2. Dependências

### 2.1 DECs relacionadas
| DEC | Papel na Fatia 0 |
|---|---|
| **DEC-023** | Decisão-mãe (Mensageria). Este blueprint a implementa. |
| **DEC-015** | RBAC Perfil→Função→Permissões. Módulo `mensageria` (emenda §204). Usar integralmente. |
| **DEC-016** | Fronteira governança×operação. Proprietário opera; Indústria não. |
| **DEC-022** | **Suprema.** Mensageria é operação 100% do Hub; `admin`/`gestor` sem acesso. |
| **DEC-020** | Helper `get_hub_id()`, padrão de bucket privado + signed URL, central `notifications`. |
| **DEC-018** | Padrão de anexo sensível (bucket privado, metadados no banco, signed URL). |
| **DEC-021** | IA não responde mensagens (Config-4 arquivada). |
| **DEC-014** | Bloqueia a **Fatia 1** (supplier_id no Orçamento). Não afeta a Fatia 0. |
| **DEC-008/011/017** | Escopo por Hub, propriedade do Contato/Carteira. |

### 2.2 Módulos/artefatos internos utilizados
- **DB/RLS:** `get_hub_id()`, `get_organization_id()` (migrations 064/…); padrão de política `USING (hub_id = get_hub_id())`.
- **Supabase clients:** `lib/supabase/server.ts` (`createClient()`, RLS-aware) e `lib/supabase/admin.ts` (`createAdminClient()`, service role — para webhook/normalizador/upload).
- **RBAC:** `lib/rbac.ts` (`resolverPermissoes()`, `podeAcao()`), `lib/navegacao.ts` (`ItemNavegacao`, `navegacaoParaPerfil()`), `middleware.ts`.
- **Auth de action:** padrão `getPerfilAutenticado()` / `exigirAcessoHub()` (ex.: `app/(dashboard)/hub/cadastro-clientes/actions.ts`).
- **Storage/signed URL:** padrão `urlAssinadaDocumento()` + upload via `createAdminClient()` (ex.: cadastro-clientes / DEC-018).
- **Entidade canônica:** `contacts` (Contato/Cliente).
- **Auditoria:** `audit_logs`.
- **Tipos:** `types/database.ts`.
- **Route handlers:** padrão `app/api/**/route.ts`.

### 2.3 Serviços externos
- **WhatsApp Business Platform — Cloud API (Meta/Graph API):** envio de mensagens, recepção via webhook, status de entrega. Requer: WABA + número verificado, `PHONE_NUMBER_ID`, `WABA_ID`, **token de acesso** (system user token de longa duração), **verify token** do webhook, **app secret** (validação de assinatura `X-Hub-Signature-256`).
- **Supabase:** Postgres + Storage (bucket privado) + Auth (já em uso).
- **Vercel:** host do route handler do webhook (endpoint público HTTPS), do **cron do normalizador** (§6.3) e das server actions.
- **Evolution API:** **apenas referência técnica do legado** — nenhuma dependência nova.

---

## 3. Modelo do domínio (final aprovado)

```
Hub (hubs) — escopo de tudo (hub_id + RLS)
│
├── communication_accounts (conta conectada: canal + provider)
│     └── catálogos globais (sem hub_id): communication_channels · communication_providers
│
├── communication_conversations (thread; identidade = UNIQUE (account_id, channel_identity_id))
│     ├── FK account_id          → communication_accounts
│     ├── FK channel_identity_id  → communication_channel_identities   (identidade da conversa)
│     ├── FK contact_id           → contacts   (vínculo OPCIONAL, nullable — Fatia 1)
│     ├── 1:N communication_conversation_participants
│     │         ├── externo → communication_channel_identities
│     │         └── interno → profiles (usuário do Hub)
│     └── 1:N communication_messages
│               ├── 1:N communication_message_attachments (bucket privado)
│               └── 1:N communication_message_events       (ciclo de vida)
│
├── communication_channel_identities (provider + external_user_id (+telefone) → contact_id)
│     └── FK contact_id → contacts   (canônico; NÃO é cadastro paralelo)
│
└── communication_inbound_events (inbox bruto idempotente — precede communication_messages)
```

**Leitura dos relacionamentos:**
- **Hub → tudo:** toda entidade operacional carrega `hub_id` (RLS). Catálogos são globais.
- **Account → Conversation:** cada conversa pertence a uma conta conectada do Hub (canal+provider).
- **Conversation → Identidade/Contato:** a conversa é **identificada** por `channel_identity_id` (identidade externa); `contact_id` é **vínculo opcional** (nullable, preenchido na Fatia 1).
- **Conversation → Participants:** 1:N (suporta 1:1 e futuros grupos). Participante externo aponta para `communication_channel_identities`; participante interno aponta para `profiles`/usuário.
- **Identity → Contact:** `communication_channel_identities` é a ponte `provider+external_user_id (+telefone) → contact_id`. **Não é cadastro.**
- **Conversation → Messages → (Attachments, Events):** mensagens pertencem à conversa; anexos e eventos de ciclo de vida pendem da mensagem.
- **inbound_events:** desacoplado — é o inbox bruto que **precede** a criação de `communication_messages` (dedup antes de normalizar).

---

## 4. Modelo físico (tabelas)

> Convenção: nomes de tabela/coluna em **inglês** (padrão da plataforma); interface em pt-BR. **Namespace `communication_*` em todas as entidades operacionais e catálogos** (resolve a colisão com o legado `conversations`/`messages`/`whatsapp_instances`). Todas as entidades operacionais: `id uuid pk default gen_random_uuid()`, `created_at`, `updated_at`, `hub_id` + **RLS**. Catálogos sem `hub_id`.

### 4.1 `communication_channels` (catálogo global)
- **Finalidade:** tipos de canal suportados. Adicionar canal futuro = inserir linha.
- **Campos:** `code` (pk textual: `whatsapp`,`instagram`,`messenger`,`telegram`,`webchat`,`email`,`sms`,`rcs`), `nome`, `ativo bool`, `ordem`.
- **Relacionamentos:** referenciado por `communication_accounts.channel`, `communication_channel_identities.channel`, `communication_conversations.channel`.
- **Índices:** PK em `code`.
- **Constraints:** `CHECK (code ~ '^[a-z_]+$')`.
- **RLS:** habilitada; policy SELECT para qualquer autenticado; escrita só service role.
- **Seed inicial (Fatia 0):** `whatsapp` ativo; demais inativos (documentados, não implementados).

### 4.2 `communication_providers` (catálogo global)
- **Finalidade:** providers/adaptadores técnicos. Declara quais canais cada provider atende.
- **Campos:** `code` (pk: `cloud_api`, `evolution`(legado/ref), futuros), `nome`, `channels text[]` (canais atendidos), `ativo bool`, `is_legacy bool`.
- **Relacionamentos:** referenciado por `communication_accounts.provider`, `communication_channel_identities.provider`, `communication_messages.provider`, `communication_inbound_events.provider`.
- **Índices:** PK em `code`.
- **Constraints:** `CHECK (code ~ '^[a-z_]+$')`.
- **RLS:** SELECT autenticado; escrita service role.
- **Seed inicial:** `cloud_api` (ativo, `channels={whatsapp}`); `evolution` (`is_legacy=true`, `ativo=false` — só referência).

### 4.3 `communication_accounts`
- **Finalidade:** conta/caixa conectada de um Hub (o "número" WhatsApp do Hub, via um provider).
- **Campos:** `hub_id`, `channel` (FK code), `provider` (FK code), `external_account_id` (ex.: `PHONE_NUMBER_ID` do Cloud API), `display_label`, `status` (`ativo|inativo|erro`), `metadata jsonb` (dados não sensíveis do canal). **Credenciais/segredos NÃO ficam aqui** (ver §7).
- **Relacionamentos:** `hub_id→hubs`; referenciada por `communication_conversations.account_id`.
- **Índices:** `(hub_id)`, **UNIQUE `(provider, external_account_id)`** (uma conta externa mapeia um registro).
- **Constraints:** FK `channel`, `provider`; `status` via CHECK.
- **RLS:** `USING (hub_id = get_hub_id())` para SELECT/UPDATE; INSERT `WITH CHECK (hub_id = get_hub_id())`. Escrita de conexão pode exigir service role (fluxo de setup).
- **Políticas:** só Proprietário do Hub configura (checado na server action + RBAC `mensageria:configurar`).

### 4.4 `communication_channel_identities`
- **Finalidade:** identidade do participante externo → Contato canônico.
- **Campos:** `hub_id`, `channel`, `provider`, `external_user_id` (ex.: `wa_id`), `telefone` (E.164, normalizado), `display_name`, **`contact_id`→contacts (nullable até resolver)**.
- **Relacionamentos:** `hub_id→hubs`, `contact_id→contacts`; referenciada por `communication_conversation_participants` e `communication_conversations`.
- **Índices:** **UNIQUE `(hub_id, channel, provider, external_user_id)`**; índice `(hub_id, telefone)`; índice `(contact_id)`.
- **Constraints:** FKs; `telefone` validado por função de normalização já existente (padrão `normalize_phone`).
- **RLS:** `USING (hub_id = get_hub_id())`.
- **Políticas:** resolução/escrita pelo normalizador (service role); leitura pelo Hub.

### 4.5 `communication_conversations`
- **Finalidade:** thread de atendimento escopado por Hub+conta.
- **Campos:** `hub_id`, `account_id`→communication_accounts, `channel`, **`channel_identity_id`→communication_channel_identities (identidade externa principal — chave de identidade da conversa)**, `contact_id`→contacts (**nullable — vínculo opcional, preenchido só na Fatia 1**), `assigned_user_id`→profiles (nullable), `status` (atendimento — Fatia 0: `novo|em_atendimento|aguardando_cliente|finalizado|perdido`; estado comercial vive no Pipeline/Orçamento, DEC-023 §1), `unread_count int default 0`, `last_message_at timestamptz`, `arquivada bool default false`.
- **Relacionamentos:** ver acima; 1:N com `communication_messages` e `communication_conversation_participants`.
- **Índices:** `(hub_id, last_message_at desc)`, `(hub_id, status)`, `(hub_id, assigned_user_id)`, `(account_id)`, `(contact_id)`. **UNIQUE `(account_id, channel_identity_id)`** — identidade da conversa; evita duplicidade por participante externo. **`contact_id` NÃO participa da chave** (é nullable na Fatia 0; usá-lo como chave permitiria conversas duplicadas por NULLs distintos).
- **Constraints:** `status` via CHECK; FKs.
- **RLS:** base `USING (hub_id = get_hub_id())`. **Escopo por Assistente** (§5) aplicado na **camada de query/action** por ora (RLS granular fica para fase futura, como na DEC-015 §206).
- **Políticas:** Proprietário vê todas do Hub; Assistente vê as permitidas pela Função (filtro na action).

### 4.6 `communication_conversation_participants`
- **Finalidade:** participantes da conversa (externos e internos); base para grupos futuros.
- **Campos:** `hub_id`, `conversation_id`, `tipo` (`externo|usuario`), `channel_identity_id` (nullable, externos), `user_id` (nullable, internos), `papel` (`cliente|atendente|observador`).
- **Índices:** `(conversation_id)`, `(hub_id)`; UNIQUE parcial `(conversation_id, channel_identity_id)` e `(conversation_id, user_id)`.
- **Constraints:** CHECK que exige exatamente um entre `channel_identity_id`/`user_id` conforme `tipo`.
- **RLS:** `USING (hub_id = get_hub_id())`.

### 4.7 `communication_messages`
- **Finalidade:** mensagem normalizada (entrada/saída), agnóstica de provider.
- **Campos:** `hub_id`, `conversation_id`, `direction` (`inbound|outbound`), `sender_participant_id`→communication_conversation_participants (nullable), `tipo` (`texto|imagem|audio|video|documento|localizacao|contato|sistema`), `corpo text` (texto normalizado), `provider` (FK code), `provider_message_id` (id do provider, ex.: `wamid`), `status` (`recebida|enfileirada|enviada|entregue|lida|falha`), `enviada_em`, `payload_ref` (ponteiro opcional ao `communication_inbound_events` de origem).
- **Relacionamentos:** `conversation_id→communication_conversations`; 1:N com `communication_message_attachments` e `communication_message_events`.
- **Índices:** `(conversation_id, created_at)`, `(hub_id)`, **UNIQUE `(provider, provider_message_id)`** (idempotência de mensagem, nullable p/ outbound antes do ack).
- **Constraints:** `direction`, `tipo`, `status` via CHECK; FKs.
- **RLS:** `USING (hub_id = get_hub_id())`.

### 4.8 `communication_message_attachments`
- **Finalidade:** metadados de mídia; arquivo no bucket privado (banco não guarda binário).
- **Campos:** `hub_id`, `message_id`, `storage_path`, `mime`, `tamanho bigint`, `nome_arquivo`, **`sensivel_saude bool default false`**, `provider_media_id` (para download sob demanda do provider, quando aplicável).
- **Relacionamentos:** `message_id→communication_messages`.
- **Índices:** `(message_id)`, `(hub_id)`.
- **Constraints:** FK; `mime` não nulo.
- **RLS:** `USING (hub_id = get_hub_id())`.
- **Políticas:** binário nunca público; acesso só via signed URL emitida por server action (§7).

### 4.9 `communication_message_events`
- **Finalidade:** **ciclo de vida por mensagem** (auditoria de estado outbound/inbound).
- **Campos:** `hub_id`, `message_id`, `evento` (`enfileirada|enviada|entregue|lida|falha`), `provider`, `erro text` (nullable), `ocorrido_em timestamptz`.
- **Relacionamentos:** `message_id→communication_messages`.
- **Índices:** `(message_id, ocorrido_em)`, `(hub_id)`.
- **Constraints:** `evento` via CHECK.
- **RLS:** `USING (hub_id = get_hub_id())`.
- **Nota:** **append-only** por convenção (sem UPDATE/DELETE) — histórico de status.

### 4.10 `communication_inbound_events`
- **Finalidade:** **inbox bruto idempotente** — todo webhook recebido, antes de normalizar.
- **Campos:** `provider` (FK code), `external_event_id` (id estável derivado pelo adapter), `hub_id` (nullable até resolver a conta), `account_external_id`, `payload jsonb` (bruto), `status` (`pendente|processando|processado|erro|ignorado`), `processado_em`, `erro text`, `tentativas int default 0`, `proxima_tentativa_em timestamptz` (backoff).
- **Relacionamentos:** solto (não FK para messages — precede a normalização). Após processar, gera `communication_messages`.
- **Índices:** **UNIQUE `(provider, external_event_id)`** (dedup total), `(status, proxima_tentativa_em)`.
- **Constraints:** `status` via CHECK.
- **RLS:** escrita/leitura **service role** (é infraestrutura; não exposta à UI do Hub). `hub_id` preenchido na normalização para rastreio.
- **Retenção:** payload bruto com política de expurgo (§7).

---

## 5. Providers (camada de abstração)

### 5.1 Estrutura
```
lib/mensageria/
  providers/
    tipos.ts            → interface ProviderAdapter + DTOs normalizados (NormalizedMessage, SendResult, DeliveryStatus, InboundParseResult)
    registry.ts         → resolve provider code → adapter (mapa; único ponto que conhece nomes concretos)
    cloud-api/
      index.ts          → implementa ProviderAdapter (Cloud API)
      client.ts         → chamadas Graph API (isolado)
      webhook.ts        → verificação de assinatura + parse do payload → InboundParseResult
      mapper.ts         → payload Cloud API ↔ DTOs normalizados
  normalizer.ts         → InboundParseResult → domínio (identity → conversation → message)
  dispatcher.ts         → domínio → adapter.send (+ registro de communication_message_events)
```

### 5.2 Interface `ProviderAdapter` (contrato permanente do domínio)
Operações que **todo** provider deve expor (nomes de domínio, sem vazar provider):
- `verifyWebhook(req)` → valida assinatura/challenge e devolve ok/challenge.
- `parseInbound(payload)` → `InboundParseResult` (lista de eventos normalizados + `external_event_id` estável por evento + `account_external_id`).
- `sendMessage(account, to, content)` → `SendResult` (`provider_message_id`, status inicial).
- `fetchMedia(mediaRef)` → stream/bytes de mídia (para baixar anexo e gravar no bucket privado).
- `mapStatus(payload)` → `DeliveryStatus[]` (entregue/lida/falha por `provider_message_id`).

### 5.3 Como adicionar um provider futuro **sem alterar o domínio**
1. Criar `lib/mensageria/providers/<novo>/` implementando `ProviderAdapter`.
2. Registrar o code em `registry.ts` e inserir linha em `communication_providers` (+ canais em `communication_channels` se novo canal).
3. O route handler de webhook (`app/api/webhook/mensageria/[provider]/route.ts`) já é genérico: resolve o adapter pelo segmento `[provider]`.
4. Normalizador, dispatcher, tabelas, RLS, UI e regras **não mudam** — operam sobre DTOs normalizados.
> Garantia arquitetural: **nenhum** arquivo fora de `providers/<code>/` referencia Meta/Cloud API/WhatsApp/Evolution. Verificável por lint/grep de fronteira.

---

## 6. Fluxo completo

### 6.1 Entrada (recebimento)
```
Provider (Cloud API) envia webhook
        │
        ▼
[Route handler] app/api/webhook/mensageria/[provider]/route.ts
  • GET  = verificação (challenge/verify token)
  • POST = evento
        │  adapter.verifyWebhook(req)  → valida X-Hub-Signature-256 (app secret)
        ▼
adapter.parseInbound(payload) → N eventos normalizados (cada um com external_event_id estável)
        │
        ▼
[Inbox idempotente] INSERT em communication_inbound_events (provider, external_event_id) ON CONFLICT DO NOTHING
  • se conflito → já recebido → ignora (dedup total)
  • responde 200 IMEDIATAMENTE ao provider (NÃO normaliza no request — ver §6.3)
        │
        ▼
[Normalizador] (executado pelo poller — ver §6.3) drena communication_inbound_events pendente:
  1. resolve communication_account por account_external_id
  2. resolve channel_identity (upsert por provider+external_user_id); contact_id fica NULL
     (o vínculo ao Contato é da Fatia 1 — a conversa é identificada pela channel_identity)
  3. upsert communication_conversation por (account_id, channel_identity_id) — cria se nova
  4. INSERT communication_message (inbound) idempotente por (provider, provider_message_id)
  5. se mídia → adapter.fetchMedia → upload bucket privado → communication_message_attachments
     (marca sensivel_saude quando aplicável)
  6. atualiza conversation.unread_count++ e last_message_at (mesma transação — ver §10.3)
  7. INSERT communication_message_events (recebida)
  8. communication_inbound_events.status = processado
        │
        ▼
[Banco] estado consistente (conversation + message + attachment)
        │
        ▼
[Tela] UI lê o estado já processado (nada vem do provider direto)
```

### 6.2 Saída (resposta do usuário)
```
Usuário (Proprietário/Assistente) escreve na conversa
        │
        ▼
[Server action / route] valida auth + RBAC (mensageria:criar) + escopo por Hub/Função
        │
        ▼
INSERT communication_message (outbound, status=enfileirada) + communication_message_events(enfileirada)
        │
        ▼
[Dispatcher] adapter.sendMessage(account, to, content)
        │
        ▼
Provider aceita → retorna provider_message_id
        │
        ▼
UPDATE communication_message.provider_message_id + status=enviada; communication_message_events(enviada)
        │
        ▼
Provider envia webhooks de status (entregue/lida/falha)  ──► volta em 6.1 (communication_inbound_events)
        │
        ▼
[Normalizador de status] (mesmo poller, §6.3) adapter.mapStatus → UPDATE communication_message.status + communication_message_events(entregue|lida|falha)
        │
        ▼
[Conversation] reflete último estado; UI atualiza (revalidate)
```

### 6.3 Mecanismo de execução do normalizador (assíncrono + retry) — bloqueador B
O webhook **não** normaliza: apenas grava no inbox e responde 200 (elimina o risco de timeout do provider). A normalização roda **fora do request**, com o seguinte mecanismo explícito:

- **Disparo:** **poller agendado** via **Vercel Cron** chamando uma **rota interna protegida** (ex.: `app/api/mensageria/normalizar/route.ts`, autenticada por segredo de cron), em intervalo curto (ex.: a cada 1 min). Não depende de worker persistente (compatível com serverless). *(Alternativa equivalente registrada: Supabase scheduled function / trigger + `pg_net`; a decisão default é o Vercel Cron por reusar o stack atual.)*
- **Drenagem com trava:** cada execução seleciona um **lote** de `communication_inbound_events` elegíveis (`status='pendente'` e `proxima_tentativa_em <= now()`), marcando-os `status='processando'` com **`SELECT … FOR UPDATE SKIP LOCKED`** para impedir processamento concorrente do mesmo evento por execuções sobrepostas.
- **Idempotência:** o processamento é idempotente (mensagem única por `UNIQUE (provider, provider_message_id)`; conversa única por `UNIQUE (account_id, channel_identity_id)`); reprocessar o mesmo evento **não** duplica.
- **Retry + backoff:** falha incrementa `tentativas`, grava `erro`, mantém `status='pendente'` e agenda `proxima_tentativa_em` com **backoff exponencial**. Ao exceder o **teto** (ex.: 5 tentativas), marca `status='erro'` (**dead-letter**) para inspeção manual — nunca fica em loop infinito.
- **Comportamento em timeout:** o webhook responde 200 imediatamente, então **não há timeout do provider** no recebimento. Se uma execução do poller exceder o tempo e deixar um evento preso em `status='processando'`, um **timeout de visibilidade** o recupera: eventos em `processando` há mais de N minutos (limiar configurável) voltam a ser **elegíveis** como `pendente` na próxima execução — evita trava permanente sem violar a idempotência (reprocessar é seguro pelas UNIQUE de mensagem/conversa).
- **Roteamento por tipo de evento:** o mesmo poller processa **mensagens de entrada** e **callbacks de status** (§6.2); o normalizador distingue o tipo do evento a partir do DTO do adapter (ver achado M da auditoria).
- **Mídia fora do request:** o download de mídia (`fetchMedia`) ocorre **dentro do poller** (nunca no webhook), com o mesmo retry.

---

## 7. LGPD

- **Armazenamento:** dados de conversa/mensagem em Postgres com **RLS por `hub_id`**. `communication_inbound_events.payload` (bruto) tratado como transitório.
- **Mídia/anexos:** binário **somente** em **bucket privado** dedicado (ex.: `mensageria-media`, `public:false`), criado por migration. Banco guarda **apenas metadados** (`communication_message_attachments`).
- **Anexos sensíveis (receita/saúde):** flag `sensivel_saude`; nunca tratados como mídia comum. Podem ir a prefixo dedicado (`sensivel/`) para política de acesso/expurgo diferenciada.
- **Retenção:**
  - `communication_inbound_events.payload` bruto: **expurgo por prazo curto** após `processado` (ex.: job/policy) — minimizar dado sensível cru.
  - Mídia sensível: política de retenção definida (prazo + expurgo), documentada.
- **Auditoria:** ações sensíveis (conectar/desconectar conta, atribuir/transferir, acesso a anexo sensível, exportações futuras) registram em `audit_logs` (autor, alvo, antes→depois, data/hora).
- **Permissões:** acesso a conversa/anexo condicionado a RBAC `mensageria` + escopo (Proprietário=Hub; Assistente=Função) + RLS `hub_id`.
- **Signed URLs:** anexo acessado **apenas** via **signed URL de TTL curto**, emitida por **server action** (padrão `urlAssinadaDocumento`), usando **service role**, **após** checagem de permissão/escopo. Sem leitura pública; sem URL persistida.

---

## 8. Implementação (etapas pequenas, isoláveis)

> Cada etapa é desenvolvível, revisável e testável separadamente. Migrations a partir de **`072`** (SQL Editor no HUB DEV). Nenhuma etapa altera o WhatsApp/Evolution legado.

**Etapa 1 — Catálogos + seed.** Migration `communication_channels`, `communication_providers` (RLS SELECT autenticado; escrita service role) + seed (`whatsapp`/`cloud_api`; `evolution` legado). Tipos em `types/database.ts`.

**Etapa 2 — Núcleo de conversas.** Migration `communication_accounts`, `communication_channel_identities`, `communication_conversations`, `communication_conversation_participants` (todas `hub_id` + RLS `get_hub_id()` + índices/constraints/UNIQUE — incl. `UNIQUE (account_id, channel_identity_id)` na conversa). Tipos.

**Etapa 3 — Mensagens + mídia.** Migration `communication_messages`, `communication_message_attachments`, `communication_message_events` (RLS + índices + UNIQUE de idempotência) + **bucket privado** `mensageria-media`. Tipos.

**Etapa 4 — Inbox idempotente.** Migration `communication_inbound_events` (UNIQUE `(provider, external_event_id)`, RLS service role, status/`tentativas`/`proxima_tentativa_em`/índices). Tipos.

**Etapa 5 — Contrato de providers.** `lib/mensageria/providers/tipos.ts` (interface `ProviderAdapter` + DTOs) + `registry.ts` (vazio exceto cloud_api stub). **Sem I/O externo** — pura definição + testes de contrato.

**Etapa 6 — Adapter Cloud API.** `providers/cloud-api/` (client Graph API, webhook verify/parse, mapper). Isolado; testável com payloads de exemplo (fixtures). Sem tocar no domínio.

**Etapa 7 — Webhook receiver.** Route handler `app/api/webhook/mensageria/[provider]/route.ts`: GET verify + POST → `verifyWebhook` → `parseInbound` → grava `communication_inbound_events` (ON CONFLICT DO NOTHING) → 200 rápido. **Sem normalização** (fica no poller, §6.3).

**Etapa 8 — Normalizador de entrada + poller.** `lib/mensageria/normalizer.ts` acionado por **poller agendado (Vercel Cron → rota interna protegida, §6.3)** que drena `communication_inbound_events` pendentes com trava (`FOR UPDATE SKIP LOCKED`), **retry via `tentativas` + backoff (`proxima_tentativa_em`)** e **dead-letter (`status='erro'`)** ao exceder o teto. Fluxo: account → identity (contact_id NULL) → conversation (por `channel_identity_id`) → message (+ attachment via `fetchMedia` → bucket) → unread/last_message (mesma transação) → `communication_message_events`. Idempotente.

**Etapa 9 — Envio.** `lib/mensageria/dispatcher.ts` + server action de envio: auth+RBAC+escopo → message outbound (enfileirada) → `adapter.sendMessage` → atualiza `provider_message_id`/status → `communication_message_events`. Callbacks de status são processados pelo **mesmo poller** da Etapa 8 (§6.3).

**Etapa 10 — RBAC + navegação + middleware.** Módulo `mensageria` em `lib/rbac.ts`; item de menu em `lib/navegacao.ts` (perfis `proprietario_hub`,`assistente`); gate em `middleware.ts` (bloqueia `admin`/`gestor`, DEC-022). Função padrão de Assistente ganha `mensageria` conforme Função.

**Etapa 11 — UI mínima (server-first).** Rota `app/(dashboard)/mensageria/`: lista de conversas (filtros responsável/status), painel de conversa (histórico + envio), marcar lida, atribuir/transferir. Escopo por Hub/Função nas queries/actions. Anexos via signed URL.

**Etapa 12 — Auditoria + retenção + smoke E2E.** `audit_logs` nas ações sensíveis; job/policy de expurgo de `communication_inbound_events.payload`; smoke ponta a ponta (receber→ver→responder→status) no HUB DEV.

---

## 9. Critérios de aceite (por etapa)

- **E1:** tabelas de catálogo existem no HUB DEV; seed retorna `whatsapp`/`cloud_api`; SELECT autenticado funciona, escrita por usuário comum é negada (RLS). Tipos compilam.
- **E2:** inserir conta/identidade/conversa como usuário de um Hub funciona; **usuário de outro Hub não enxerga** (teste RLS cross-Hub via REST/service vs. usuário). UNIQUEs bloqueiam duplicidade — incl. duas conversas com o mesmo `(account_id, channel_identity_id)` → só uma.
- **E3:** inserir message + attachment; bucket `mensageria-media` existe **privado** (acesso anônimo negado); UNIQUE `(provider, provider_message_id)` impede duplicata.
- **E4:** dois INSERTs com mesmo `(provider, external_event_id)` → só **um** persiste (dedup). Status transita `pendente→processando→processado`.
- **E5:** interface e DTOs definidos; testes de contrato do adapter (mock) passam; `registry` resolve `cloud_api`. **Grep de fronteira**: nenhum nome de provider fora de `providers/`.
- **E6:** `verifyWebhook` valida assinatura correta e rejeita inválida; `parseInbound` converte fixtures reais do Cloud API em DTOs com `external_event_id` estável; `mapStatus` mapeia entregue/lida/falha.
- **E7:** GET responde challenge; POST válido grava `communication_inbound_events` e responde 200 < limite do provider; POST repetido não duplica; assinatura inválida → 401. **Não** há normalização no request.
- **E8:** a partir de um `communication_inbound_events`, o poller cria conversation+message corretas; reprocessar o mesmo evento **não** duplica; **concorrência**: duas execuções sobrepostas não processam o mesmo evento (SKIP LOCKED); **falha** respeita retry/backoff e vai para `status='erro'` (dead-letter) após o teto; mídia baixada aparece no bucket e em `communication_message_attachments`; `unread_count`/`last_message_at` corretos.
- **E9:** enviar mensagem cria outbound (enfileirada→enviada) com `provider_message_id`; webhook de status atualiza para entregue/lida; falha registra `communication_message_events(falha)` + erro.
- **E10:** menu Mensageria aparece só para `proprietario_hub`/`assistente`; `admin`/`gestor` recebem bloqueio (menu+middleware+action); Assistente sem permissão na Função não acessa.
- **E11:** Proprietário vê **todas** as conversas do Hub; Assistente vê **apenas** as permitidas pela Função; marcar lida zera `unread_count`; atribuir/transferir muda `assigned_user_id`; filtros funcionam; anexo abre só via signed URL válida.
- **E12:** ações sensíveis geram `audit_logs`; expurgo de payload bruto após prazo; smoke E2E completo verde no HUB DEV.

---

## 10. Riscos

### 10.1 Técnicos
- **Assinatura/verify do webhook** mal configurados → eventos rejeitados ou inseguros. Mitigar com E6/E7 dedicados e fixtures.
- **`external_event_id` instável** (Cloud API não tem "event id" único) → derivar id estável (ex.: `wamid` + tipo de evento) no adapter; testar dedup (E4/E8).
- **Coexistência com legado** (`conversations`/`messages` legadas) → **namespace `communication_*` distinto** para todas as novas tabelas; nunca reaproveitar tabelas antigas. Verificar que migrations 072+ não colidem.

### 10.2 Arquitetura
- **Vazamento de provider no domínio** → quebra a premissa da DEC-023. Mitigar com fronteira em `providers/` + grep/lint de fronteira no CI (E5).
- **Acoplamento comercial precoce** (tentar orçamento/pipeline na Fatia 0) → proibido; Fatia 1 e DEC-014.
- **Modelo de identidade** confundido com cadastro → `communication_channel_identities` só resolve; `contacts` canônico (revisão de código).

### 10.3 Performance
- **Processamento síncrono no webhook** → timeout do provider. Mitigar: gravar `communication_inbound_events` + 200 rápido; normalização desacoplada via **poller agendado (§6.3)** com retry/backoff e dead-letter.
- **N+1 na lista de conversas** → índices `(hub_id,last_message_at)`, `(hub_id,status)`, `(hub_id,assigned_user_id)`; agregados (`unread_count`/`last_message_at`) materializados na `communication_conversations` e **atualizados na mesma transação** da inserção da mensagem (+ job de reconciliação idempotente para evitar drift).
- **Download de mídia inline** → fazer no normalizador (poller, fora do request), com retry (§6.3).

### 10.4 Escalabilidade
- **Volume de mensagens/eventos** → `communication_messages`/`communication_inbound_events`/`communication_message_events` crescem rápido; índices enxutos + retenção de payload + (futuro) particionamento por data.
- **Multi-Hub/multi-conta** → `account_id` + `hub_id` desde já; UNIQUEs previnem colisão.
- **Multi-canal futuro** → DTOs normalizados isolam o crescimento; sem reescrita de domínio.

### 10.5 Segurança
- **RLS ausente/errada** → vazamento cross-Hub. Mitigar: RLS na 1ª migration + teste cross-Hub obrigatório (E2).
- **Escopo do Assistente na camada de app** (RLS granular adiada, DEC-015 §206) → risco se a action esquecer o filtro; centralizar o filtro de escopo num **helper único** e testá-lo (achado F da auditoria).
- **Segredos do provider** (tokens/app secret) → **nunca** no banco/cliente; só em env (Vercel + local), acessados no server. `communication_accounts` guarda só identificadores não sensíveis.
- **Anexos sensíveis** → bucket privado + signed URL curta + checagem de permissão antes de emitir (E11); expurgo (E12).
- **Endpoint público do webhook** → validar assinatura sempre; rate-limit; ignorar payloads não assinados.
- **Rota interna do poller** → protegida por segredo de cron; não acessível publicamente sem o segredo.

---

## Cronograma sugerido

Sequência com dependências e esforço relativo (P=pequeno, M=médio, G=grande). Marcos permitem revisão/teste isolado.

| Ordem | Etapa | Esforço | Depende de | Paraleliza com |
|---|---|---|---|---|
| 1 | E1 Catálogos+seed | P | — | — |
| 2 | E2 Núcleo conversas | M | E1 | E5 |
| 3 | E3 Mensagens+mídia+bucket | M | E2 | E5, E6 |
| 4 | E4 Inbox idempotente | P | E1 | E5, E6 |
| 5 | E5 Contrato de providers | P | — | E2–E4 |
| 6 | E6 Adapter Cloud API | G | E5 | E2–E4 |
| 7 | E7 Webhook receiver | M | E4, E6 | — |
| 8 | E8 Normalizador entrada + poller | G | E2, E3, E7 | — |
| 9 | E9 Envio + status | M | E8 | E10 |
| 10 | E10 RBAC+menu+middleware | P | E1 | E9 |
| 11 | E11 UI mínima | G | E8, E9, E10 | — |
| 12 | E12 Auditoria+retenção+smoke | M | E11 | — |

**Marcos:**
- **M1 — Banco pronto (E1–E4):** domínio + RLS + inbox aplicados e testados no HUB DEV. *(base para tudo)*
- **M2 — Provider isolado (E5–E6):** adapter Cloud API testado com fixtures, sem tocar no domínio. *(pode correr em paralelo a M1)*
- **M3 — Entrada ponta a ponta (E7–E8):** mensagem real chega e vira conversation/message. *(primeiro valor observável)*
- **M4 — Bidirecional (E9–E10):** responder + status + acesso por perfil.
- **M5 — Operacional (E11–E12):** UI mínima + auditoria/retenção + smoke E2E → **Fatia 0 concluída**.

**Recomendação de faseamento de PRs:** um PR por etapa (ou por marco para as menores), cada um com seu critério de aceite verificado no HUB DEV antes do merge. Registrar o avanço em `SPRINTS.md`/`CHECKPOINTS.md` conforme o fluxo oficial.

---

## Pendências de governança (antes/junto da implementação)
- Refletir a DEC-023 em `DOMINIO.md`, `FUNCIONAL.md`, `PERMISSOES.md`.
- Abrir a **Sprint da Fatia 0** em `SPRINTS.md` e `ROADMAP.md`.
- A **Fatia 1** permanece bloqueada pela **DEC-014** (desacoplar `supplier_id` do Orçamento) — não iniciar antes.

## Requisitos da Etapa 8B (herdados da auditoria arquitetural da 8A)
> A auditoria do poller (8A) confirmou a mecânica de fila correta e tratou já na 8A o crash-loop
> (tentativa contada no claim + dead-letter de presos expirados). Os pontos abaixo ficam como
> **requisitos obrigatórios da 8B** (não são defeitos da 8A):
- **Visibilidade > pior caso de processamento** (incluindo `fetchMedia`): calibrar `p_visibilidade_seg` acima do tempo máximo do handler, senão há reprocessamento concorrente — **mitigado por idempotência** (mensagem única por `provider, provider_message_id`; conversa única por `account_id, channel_identity_id`), que a 8B deve garantir.
- **Vazão:** `drenarInbox` em **loop-até-vazio** por invocação e/ou lote maior; para picos, múltiplos workers/execuções concorrentes (seguras por SKIP LOCKED). O cron 1×/min + 1 passada + lote 20 tem teto baixo.
- **Índice alinhado ao `ORDER BY created_at`** se houver backlog real (ex.: `(status, proxima_tentativa_em, created_at)` ou índice parcial), pois hoje o `idx_comm_inbound_fila(status, proxima_tentativa_em)` cobre o filtro mas não a ordenação.
- **Retenção/expurgo** do inbox (linhas `processado`/`erro` e `payload` bruto) — Etapa 12; evita bloat de tabela/índice.
- **Alerta operacional** para `status='erro'` (dead-letter) — Etapa 12; dead-letters não são reprocessados.
