# AUDITORIA TÉCNICA ENTERPRISE — CRM DPRIME

**Cenário-alvo:** operação tipo StinPharma (70+ representantes + assistentes, centenas de usuários simultâneos, milhares de clientes/produtos, alto volume de WhatsApp, anexos, pedidos, futura integração TOTVS Protheus).
**Data:** 2026-06-25
**Branch auditada:** `feature/filtros-pedidos`
**Natureza:** auditoria crítica baseada em evidências (arquivo:linha). Toda afirmação não comprovável está marcada como **NÃO FOI POSSÍVEL COMPROVAR**.

> **VEREDITO RESUMIDO:** O sistema é um MVP funcional e bem modelado no banco, **mas NÃO está pronto para venda/produção enterprise**. Há **bloqueadores críticos de segurança** (segredos de produção versionados no Git), **arquitetura de WhatsApp sem fila/transação** (perda de mensagens sob volume), **ausência total de testes, monitoramento e observabilidade**, e **gargalos de performance** que inviabilizam centenas de usuários simultâneos sem refatoração. **Nota global ponderada: 4,0/10.**

---

# ETAPA 1 — Arquitetura Geral

| Item | Constatação | Evidência |
|------|-------------|-----------|
| Linguagem | TypeScript (strict) | `tsconfig.json:7` `"strict": true` |
| Framework | Next.js 16.2.6 (App Router) + React 19 | `package.json` deps |
| Padrão arquitetural | Monólito Next.js full-stack (front + back no mesmo app) | estrutura `app/` |
| Frontend/Backend | **Não há separação física** — Server Components + Server Actions + API Routes no mesmo deploy | `app/(dashboard)`, `app/actions`, `app/api` |
| Banco | Supabase (Postgres gerenciado) | `lib/supabase/*` |
| Server Components | Páginas de listagem são Server Components (bom) | `app/(dashboard)/pedidos/page.tsx`, `contatos/page.tsx` |
| Client Components | **118 de 271 arquivos (~44%) têm `'use client'`** | medição `grep -rl "'use client'"` |
| Middleware | 1 middleware de auth | `middleware.ts:5` |
| Autenticação | Supabase Auth via cookies SSR | `middleware.ts:47` `supabase.auth.getUser()` |
| Autorização | RBAC por `cargo` (admin/gestor/vendedor/atendimento) checado **ad-hoc** em cada action/rota | `lib/quote-permissions.ts`, `lib/auth/server.ts` |

### Módulos (rotas de UI)
`painel`, `leads`, `pipeline`, `contatos`, `orcamentos`, `pedidos`, `tarefas`, `relatorios`, `whatsapp`, `caixa-de-entrada`, `configuracoes` (+ `configuracoes-whatsapp`, `monitoramento-whatsapp`, `debug-whatsapp`).

### APIs (`app/api/**/route.ts`)
`webhook/evolution`, `whatsapp/{send,instances,vendedores,maintenance,debug-env}`, `orcamentos/{acao,transformar-em-pedido,[id]/pdf}`, `user/cargo`, `admin/backfill-nomes-conversas`, `exportacao-log`, `debug-env`.

### Diagrama textual de fluxo

```
                    ┌─────────────────────────────────────────┐
   Navegador  ─────▶│  middleware.ts (auth via cookie SSR)     │
   (vendedor)       │  libera: /login /api/webhook /whatsapp/test
                    └───────────────┬─────────────────────────┘
                                    ▼
        ┌──────────────────────────────────────────────────────┐
        │  Next.js App (Vercel  E  EasyPanel/Docker — 2 alvos)   │
        │                                                        │
        │  Server Components ──▶ supabase (anon key + RLS)       │
        │  Server Actions   ──▶ supabase (anon)  ┐               │
        │  API Routes       ──▶ supabase (anon)  ├─▶ Postgres    │
        │       │             └▶ createAdminClient (SERVICE ROLE,│
        │       │                bypassa RLS) ────────┘          │
        │       └─▶ Puppeteer/Chromium (PDF, SÍNCRONO na request)│
        └───────┬───────────────────────────────▲───────────────┘
                │ POST /chat/sendText             │ POST webhook?secret=
                ▼                                 │ (SÍNCRONO, sem fila)
        ┌───────────────────────┐                │
        │ Evolution API (VPS)    │────────────────┘
        │ evolution.dprime...    │  messages.upsert / connection.update
        └───────────────────────┘
```

**Crítica:** não há camada de serviço/domínio isolada; regras de negócio vivem misturadas em Server Actions de 500–670 linhas (`app/(dashboard)/pedidos/actions.ts` = 668 linhas; `whatsapp/actions.ts` = 593). A lógica de autorização é replicada manualmente por endpoint — não há um *guard* central, o que gera inconsistência (ver Etapa 4).

---

# ETAPA 2 — Infraestrutura

| Camada | Constatação | Evidência |
|--------|-------------|-----------|
| Frontend/Backend | Deployado em **DOIS lugares simultâneos**: Vercel (preview/CI) **e** EasyPanel via Docker (produção) | `next.config.ts:15` (`output` condicional por `process.env.VERCEL`), `Dockerfile`, `.github/workflows/deploy.yml` |
| Plano Vercel | **NÃO ENCONTRADO** | — |
| Plano/recursos EasyPanel/VPS | **NÃO ENCONTRADO** (CPU/RAM/disco) | — |
| Banco | Supabase, projeto ref `zjhapezbcqoqwrwolcju` | `DEPLOY.md:45` (vazado) |
| Plano Supabase | **NÃO ENCONTRADO** | — |
| Storage | Supabase Storage, bucket `whatsapp-media` **público** | `supabase/migrations/024_whatsapp_media_bucket.sql` |
| Limites de storage | **NÃO ENCONTRADO** | — |
| Evolution API | Self-hosted em `https://evolution.dprimerepresentacao.com.br` | `DEPLOY.md:48` |
| Docker | Sim, multi-stage, `node:20-alpine`, usuário não-root, healthcheck HTTP | `Dockerfile`, `docker-compose.yml:29` |
| Reverse proxy / SSL / CDN / LB | Presumivelmente Vercel Edge (Vercel) e EasyPanel (Traefik) — **NÃO COMPROVADO** no repo | — |
| Cache (Redis/etc.) | **NÃO ENCONTRADO** (nenhuma dependência de cache externo) | `package.json` |
| Balanceador | **NÃO ENCONTRADO** | — |

**Risco arquitetural grave (Etapa 2):** existem **dois ambientes de produção divergentes** (Vercel + EasyPanel). Conforme nota de contexto do projeto, o webhook do GitHub para o EasyPanel **sempre builda a `main`** — uma feature branch não atualiza o container, mas a Vercel gera preview. Isso significa que **o que o cliente vê pode divergir do que está na Vercel**, e não há documento definindo qual é a fonte da verdade. Não há ambiente de homologação formal.

---

# ETAPA 3 — Banco de Dados

**Modelo: o ponto mais forte do sistema.** 35 tabelas, multi-tenant por `organization_id`, RLS habilitada em 100% das tabelas.

| Métrica | Valor | Evidência |
|---------|-------|-----------|
| Tabelas | 35 | migrations 001–055 |
| Multi-tenancy | `organization_id NOT NULL` em 33/35 (2 isoladas via FK reverso) | `001:52`, `025:15`, `001:279` |
| RLS habilitada | 35/35 | `001:377-397` + posteriores |
| Policies | ~46, baseadas em `get_organization_id()` (SECURITY DEFINER, STABLE) | `001:401-408`, `001:422-492` |
| Índices | ~62 (incl. composites org+filtro e migration dedicada) | `001:355-370`, `037_indices_performance.sql` |
| RPCs | 5: `get_organization_id`, `get_user_role`, `selecionar_proximo_vendedor`, `normalize_phone`, `convert_orcamento_to_pedido` | `001`, `003`, `033`, `044` |
| Triggers | **0** | nenhuma migration cria trigger |
| Views | **0** | — |

### Qualidade do modelo
- **Bom:** isolamento por org consistente, índices compostos em `(organization_id, status/responsavel/criado_em)`, RPC `convert_orcamento_to_pedido` com validação multi-passo + `FOR UPDATE` lock (`044:11-158`).
- **Anti-pattern:** `supplier_freight` (`031:16`) e `freight_carriers` (`034:14`) usam subselect `(SELECT organization_id FROM profiles WHERE id = auth.uid())` em vez de `get_organization_id()` — reavaliado por linha, sem cache.
- **Policy permissiva:** `organizations` tem `FOR SELECT USING (true)` (`001:491`) — leitura ampla; risco baixo mas existe.

### Gargalos / pontos sem índice (sob volume)
- **Tabelas de crescimento ilimitado sem particionamento:** `messages`, `conversations`, `audit_logs`, `pedido_audit_logs`, `orders`, `quotes`. Com milhares de mensagens/dia, `messages` será a maior tabela e não há estratégia de retenção/partição.
- **Faltam índices em colunas de filtro/busca frequentes:** `contacts.telefone`, `conversations.telefone_externo`, `companies.cnpj`, `suppliers.cnpj`, `quotes.numero`, `orders.numero`.
- **Sem full-text index (GIN):** buscas em `products.descricao`, `leads.observacoes` etc. caem em `ILIKE %...%` → seq scan.
- **Auditoria por aplicação, não por trigger:** `audit_logs`/`pedido_audit_logs` dependem de a aplicação lembrar de inserir → trilha incompleta se um caminho de código esquecer.

---

# ETAPA 4 — Segurança

## 🔴 CRÍTICO

1. **Segredos de produção REAIS versionados no Git.** Chave da Evolution (`EVOLUTION_API_KEY=DprimeEvo2024BootKey`), `EVOLUTION_WEBHOOK_SECRET=webhook-secret-dprime-2024` e ref do Supabase estão em texto puro em arquivos rastreados.
   - Evidência: `DEPLOY.md:48-50`, `opcoes-deploy.md`, `scripts/setup-env.sh`, `scripts/setup-webhook.sh` (confirmado via `git ls-files | xargs grep`).
   - Impacto: qualquer pessoa com acesso ao repositório (ou histórico) controla a Evolution e pode forjar webhooks. **Estas chaves devem ser consideradas comprometidas e rotacionadas.**

2. **Webhook usa `createAdminClient()` (service role, bypassa RLS) autenticado só por secret em query string.** `app/api/webhook/evolution/route.ts:42` (`secret = searchParams.get('secret')`) + `:60` (`createAdminClient()`). Secret em query aparece em logs de proxy/servidor. Existe uma versão melhor com HMAC (`route-improved.ts:102` `verifyHmacSignature`) **que não está em uso**.

3. **`/api/whatsapp/maintenance`** usa service role e valida apenas um secret, **sem filtro de organização** → quem tiver o secret opera sobre qualquer org. `app/api/whatsapp/maintenance/route.ts`.

## 🟡 MÉDIO
- **`/api/whatsapp/send`** (`:21` autentica) **não verifica se o usuário é o `responsavel_id` da conversa** → vendedor pode enviar em conversa de outro (IDOR dentro da mesma org).
- **`/api/whatsapp/vendedores`** — sem `getUser()` aparente (enumera vendedores).
- **`/api/debug-env`** sem autenticação (mascara valores, mas revela ambiente).
- **`/api/exportacao-log`** não valida se `conversaId`/`leadId` pertencem à org do usuário.
- **Sem rate limiting em nenhuma rota** (DoS / abuso de `send`).
- **Sem proteção CSRF explícita** e **sem headers de segurança** (CSP, HSTS, X-Frame-Options) — `next.config.ts` não define `headers()`.

## ✅ Pontos corretos
- RLS isolando por org no banco (defesa em profundidade real).
- Server Actions de orçamento/usuário checam `cargo` (`orcamentos/actions.ts:336`, `usuarios/actions.ts:16`).
- Validação de UUID em `transformar-em-pedido` (`:31`).
- Cliente service role isolado e comentado como "nunca importar em client" (`lib/supabase/admin.ts:3`).

**Sobre SQL Injection:** uso do client Supabase (parametrizado) reduz risco; porém filtros `.or('nome.ilike.%${termo}%')` concatenam input — auditar contra injeção de operadores PostgREST. **NÃO FOI POSSÍVEL COMPROVAR** sanitização do termo.

---

# ETAPA 5 — Performance

| Área | Constatação | Evidência |
|------|-------------|-----------|
| Paginação | **Inconsistente.** `orcamentos`, `contatos`, `leads` paginam com `.range()`. `pedidos` carrega `.limit(1000)` e filtra em JS; `configuracoes/produtos` faz `select('*')` **sem limit** | `pedidos/page.tsx:71`, `produtos/page.tsx:23`, `orcamentos/page.tsx:44` |
| N+1 | `orcamentos/page.tsx:53-67` faz 2ª query para nomes de contatos (join falho) | idem |
| SELECT * | `produtos`, `contatos`, `leads` trazem todas as colunas | `produtos/page.tsx:23`, `contatos/page.tsx:44` |
| Server vs Client | Listagens são Server Components (bom); ~44% do código é client | medição |
| Cache/ISR | **Zero ISR/`generateStaticParams`.** `whatsapp/page.tsx:5` e `proposta/[token]` usam `force-dynamic`; 41 usos de `revalidatePath` | `whatsapp/page.tsx:5` |
| Busca/filtros | Debounce existe (`contatos`, `leads`); mas `orcamentos`/`pedidos` filtram **em memória** no client | `tabela-orcamentos.tsx:49`, `pedidos/page.tsx:43` |
| PDF | **Puppeteer/Chromium SÍNCRONO na request (~5-12s), sem fila, novo browser por request** | `api/orcamentos/[id]/pdf/route.ts:84-115`, `lib/pdf/launch-browser.ts` |
| Re-render | Tabelas client sem `useMemo`/`memo`/virtualização | `tabela-contatos.tsx`, `tabela-orcamentos.tsx` |
| Lazy/code-split | **Zero `next/dynamic`, `React.lazy`, `Suspense`** | medição `grep` |

**Conclusão:** a geração de PDF e a página de produtos são gargalos imediatos; sob dezenas de downloads concorrentes de PDF, o runtime serializa e estoura `maxDuration`. A ausência de code-splitting infla o bundle inicial.

---

# ETAPA 6 — Escalabilidade

| Usuários simultâneos | Suporta? | Justificativa técnica (evidência) |
|---|---|---|
| **50** | **PARCIALMENTE** | Postgres+RLS aguenta; gargalos = PDF síncrono e listagens sem paginação (`produtos/page.tsx:23`, `pedidos/page.tsx:71`). Funciona com lentidão pontual. |
| **100** | **PARCIALMENTE / arriscado** | Webhook WhatsApp síncrono sem fila começa a competir por conexões do Postgres; PDF concorrente serializa. Sem cache. |
| **300** | **NÃO** | Sem fila de mensagens (`route.ts` processa inline), sem pool/PgBouncer comprovado, sem rate limit. Picos de WhatsApp + PDF saturam conexões. |
| **500** | **NÃO** | Mesmos limites + ausência de horizontal scaling formal no EasyPanel; Supabase connection limit (plano desconhecido) seria atingido. **NÃO FOI POSSÍVEL COMPROVAR** limite exato. |
| **1000** | **NÃO** | Arquitetura inline + sem observabilidade torna inoperável sem reescrita do pipeline e do PDF. |
| **5000** | **NÃO** | Exige fila, workers, cache, particionamento de `messages`, CDN, autoscaling — nada disso existe. |

> **Não há nenhum teste de carga no repositório.** Todos os limiares acima são análise estática. A capacidade real **NÃO FOI POSSÍVEL COMPROVAR** sem k6/Locust.

---

# ETAPA 7 — WhatsApp / Evolution

| Item | Status | Evidência |
|------|--------|-----------|
| Webhook | **Implementado, SÍNCRONO** (trata `messages.upsert`, `connection.update`, `messages.update`) | `route.ts:71-610` |
| Fila | **NÃO IMPLEMENTADO** — processa tudo inline na request HTTP | ausência |
| Persistência | Parcial — `insert` em `messages` **sem transação**; conversa/lead/mensagem podem ficar órfãos | `route.ts:560-579` |
| Duplicidade/idempotência | **Frágil** — `SELECT count` antes do `INSERT` (race condition); IDs nulos não deduplicam; erro de duplicata silenciado | `route.ts:126-132`, `:576` |
| Retry (envio) | Implementado, backoff exponencial 3x — **mas falha não marca mensagem como `falhou`** (status fica `enviada` para sempre) | `lib/evolution-retry.ts:18-60`; enum em `001:183` |
| Reconexão | Só atualiza `status_conexao`; **sem auto-reconexão nem health check ativo** | `route.ts:70-84` |
| Instâncias | Multi-instância por `evolution_instance_name` (UNIQUE); **sem constraint garantindo `instancia.org = conversa.org`** | `001:185-201` |
| Uploads/mídia | Implementado em bucket **público**; **sem limite de tamanho padrão**; se upload falha, mensagem salva com `url_midia=null` (mídia perdida) | `route.ts:526-558`, `024` |
| Histórico | **NÃO IMPLEMENTADO** (não importa histórico ao conectar) | ausência |
| Logs | Apenas `console.log/error`, sem trace ID, sem persistência | `route.ts:149,219,342,552,577` |

**Risco central:** com 70+ instâncias e milhares de mensagens/dia, o webhook inline **vai perder mensagens** em qualquer indisponibilidade momentânea (DB lento, storage fora, deploy). Não há fila, dead-letter, nem trilha de auditoria para reconstruir o que se perdeu. Este é, junto com os segredos vazados, o maior bloqueador enterprise.

---

# ETAPA 8 — Qualidade do Código

| Item | Constatação | Evidência |
|------|-------------|-----------|
| TypeScript | `strict: true` (bom) | `tsconfig.json:7` |
| ESLint | Apenas `eslint-config-next` repassado, **sem regras adicionais** | `eslint.config.js` |
| Duplicação | **Webhook duplicado** (`route.ts` + `route-improved.ts`, 613+678 linhas); arquivos `page.backup.tsx`, `package-lock 2.json`, `vercel 2.json` versionados | `git ls-files` |
| Complexidade | Actions gigantes: `pedidos/actions.ts` 668, `form-orcamento.tsx` 859, `orcamento-pdf-generator.ts` 915 linhas | `wc -l` |
| Separação de responsabilidades | Fraca — regra de negócio + acesso a dados + autorização no mesmo arquivo | `*/actions.ts` |
| Organização | **43 arquivos `.md`/`.sql` soltos na raiz** (relatórios, SQL ad-hoc de debug) | `ls *.md *.sql` |
| Naming/Clean Code | Razoável em pt-BR, consistente | geral |

Veredito: código de produto entregável em ritmo de MVP, **sem disciplina de engenharia de plataforma** (sem camada de domínio, sem dedup de webhook, lixo de debug versionado).

---

# ETAPA 9 — Operação

| Item | Status | Evidência |
|------|--------|-----------|
| Logs | Só `console.*`, dispersos no Vercel/EasyPanel | código |
| Monitoramento | **NÃO IMPLEMENTADO** (sem Sentry/Datadog/OTel/Analytics) | `grep` em `package.json`/código = vazio |
| Alertas | **NÃO ENCONTRADO** | — |
| Health check | Apenas o `healthcheck` do Docker (`docker-compose.yml:29`); **não há endpoint `/api/health` na app** | — |
| Backup | **NÃO ENCONTRADO** no repo (depende do plano Supabase) | — |
| Rollback | Manual via Vercel Dashboard ou `git reset --hard + push --force` (perigoso) | `DEPLOY.md:184-188` |
| Observabilidade | **Inexistente** — impossível rastrear request fim-a-fim | — |
| Failover/Recovery | **NÃO ENCONTRADO** | — |
| Métricas | **NÃO ENCONTRADO** | — |
| Auditoria | Tabelas existem (`audit_logs`) mas preenchidas manualmente, sem trigger | `001:338` |
| Cron quebrado | `vercel.json:19` aponta `/api/cleanup-whatsapp-cache` que **não existe** | confirmado |

**Para uma venda enterprise, esta é a área mais deficitária junto com testes.** Não há como provar SLA, nem diagnosticar incidentes.

---

# ETAPA 10 — Deploy

| Item | Constatação | Evidência |
|------|-------------|-----------|
| CI/CD | GitHub Actions: `lint` + `build` + deploy Vercel no push/PR para `main` | `.github/workflows/deploy.yml` |
| **Sem etapa de teste no CI** | `npm run lint && build` apenas — não há `test` | idem (não há testes) |
| Branches/Ambientes | `main` = produção; **dois alvos divergentes** (Vercel + EasyPanel) | `next.config.ts:15` |
| Homologação | **NÃO ENCONTRADO** ambiente de staging formal | — |
| Rollback | Manual (inclui `push --force`, prática perigosa) | `DEPLOY.md:184` |
| Secrets | **VAZADOS no Git** (ver Etapa 4) | `DEPLOY.md:45-52` |
| Variáveis | `.env.example` correto; `.env`/`.env.local` **não** versionados (bom) — mas valores reais estão em docs | `.env.example`, `git ls-files` |

---

# ETAPA 11 — Capacidade Enterprise (StinPharma)

**O sistema está preparado para atender uma empresa semelhante à StinPharma? → NÃO, no estado atual.**

| Dimensão | Nota | Justificativa (evidência) |
|----------|:---:|---------------------------|
| Arquitetura | **6** | App Router bem usado, Server Components; mas sem camada de domínio, actions gigantes, 2 alvos de deploy divergentes. |
| Banco | **7,5** | Melhor área: RLS 100%, multi-tenant sólido, RPC com lock. Faltam índices de busca, particionamento e triggers de auditoria. |
| Escalabilidade | **3** | Webhook inline sem fila, PDF síncrono, sem cache/pool comprovado. Não passa de ~100 usuários sem reescrita. |
| Segurança | **3** | Segredos vazados no Git, service role exposto via secret em query, sem rate limit/CSRF/headers. RLS salva a nota de cair mais. |
| Infraestrutura | **4** | Dockerizado e em Supabase gerenciado, mas planos/recursos desconhecidos, sem CDN/cache/LB comprovados, cron quebrado. |
| Código | **5** | TS strict; porém duplicação (webhook 2x), lixo versionado, sem padrões além do ESLint default. |
| Performance | **4** | Paginação inconsistente, `select('*')` ilimitado, sem code-splitting, PDF bloqueante. |
| Operação | **2** | Sem monitoramento, alertas, métricas, health endpoint ou observabilidade. |
| WhatsApp | **3** | Funciona em baixo volume; sem fila/transação/idempotência robusta → perde mensagens sob carga. |
| Deploy | **4** | CI existe, mas sem testes, com secrets vazados e rollback manual via force-push. |

> **NOTA GLOBAL PONDERADA ≈ 4,0/10.** Reprovado para venda enterprise sem o roadmap abaixo.

---

# ETAPA 12 — Pontos Críticos (ordenados por risco)

### 🔴 CRÍTICO
1. **Segredos de produção versionados no Git** (`DEPLOY.md:48-50`). *Impacto:* comprometimento total da Evolution e forja de webhooks. *Probabilidade:* alta (já exposto). *Solução:* rotacionar TODAS as chaves, purgar do histórico (git filter-repo/BFG), migrar para secrets manager.
2. **Webhook WhatsApp sem fila/transação/idempotência forte** (`route.ts:126-579`). *Impacto:* perda silenciosa de mensagens sob volume. *Probabilidade:* alta no cenário StinPharma. *Solução:* enfileirar (pgmq/Redis) + `INSERT ... ON CONFLICT` + worker assíncrono + retorno 202.
3. **Service role exposto por secret em query string** (`route.ts:42,60`; `whatsapp/maintenance`). *Impacto:* escrita irrestrita no banco. *Solução:* adotar HMAC (já existe em `route-improved.ts:102`), header `Authorization`, e idealmente abandonar service role no webhook.
4. **Ausência total de observabilidade/monitoramento** (Etapa 9). *Impacto:* incidentes invisíveis, sem SLA defensável. *Solução:* Sentry + logs estruturados + endpoint `/api/health` + uptime.

### 🟠 ALTO
5. **Zero testes automatizados** → qualquer mudança pode quebrar pedidos/orçamentos em produção. *Solução:* suíte mínima (unit nas RPCs/permissões + e2e do fluxo orçamento→pedido).
6. **PDF Puppeteer síncrono** (`pdf/route.ts:84`). *Impacto:* timeouts e saturação sob concorrência. *Solução:* fila/worker + cache do PDF gerado.
7. **Listagens sem paginação** (`produtos/page.tsx:23`, `pedidos/page.tsx:71`). *Impacto:* OOM/lentidão com milhares de registros.

### 🟡 MÉDIO
8. IDOR em `/api/whatsapp/send` e `/api/exportacao-log`.
9. Bucket `whatsapp-media` público + sem limite de tamanho de anexo.
10. Dois alvos de deploy divergentes sem fonte de verdade definida.
11. Faltam índices de busca (telefone/cnpj/numero) e particionamento de `messages`.

### 🔵 BAIXO
12. Lixo versionado (`*.backup.tsx`, `package-lock 2.json`, 43 docs/SQL na raiz).
13. Cron `vercel.json` aponta para rota inexistente.
14. ESLint sem regras além do default.

---

# ETAPA 13 — Roadmap

### Antes de VENDER (bloqueadores de credibilidade — dias)
- Rotacionar e remover **todos** os segredos do Git; purgar histórico.
- Endpoint `/api/health` + integrar Sentry (erros) + logs estruturados com request-id.
- Corrigir webhook: HMAC + `ON CONFLICT` (idempotência) + remover service role onde der.
- Definir e documentar **um** ambiente de produção (Vercel **ou** EasyPanel).

### Antes do PILOTO (semanas)
- Fila para webhook WhatsApp (pgmq/Redis) + worker + dead-letter + marcar `falhou`.
- Paginação server-side em produtos e pedidos; remover filtros em memória.
- Suíte de testes do núcleo financeiro (orçamento→pedido) e de permissões; adicionar `test` ao CI.
- Rate limiting nas rotas públicas/sensíveis; headers de segurança (CSP/HSTS).
- Corrigir IDOR (`send`, `exportacao-log`); bucket de mídia privado + limite de tamanho.

### Antes da PRODUÇÃO (semanas–meses)
- PDF assíncrono (fila) + cache; PgBouncer/pool e validar plano Supabase.
- Índices faltantes + particionamento/retenção de `messages` e `audit_logs`.
- Health check ativo de instâncias Evolution + auto-reconexão + alertas.
- Ambiente de homologação real; rollback versionado (sem force-push).
- **Teste de carga (k6/Locust)** com metas (ex.: 300 usuários simultâneos) antes de assinar SLA.

### Antes de ESCALAR (StinPharma — meses)
- Autoscaling de workers; CDN para mídia; observabilidade completa (métricas/tracing/OTel).
- Camada de domínio/serviços; quebrar actions gigantes; backups testados (restore drills).
- Estratégia de integração TOTVS Protheus (fila de saída/anti-corruption layer) — **hoje não há nenhum código de ERP**; **NÃO IMPLEMENTADO**.

---

# ETAPA 14 — Evidências (índice)
Todas as afirmações citam arquivo:linha ao longo do documento. Fontes primárias: `middleware.ts`, `next.config.ts`, `Dockerfile`, `docker-compose.yml`, `vercel.json`, `.github/workflows/deploy.yml`, `DEPLOY.md`, `tsconfig.json`, `eslint.config.js`, `supabase/migrations/*`, `app/api/webhook/evolution/route.ts`, `app/api/orcamentos/[id]/pdf/route.ts`, `lib/evolution-retry.ts`, `lib/queries/conversas.ts`, e páginas em `app/(dashboard)/*`. Medições (`wc -l`, `grep -rl`, `git ls-files`) reproduzíveis na raiz do projeto.

---

# ETAPA 15 — Informações Não Encontradas

| INFORMAÇÃO NECESSÁRIA | STATUS | ONDE OBTER |
|---|---|---|
| Plano do Supabase | Não encontrado | Supabase Dashboard → Settings → Billing |
| Limite de conexões do banco | Não encontrado | Supabase Dashboard → Database → Settings |
| Plano/recursos Vercel | Não encontrado | Vercel Dashboard → Settings → Usage |
| CPU/RAM/Disco da VPS (EasyPanel/Evolution) | Não encontrado | Servidor → `lscpu`, `free -h`, `df -h` |
| CDN / Cache / Load Balancer | Não encontrado | Cloudflare / Vercel / EasyPanel (Traefik) |
| Backups e política de retenção | Não encontrado | Supabase Dashboard → Database → Backups |
| Rate limits configurados | Não encontrado | Não há no código; verificar proxy/WAF |
| Monitoramento/alertas | Não encontrado | Verificar Sentry/Grafana/Uptime Kuma/Datadog |
| Qtd. atual de clientes/usuários/mensagens | Não encontrado | Banco (`SELECT count(*)` em contacts/profiles/messages) |
| Volume diário de pedidos | Não encontrado | Banco (`orders` por dia) |
| Tempo médio de resposta | Não encontrado | Executar benchmark / APM |
| Carga simultânea suportada | Não encontrado | Teste de carga (k6/Locust/JMeter) |
| Limites de tamanho de Storage | Não encontrado | Supabase Dashboard → Storage |
| Integração TOTVS Protheus | Não implementado | Não há código de ERP no repositório |

---

## Classificação final por funcionalidade
- **Implementado e comprovado:** auth por cookie, RLS multi-tenant, CRUD de leads/contatos/orçamentos/pedidos, conversão orçamento→pedido (RPC com lock), envio/recebimento WhatsApp em baixo volume, geração de PDF, CI de build+deploy.
- **Parcialmente implementado:** paginação (só algumas telas), idempotência de webhook, retry de envio (sem marcar falha), reconexão de instância (sem auto), autorização RBAC (inconsistente entre rotas).
- **Não implementado:** fila de mensagens, testes, monitoramento/observabilidade, health endpoint, rate limiting, importação de histórico WhatsApp, integração Protheus, particionamento de tabelas, ambiente de homologação.
- **Não foi possível comprovar:** capacidade real de carga, planos/recursos de infra, backups, limites de conexão, CDN/cache/LB.
