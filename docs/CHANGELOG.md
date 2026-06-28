# CHANGELOG — Hub Plataforma

> Registro cronológico **exclusivamente de implementações efetivamente realizadas** (código, infraestrutura, banco). Datas efetivas (DEC-004).
> **Não constam aqui:** decisões arquiteturais (ver [`DECISIONS.md`](DECISIONS.md)) nem Sprints de documentação/governança (ver [`SPRINTS.md`](SPRINTS.md)).
> Formato por entrada: data · objetivo · alterações · estruturas criadas · estruturas preservadas · observações.

---

## 2026-06-26 — Sprint Expand E1 (núcleo Hub + Carteiras)

- **Objetivo:** introduzir, de forma aditiva, o núcleo de domínio Hub + Carteira no HUB DEV (`pnkgwfgjhijksfmofiot`).
- **Alterações:** DDL aditivo aplicado via SQL Editor do HUB DEV.
- **Estruturas criadas:**
  - tabela `hubs` (`id, organization_id, nome, codigo, descricao, cnpj, email, telefone, logo_url, ativo, criado_em, atualizado_em`)
  - tabela `carteiras` (`id, organization_id, hub_id→hubs, nome, descricao, ordem, observacoes, ativo, criado_em, atualizado_em`)
  - coluna `contacts.carteira_id` (uuid, nullable, FK→`carteiras`)
  - índices `idx_hubs_org`, `idx_carteiras_hub`, `idx_carteiras_org`, `idx_contacts_carteira`
  - artefatos `hubdev/bootstrap/expand_e1.sql`, `hubdev/bootstrap/expand_e1_rollback.sql`
- **Estruturas preservadas:** `leads`, `deals`, `companies`, `quotes`, `orders`, `tasks` e demais — intocadas.
- **Observações:** aditivo puro; sem migração de dados; sem alteração de código/RLS.

## 2026-06-26 — Sprint E1 (conexão Aplicação Web ↔ HUB DEV)

- **Objetivo:** conectar a Aplicação Web ao HUB DEV e validar login, dashboard e seed.
- **Alterações:** `dotenv-cli`; scripts `dev:hubdev`/`build:hubdev`; chaves do HUB DEV em `.env.local.hubdev` (gitignored).
- **Estruturas criadas:** schema de compatibilidade (`hubdev/bootstrap/schema_compat.sql`) e seeds (`dev_fixtures.sql`) no HUB DEV; usuário de teste `dev@bootdigital.com.br` (org "Indústria DEV").
- **Estruturas preservadas:** todas.
- **Observações:** validado build + start (nunca `next dev`); login → `/painel` → dashboard → seed OK.

## 2026-06-25 — Fundação / Identidade

- **Objetivo:** bootstrap inicial e padronização de identidade para "Hub Plataforma".
- **Alterações:** commit inicial (`cb5ad3d`); refactor de identidade Fase 4 (`0d29c2b`) e Fase 5 (`01dba06`).
- **Estruturas criadas:** repositório, estrutura base da Aplicação Web, migrations legadas (referência).
- **Estruturas preservadas:** —
- **Observações:** as 55 migrations em `supabase/migrations/` são legado/referência e **não** são aplicadas no HUB DEV.
