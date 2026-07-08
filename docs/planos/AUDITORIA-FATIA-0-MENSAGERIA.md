# Auditoria técnica — `FATIA-0-MENSAGERIA.md`

> Relatório de auditoria arquitetural do blueprint da Fatia 0 (Mensageria). **Documento independente e permanente** — registra o estado do blueprint na data e as decisões tomadas a partir dele. Não reescreve o blueprint.
>
> **Auditor:** Arquiteto de Software Sênior / Auditor Técnico.
> **Data:** 2026-07-06.
> **Objeto:** `docs/planos/FATIA-0-MENSAGERIA.md`.
> **Referências:** DEC-023 (mãe), DEC-014/015/016/017/018/020/021/022.

---

## Escopo da auditoria
Revisão crítica exclusiva. **Não** foram propostas funcionalidades, expansões ou nova arquitetura. Procurou-se apenas: (1) inconsistências arquiteturais, (2) duplicidade de responsabilidades, (3) acoplamentos desnecessários, (4) conflitos com DECs, (5) performance, (6) segurança, (7) manutenção, (8) evolução futura, (9) decisões que geram retrabalho, (10) pontos a esclarecer.

## Veredito
**NÃO apto** a iniciar a Migration 072 no estado auditado. **1 achado Alto** (quebra a implementação) e **2 Médio-Altos** (retrabalho garantido). Resolvidos A, B e C, o blueprint é considerado maduro. Achados D–N não bloqueiam.

---

## 🔴 ALTA

### A. Colisão de nomes de tabela com o legado (`conversations`, `messages`)
- **Gravidade:** Alta.
- **Justificativa:** §4.5/§4.7 nomeiam as novas tabelas `conversations` e `messages`. O legado **já possui** tabelas com esses nomes exatos (confirmado por inspeção: `CREATE TABLE conversations`, `CREATE TABLE messages`; migrations 001/032/038/040/045). Contradiz o próprio §10.1 e o princípio de namespace novo aditivo (DEC-023).
- **Impacto:** Migration 072 **falha** (`relation already exists`) ou — com `IF NOT EXISTS` — **anexa silenciosamente ao legado**, misturando domínios e violando a DEC. Maior risco de retrabalho e corrupção conceitual.
- **Sugestão:** Namespace `communication_*` consistente em **todas** as entidades operacionais (`communication_conversations`, `communication_messages`, `communication_message_attachments`, `communication_message_events`, `communication_inbound_events`, `communication_conversation_participants`, `communication_channel_identities`). Nenhum nome novo pode coincidir com `conversations`/`messages`/`whatsapp_instances`.

---

## 🟠 MÉDIO-ALTA

### B. Mecanismo de execução do normalizador não especificado
- **Gravidade:** Médio-Alta.
- **Justificativa:** §6.1 trata o normalizador como "assíncrono/curto", mas o host é Vercel serverless — sem worker persistente. Não há definição de **o que o dispara** nem de retry.
- **Impacto:** Lacuna arquitetural central. Escolha errada → timeout do provider / implementação improvisada / retrabalho na E7–E8; afeta performance (mídia) e confiabilidade.
- **Sugestão:** Fixar o mecanismo antes da E7/E8: poller agendado (cron) drenando o inbox por status, com retry (`tentativas`) + backoff + dead-letter; webhook só grava inbox + 200.

### C. Chave de identidade da Conversation apoiada em `contact_id` (nullable)
- **Gravidade:** Médio-Alta.
- **Justificativa:** §4.5 propõe `UNIQUE (account_id, contact_id)`, mas na Fatia 0 `contact_id` é NULL (vínculo é Fatia 1). Em Postgres múltiplos NULL são distintos → não deduplica.
- **Impacto:** Conversas duplicadas para o mesmo participante externo; corrompe `unread_count`/`last_message_at`, quebra a UI, exige backfill/merge. Retrabalho direto.
- **Sugestão:** Identificar a conversa por `channel_identity_id` (`UNIQUE (account_id, channel_identity_id)`); manter `contact_id` como vínculo opcional (nullable, não-identificador).

---

## 🟡 MÉDIA (não bloqueiam — registradas)

### D. Ambiguidade Fatia 0 × Fatia 1 na resolução Identidade→Contato
- **Justificativa:** §1.1.5 lista resolução até `contact_id` como Fatia 0; §1.2/§6.1 colocam o vínculo como Fatia 1 (`contact_id` NULL).
- **Impacto:** E8 pode implementar (ou não) auto-match, divergindo da UI.
- **Sugestão:** Esclarecer: Fatia 0 faz no máximo lookup read-only (sem criar Contato); vínculo manual e criação de Contato são Fatia 1.

### E. `conversation.status` carrega estados comerciais (duplicidade)
- **Justificativa:** O enum inclui `orcamento_enviado`, `pedido_em_andamento`, `aguardando_receita` — estados comerciais que a Fatia 0 não produz e que duplicam o Pipeline (DEC-023 §1).
- **Impacto:** Duas fontes de verdade do estado comercial; valores mortos na Fatia 0.
- **Sugestão:** Na Fatia 0, restringir a estados de atendimento; comerciais como projeção futura (Fatia 1), não autoritativos na conversa.

### F. Escopo do Assistente apenas na camada de aplicação
- **Justificativa:** Decisão aprovada (DEC-015 §206). Qualquer código que esqueça o filtro expõe todas as conversas do Hub ao Assistente.
- **Impacto:** Vazamento intra-Hub por omissão.
- **Sugestão:** Choke-point único obrigatório + teste automatizado que falhe se uma action ler conversas sem o filtro (elevar a critério de aceite da E11). **Não** reabrir a decisão.

### G. Escopo de Hub no match telefone→Contato é ambíguo
- **Justificativa:** Por DEC-017, `contacts` pertence à Indústria e é operado por Hub via Carteira; um telefone pode ser visível a mais de um Hub.
- **Impacto:** Match ambíguo → vínculo ao contato errado (quando entrar).
- **Sugestão:** Definir a regra de visibilidade do match; em ambiguidade, deixar NULL para vínculo manual.

### H. Agregados denormalizados sem estratégia de consistência
- **Justificativa:** `unread_count`, `last_message_at`, `messages.status` são derivados; §10.3 não trata drift.
- **Impacto:** Divergência se não atualizados atomicamente.
- **Sugestão:** Atualizar na mesma transação da mensagem + job de reconciliação idempotente.

---

## 🟢 BAIXA (registro / evolução)

### I. Seam com o módulo Receita (DEC-018/019) indefinido
Anexo sensível da Mensageria (`mensageria-media`) × fluxo oficial de Receita (`orcamento-receitas`/`conferencias_receita`). Sem ligação agora (Fatia 1). **Sugestão:** registrar a ponte como Fatia 1+ para evitar dupla implementação.

### J. Modelo de conteúdo `corpo text` + `tipo` pode ser lossy
Conteúdo estruturado futuro (templates/interativos/localização). `payload_ref` mitiga. **Não agir agora** (seria expansão de escopo); registrar como evolução.

### K. `conversation.contact_id` assume 1:1 (tensão com grupos futuros)
`conversation_participants` já cobre grupos; manter `contact_id` nullable e fora da chave de identidade (resolvido junto de C).

### L. Higiene de numeração de migrations
Histórico com números duplicados (`038`, `041` 2×). 072 está livre (071 é a última). **Sugestão:** confirmar unicidade do prefixo.

### M. Inbox serve entrada **e** callbacks de status
O normalizador precisa distinguir tipo de evento (mensagem × status). **Sugestão:** roteamento explícito por tipo + caso de teste.

### N. `notifications` (DEC-020) não usada
Nova mensagem não gera notificação in-app. Legítimo omitir; **declarar como fora de escopo explícito** (§1.2).

---

## Decisão tomada a partir desta auditoria (2026-07-06)
Aplicar ao blueprint **apenas** os bloqueadores **A, B e C**. Os achados **D–N permanecem registrados aqui** e não são aplicados agora. Após a aplicação de A/B/C e autoauditoria confirmando a eliminação dos bloqueadores (sem novos), o blueprint é considerado **apto a iniciar a Migration 072**.
