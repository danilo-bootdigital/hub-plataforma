# Auditoria de Independência — SISTEMA STIN PHARMA

**Projeto clonado de:** `boot-crm` / CRM DPRIME
**Objetivo:** tornar o projeto 100% independente (sem dependência de GitHub, Supabase, Vercel, Evolution API, domínios, nomes e configurações do projeto anterior).
**Data:** 2026-06-25
**Status:** SOMENTE LEITURA — nenhuma alteração foi feita. Este é o relatório/plano para aprovação.

---

## 1. Resumo executivo (semáforo)

| # | Categoria | Status |
|---|-----------|--------|
| 1 | Arquivos `.env` / variáveis | 🔴 Apontam para infra antiga (Supabase + Evolution + domínio DPRIME) |
| 2 | Configuração Supabase | 🔴 **Mesma instância de produção do DPRIME** (risco máximo) |
| 3 | Evolution API | 🟡 Código é env-based (ok), mas scripts e defaults têm domínio/keys DPRIME |
| 4 | Webhooks | 🟡 Código env-based; `setup-webhook.sh` hardcoda domínio + secret antigos |
| 5 | URLs fixas no código | 🟢 Quase nenhuma no app; 🟡 várias em scripts `.sh` e `test-config.sh` |
| 6 | Referências a DPrime / Boot | 🔴 Nome do projeto, branding na UI, PDF, seeds e configs |
| 7 | Git atual | 🔴 `origin` ainda aponta para `danilo-bootdigital/boot-crm` |
| 8 | Deploy | 🔴 `.vercel/` vinculado ao projeto Vercel `boot-crm`; workflow GitHub Actions |
| 9 | Scripts `package.json` | 🟡 `deploy:*` chamam scripts com domínio/secret DPRIME |
| 10 | Migrations e dependências do banco | 🟡 60+ migrations; algumas são "fix" de dados antigos; seed embutido |
| 11 | RLS / policies / funções SQL | 🟢 Estrutura ok; vivem na instância compartilhada (ver #2) |
| 12 | Rotas internas | 🟢 Independentes, todas env-based |
| 13 | Webhooks → ambiente antigo | 🟡 `setup-webhook.sh` registraria webhook no domínio DPRIME |
| 14 | Storage buckets | 🟡 `whatsapp-media` e `public-assets` na instância compartilhada (ver #2) |
| 15 | Uploads / documentos / anexos | 🟡 Gravados na instância/buckets compartilhados (ver #2) |
| 16 | Autenticação | 🟡 `config.toml` com `site_url` localhost; auth na instância compartilhada |
| 17 | Seeds / dados iniciais | 🟡 Sem `seed.sql`; migration `001` insere org "Boot Digital" |

🟢 Independente · 🟡 Precisa de ajuste · 🔴 Bloqueante / risco crítico

---

## 2. O que JÁ está independente (não precisa mexer)

- **Cliente Supabase** (`lib/supabase/{client,server,admin}.ts`, `lib/auth/server.ts`): lê **somente de variáveis de ambiente** (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Nenhuma URL/key hardcoded no código.
- **Cliente Evolution** (`lib/evolution.ts`, `lib/evolution-retry.ts`): tudo via `process.env.EVOLUTION_API_URL` / `EVOLUTION_API_KEY`. Sem domínio hardcoded.
- **Rotas internas / API** (`app/api/**`): consomem env vars; não há URL absoluta do projeto antigo embutida.
- **Webhook handler** (`app/api/webhook/evolution/route.ts`): valida via `process.env.EVOLUTION_WEBHOOK_SECRET`. Env-based.
- **`.env*` e `.vercel/` NÃO estão versionados** no git (`.gitignore` cobre `.env*` exceto `.env.example`, e `.vercel`). ✅ Sem vazamento de segredos no histórico do repo.

> Conclusão: **a camada de código está praticamente pronta para ser independente.** O acoplamento ao projeto antigo está concentrado em **configuração, infraestrutura e branding**, não na lógica.

---

## 3. O que AINDA depende do projeto antigo

### 3.1 🔴 CRÍTICO — Banco de dados Supabase compartilhado
Tanto `.env` quanto `.env.local` apontam para a **mesma instância de produção do DPRIME**:
```
NEXT_PUBLIC_SUPABASE_URL=https://zjhapezbcqoqwrwolcju.supabase.co
```
Isso significa que **o "STIN PHARMA" hoje lê e ESCREVE no banco de produção do DPRIME** — incluindo auth (usuários), storage (anexos WhatsApp, assets), pedidos, orçamentos, conversas. Qualquer teste ou uso real **contamina os dados do cliente antigo**. É o risco número 1.

### 3.2 🔴 CRÍTICO — Git aponta para o repositório antigo
```
origin  git@github.com:danilo-bootdigital/boot-crm.git
```
Um `git push` enviaria commits do STIN PHARMA para o repo do DPRIME.

### 3.3 🔴 CRÍTICO — Vercel vinculado ao projeto antigo
`.vercel/project.json`:
```json
{"projectId":"prj_fU7yzOLbsDNLfKDsUErygECJfWhL","orgId":"team_arK9sOlqcTzZRpVGeZ2NZklT","projectName":"boot-crm"}
```
Um `vercel deploy` faria deploy **por cima da produção do DPRIME**. O `.github/workflows/deploy.yml` também faz deploy automático na Vercel (no push para `main`) via secrets `VERCEL_*`.

### 3.4 🔴 Evolution API / WhatsApp no domínio DPRIME
`.env` / `.env.local`:
```
EVOLUTION_API_URL=https://evolution.dprimerepresentacao.com.br
NEXT_PUBLIC_APP_URL=https://crm.dprimerepresentacao.com.br
```
WhatsApp do STIN PHARMA estaria enviando/recebendo pela instância Evolution do DPRIME.

### 3.5 🟡 Nomes e branding "DPRIME" / "Boot" espalhados
| Arquivo | Ocorrência |
|---------|-----------|
| `package.json:2` | `"name": "boot-crm"` |
| `supabase/config.toml:5` | `project_id = "BOOT-CRM"` |
| `docker-compose.yml` | cabeçalho `BOOT-CRM` |
| `components/layout/sidebar.tsx:73` | `DPRIME Premium CRM` (texto na UI) |
| `components/orcamentos/orcamento-pdf-generator.ts:170,912` | fallback `'DPRIME'` + disclaimer "DPRIME - Representacao Farmaceutica." |
| `components/orcamentos/orcamento-pdf-template.tsx:218-220` | fallback `'DPRIME'` no cabeçalho do PDF |
| `components/whatsapp/modal-exportar-conversa.tsx:51,157` | título `BOOT-CRM — Exportação de Conversa` |
| `components/usuarios/modal-novo-usuario.tsx:60` | placeholder `joao@bootdigital.com` |
| `supabase/migrations/001_schema_completo.sql:23` | `insert into organizations ... values ('Boot Digital','boot-digital')` |
| `supabase/migrations/045_*.sql:2` | comentário "Central de Atendimento WhatsApp - DPRIME" |

> Observação: nos PDFs o nome real vem de `org?.nome_fantasia`/`org?.nome` (vindo do banco). O `'DPRIME'` é só fallback quando o banco não tem nome. Mesmo assim deve ser trocado.

### 3.6 🟡 Scripts com domínio/secret/keys DPRIME hardcoded
| Arquivo | Conteúdo |
|---------|----------|
| `scripts/setup-env.sh:17-19,36-38` | `EVOLUTION_API_URL`, `EVOLUTION_API_KEY=DprimeEvo2024BootKey`, `EVOLUTION_WEBHOOK_SECRET=webhook-secret-dprime-2024` |
| `scripts/setup-webhook.sh:10,11,38,44,61` | `PROJECT_URL=https://crm.dprimerepresentacao.com.br`, secret, key, `INSTANCE_ID=boot-crm-...` |
| `scripts/test-whatsapp-improvements.sh:14` | `SECRET="webhook-secret-dprime-2024"` |
| `scripts/verify-deploy.sh:10` | `PROJECT_URL=https://crm.dprimerepresentacao.com.br` |
| `test-config.sh:70` | URL `crm.dprimerepresentacao.com.br/configuracoes-whatsapp` |
| `deploy-whatsapp.sh:70,73` | imagem docker `boot-crm-whatsapp` |

> ⚠️ **`scripts/setup-env.sh` contém o que parecem ser as chaves reais da Evolution do DPRIME** (`DprimeEvo2024BootKey`, `webhook-secret-dprime-2024`). Mesmo que o repo não vaze o `.env`, **esses segredos estão versionados dentro de um `.sh`**. Devem ser removidos/rotacionados.

### 3.7 🟡 Migrations de "fix" atreladas a dados do projeto antigo
Algumas migrations não são schema, são correções pontuais de dados de produção do DPRIME e **não fazem sentido num banco novo/vazio** (podem até falhar):
- `028_reimportar_medsate.sql` — `RAISE EXCEPTION 'Fornecedor Medsate não encontrado'`
- `032_fix_juliane_foreze.sql` — corrige registros "Juliane Foreze"
- `046_backfill_nome_contato.sql`, `040_conversations_nome_contato.sql`, `041_normalizar_telefones.sql` — backfills sobre dados existentes
- `001_schema_completo.sql:23` — seed da org "Boot Digital"

### 3.8 🟡 Arquivos de configuração duplicados / legados
- `next.config.cjs` (standalone) **e** `next.config.ts` coexistem → ambiguidade. O `.ts` é o atual e correto.
- `vercel.json` **e** `vercel 2.json`; `package-lock.json` **e** `package-lock 2.json` → arquivos duplicados de cópia.
- 19 arquivos `sql-*.sql` soltos na raiz + vários `RELATORIO_*.md` / `AUDITORIA_*.md` → debug/documentação do projeto antigo (não bloqueiam, mas poluem).

---

## 4. Riscos críticos (ordenados por gravidade)

| # | Risco | Impacto | Probabilidade hoje |
|---|-------|---------|--------------------|
| R1 | App grava no **banco de produção do DPRIME** (Supabase compartilhado) | Corrupção/mistura de dados reais do cliente antigo | **Alta — acontece a cada uso** |
| R2 | `git push` envia para repo `boot-crm` do DPRIME | Polui/sobrescreve repo antigo | Alta ao primeiro push |
| R3 | `vercel deploy` / GitHub Action sobe **por cima da produção DPRIME** | Derruba/substitui o CRM em produção | Alta ao primeiro deploy |
| R4 | WhatsApp usa Evolution do DPRIME | Mensagens cruzadas entre empresas; LGPD | Alta ao conectar |
| R5 | Segredos Evolution versionados em `scripts/setup-env.sh` | Vazamento de credenciais | Já presente |
| R6 | Migrations de "fix" rodando em banco novo | Erro/`RAISE EXCEPTION` no `db push` | Média |
| R7 | Auth/usuários compartilhados (mesma instância) | Login do DPRIME acessa STIN e vice-versa | Alta |

---

## 5. Ordem segura de execução (plano sugerido — NÃO executado)

> Princípio: **primeiro isolar a infraestrutura (parar de tocar no ambiente antigo), depois renomear/rebrandar, por último limpar.** Nada deve ser feito antes de criar os ambientes novos.

**Fase 0 — Preparar ambientes novos (fora do código)**
1. Criar **novo projeto Supabase** (STIN PHARMA) → obter URL, anon key, service role key.
2. Criar **novo repositório GitHub** (ex.: `stin-pharma`).
3. Criar **novo projeto Vercel** vinculado ao novo repo.
4. Provisionar/decidir **nova instância Evolution API** (ou novo domínio) + novas keys/secret.

**Fase 1 — Desacoplar Git (sem perder histórico)**
5. Trocar o `origin` para o novo repo (`git remote set-url origin <novo>`); opcionalmente `git remote rename origin old-dprime` antes, como salvaguarda.
6. **Não** fazer push até confirmar o destino.

**Fase 2 — Desacoplar deploy**
7. Apagar/regerar `.vercel/` (rodar `vercel link` apontando para o novo projeto) — `.vercel` é gitignored, então é local.
8. Ajustar/recriar `.github/workflows/deploy.yml` com os novos secrets (`VERCEL_*`) no novo repo.
9. Resolver duplicatas: remover `vercel 2.json`, `package-lock 2.json`, e o `next.config.cjs` legado.

**Fase 3 — Desacoplar banco/storage**
10. Aplicar as migrations de **schema** no novo Supabase (`supabase db push`), **excluindo/adaptando** as migrations de dados (028, 032, 046, 041, 040) e o seed da org em `001`.
11. Recriar buckets (`whatsapp-media`, `public-assets`) no novo projeto (migrations 024 e 055 já cuidam disso).
12. Ajustar `supabase/config.toml`: `project_id`, `auth.site_url`, `additional_redirect_urls` para os domínios novos.
13. Criar seed novo da organização STIN PHARMA (substituir "Boot Digital").

**Fase 4 — Variáveis de ambiente**
14. Reescrever `.env` / `.env.local` com as credenciais novas (Supabase, Evolution, `NEXT_PUBLIC_APP_URL`).
15. Configurar as mesmas env vars no Vercel (produção) e no EasyPanel/Docker (se usado).
16. **Rotacionar** as chaves Evolution antigas que estavam em `setup-env.sh`.

**Fase 5 — Rebranding (código)**
17. `package.json` `name` → `stin-pharma`; `docker-compose.yml`, `config.toml` `project_id`.
18. Branding na UI: `sidebar.tsx`, PDFs (`orcamento-pdf-generator.ts`, `orcamento-pdf-template.tsx`), `modal-exportar-conversa.tsx`, placeholder em `modal-novo-usuario.tsx`.
19. Atualizar scripts `.sh` (domínios/keys) ou removê-los se não forem mais usados.

**Fase 6 — Limpeza e verificação**
20. Remover lixo de debug do projeto antigo (`sql-*.sql` da raiz, `RELATORIO_*`/`AUDITORIA_*` legados, `dev.log`).
21. `npm run build` + `npm run lint` para garantir que nada quebrou.
22. `graphify update .` para atualizar o grafo.
23. Teste ponta-a-ponta: login, criar orçamento/PDF, enviar WhatsApp — confirmando que **nada toca a infra antiga**.

---

## 6. Comandos recomendados (referência — executar só após aprovação)

```bash
# Fase 1 — Git
git remote rename origin old-dprime          # salvaguarda
git remote add origin git@github.com:<org>/stin-pharma.git
git remote -v                                 # conferir

# Fase 2 — Vercel
rm -rf .vercel
vercel link                                   # escolher/ criar projeto stin-pharma

# Fase 3 — Supabase (novo projeto)
supabase link --project-ref <novo_ref>
supabase db push                              # após revisar migrations de dados

# Fase 6 — Verificação
npm run build && npm run lint
graphify update .
```

> Não rodar `git push`, `vercel deploy` nem `supabase db push` antes de confirmar que todos os destinos são os NOVOS.

---

## 7. Arquivos que precisarão de alteração (checklist)

**Configuração / infra**
- [ ] `.env` — todas as URLs/keys (Supabase, Evolution, APP_URL)
- [ ] `.env.local` — idem
- [ ] `.env.example` — cabeçalho "BOOT-CRM" → STIN PHARMA
- [ ] `.vercel/project.json` — regenerar via `vercel link`
- [ ] `.github/workflows/deploy.yml` — secrets/projeto novo
- [ ] `supabase/config.toml` — `project_id`, `auth.site_url`, `additional_redirect_urls`
- [ ] Git remote `origin`

**Nome / branding**
- [ ] `package.json` (`name`)
- [ ] `docker-compose.yml` (cabeçalho/labels)
- [ ] `components/layout/sidebar.tsx:73`
- [ ] `components/orcamentos/orcamento-pdf-generator.ts:170,912`
- [ ] `components/orcamentos/orcamento-pdf-template.tsx:218-220`
- [ ] `components/whatsapp/modal-exportar-conversa.tsx:51,157`
- [ ] `components/usuarios/modal-novo-usuario.tsx:60`

**Scripts (domínio/keys/secret antigos)**
- [ ] `scripts/setup-env.sh` (⚠️ contém keys reais — rotacionar)
- [ ] `scripts/setup-webhook.sh`
- [ ] `scripts/verify-deploy.sh`
- [ ] `scripts/test-whatsapp-improvements.sh`
- [ ] `test-config.sh`
- [ ] `deploy-whatsapp.sh`

**Banco**
- [ ] `supabase/migrations/001_schema_completo.sql` (seed org "Boot Digital")
- [ ] Revisar/excluir migrations de dados: `028`, `032`, `040`, `041`, `046`
- [ ] Comentário em `045_whatsapp_central_atendimento.sql`

**Limpeza (opcional, recomendado)**
- [ ] `vercel 2.json`, `package-lock 2.json`, `next.config.cjs` (duplicados/legados)
- [ ] 19× `sql-*.sql` na raiz; `dev.log`
- [ ] Relatórios antigos `RELATORIO_*.md` / `AUDITORIA_*.md` do DPRIME

---

## 8. Recomendação final

O acoplamento está **quase todo em configuração/infraestrutura**, não em lógica — o que é uma boa notícia: a separação é viável sem refatoração pesada. **Mas, até a Fase 0–4 estarem concluídas, o projeto está efetivamente operando dentro do ambiente de produção do DPRIME (banco, WhatsApp, deploy).** Recomendo **não rodar/buildar apontando para o `.env` atual** e tratar R1–R4 como bloqueantes antes de qualquer uso.

Aguardo aprovação para iniciar a execução (sugiro começar pela Fase 0–2, que eliminam os riscos de push/deploy/escrita no banco antigo).
