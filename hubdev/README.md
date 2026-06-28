# HUB DEV — Ambiente de Desenvolvimento

> ⚠️ **Artefato temporário de compatibilidade.** Esta pasta **NÃO** é a Baseline 001,
> **NÃO** é migration oficial e **NÃO** deve ser usada para criar produção.
> Existe apenas para rodar o app durante a estratégia **Expand → Migrate → Contract**.

> 🎯 **Ambiente oficial único de desenvolvimento:** HUB DEV / Homologação — Project Ref **`pnkgwfgjhijksfmofiot`** (`https://pnkgwfgjhijksfmofiot.supabase.co`). Toda operação de banco é direcionada **exclusivamente** a este projeto; o legado e qualquer outro são proibidos.
>
> ✅ **Sprint Expand E1: CONCLUÍDA 100%** — ver seção ao final deste documento.

## O que é
`bootstrap/schema_compat.sql` reproduz o **schema mínimo derivado do código atual**
(apenas as estruturas que a aplicação realmente usa). Estruturas legadas que o código
ainda consome (ex.: `supplier_categories`, `health_hubs`, `products.category_id`,
`suppliers.hub_id`, `leads`, `deals.lead_id`) permanecem **temporariamente** e só serão
removidas na fase **Contract**. Estruturas sem uso prático **não** foram incluídas
(ex.: `system_config`, RPC `conversas_sem_resposta`, função `normalizar_telefone`,
índice bugado `idx_orders_ganho`, bucket `catalogo-materiais`).

## Estrutura
```
hubdev/
├── README.md
├── .env.hubdev.example          # modelo de variáveis p/ apontar o app ao HUB DEV
└── bootstrap/
    ├── schema_compat.sql         # schema de compatibilidade (compat-v0)
    ├── expand_e1.sql             # Sprint Expand E1 — Hub + Carteiras (aditivo) [CONCLUÍDA]
    ├── expand_e1_rollback.sql    # rollback da Sprint Expand E1
    └── seeds/
        └── dev_fixtures.sql      # seeds mínimos
```

## Como apontar o app para o HUB DEV (local)

1. Subir o Supabase local (na raiz do projeto):
   ```bash
   supabase start
   ```
   Anote os valores impressos: `API URL` e as chaves `anon` / `service_role`.

2. Aplicar o schema de compatibilidade e os seeds (NÃO usa o mecanismo de migrations):
   ```bash
   supabase db execute --file hubdev/bootstrap/schema_compat.sql
   supabase db execute --file hubdev/bootstrap/seeds/dev_fixtures.sql
   ```
   > Alternativa: `psql "$DATABASE_URL" -f hubdev/bootstrap/schema_compat.sql`

3. Apontar o app para o HUB DEV **sem sobrescrever o `.env.local` atual**:
   - copie `hubdev/.env.hubdev.example` para `.env.local.hubdev` (gitignored) e
     preencha com os valores do passo 1; **OU**
   - exporte as variáveis no shell antes de `npm run dev`.
   - **NÃO** edite o `.env.local` versionado sem aprovação específica.

## Importante
- As 55 migrations em `supabase/migrations/` são **legado/referência** e **não** são
  aplicadas aqui.
- O banco legado (DPRIME) **não** é conectado neste fluxo.
- A Baseline 001 definitiva será gerada **apenas ao fim do Contract** (squash do estado final).

## Modelo de variáveis (canônico)
```
# Supabase LOCAL (valores vêm de `supabase start`)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key local>
SUPABASE_SERVICE_ROLE_KEY=<service_role key local>

# Evolution (opcional em dev; pode ficar vazio)
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_WEBHOOK_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_TELEMETRY_DISABLED=1
```

## Sprint Expand E1 — CONCLUÍDA (100%)

Primeira fase **Expand** (Expand → Migrate → Contract), **aditiva pura**, aplicada e validada no HUB DEV (`pnkgwfgjhijksfmofiot`) em 2026-06-26.

**Estruturas criadas** (`bootstrap/expand_e1.sql`; rollback: `bootstrap/expand_e1_rollback.sql`):
- tabela **`hubs`** — `id, organization_id, nome, codigo, descricao, cnpj, email, telefone, logo_url, ativo, criado_em, atualizado_em`
- tabela **`carteiras`** — `id, organization_id, hub_id → hubs (nullable), nome, descricao, ordem (int default 0), observacoes, ativo, criado_em, atualizado_em`
- coluna **`contacts.carteira_id`** (uuid, nullable, FK → carteiras) — única alteração em tabela existente
- índices: `idx_hubs_org`, `idx_carteiras_hub`, `idx_carteiras_org`, `idx_contacts_carteira`

**Critérios de aceite — TODOS ATENDIDOS:** AC1–AC3, AC5, AC7, AC9 e ausência de migração verificados via REST/OpenAPI + git; AC8 (smoke: login → /painel → dashboard → seed) passou; **AC4 (índices) e AC6 (RLS) confirmados no SQL Editor do HUB DEV**.

**Garantias mantidas:** nada removido; `leads`/`deals`/`companies`/`quotes`/`orders`/`tasks` intocadas; sem migração de dados; sem alteração de código ou de RLS existente. `leads` segue como compatibilidade temporária — **Lead será substituído por "Solicitação de Novo Cliente"**; remoção definitiva apenas na fase **Contract**.

**Pendências técnicas remanescentes:** nenhuma.
