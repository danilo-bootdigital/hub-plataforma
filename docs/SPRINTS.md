# SPRINTS — Hub Plataforma

> Registro único de todas as Sprints do projeto. Sem duplicação.
> Cada Sprint segue **exatamente** esta estrutura:
> Identificador · Objetivo · Escopo · Dependências · Critérios de Aceite · Resultado · Checkpoint Relacionado · Changelog Relacionado.

---

## Sprint E1

- **Identificador:** E1 (FASE 0 — Fundação)
- **Objetivo:** conectar a Aplicação Web ao HUB DEV / Homologação e validar login, dashboard e dados de seed.
- **Escopo:** `dotenv-cli`; scripts `dev:hubdev`/`build:hubdev`; chaves do HUB DEV em `.env.local.hubdev`; schema de compatibilidade + seeds mínimos no HUB DEV; execução via build + start.
- **Dependências:** Fundação (Bootstrap, HUB DEV, Supabase).
- **Critérios de Aceite:** schema de compatibilidade aplicado; seeds presentes; login funcional; `/painel` carregando; dashboard exibindo seed; sem `next dev`.
- **Resultado:** ✔ Concluída/aprovada — login (`dev@bootdigital.com.br`) → `/painel` → dashboard → seed (7 etapas).
- **Checkpoint Relacionado:** Checkpoint 002.
- **Changelog Relacionado:** 2026-06-26 — Sprint E1.

## Sprint Expand E1

- **Identificador:** Expand E1 (FASE 1 — Expand)
- **Objetivo:** introduzir, de forma exclusivamente aditiva, o núcleo de domínio Hub + Carteira, com vínculo opcional de Cliente à Carteira.
- **Escopo:** criar `hubs` e `carteiras`; relacionamento `carteiras.hub_id → hubs`; `contacts.carteira_id` (nullable); índices. Sem migração de dados, sem alterar código/RLS, sem tocar em `leads`/`deals`/`companies`/`quotes`/`orders`/`tasks`.
- **Dependências:** Sprint E1; DEC-001 (Lead fora de escopo — `leads` não recebe `carteira_id`).
- **Critérios de Aceite:** AC1 tabelas criadas · AC2 `contacts.carteira_id` nullable · AC3 FKs `uuid`↔`uuid` · AC4 índices (SQL Editor) · AC5 tabelas proibidas intocadas · AC6 RLS inalterado (SQL Editor) · AC7 código inalterado · AC8 smoke test · AC9 verificação objetiva · (extra) sem migração de dados.
- **Resultado:** ✔ Concluída 100% — aplicada via SQL Editor no HUB DEV (`pnkgwfgjhijksfmofiot`); aditivo puro; sem regressão.
- **Checkpoint Relacionado:** Checkpoint 003.
- **Changelog Relacionado:** 2026-06-26 — Sprint Expand E1.

## Sprint G0

- **Identificador:** G0 (Governança — transversal)
- **Objetivo:** consolidar o conhecimento aprovado em documentação oficial versionada (`docs/`).
- **Escopo:** criar os documentos oficiais; registrar DEC-001…DEC-010. Sem alterar código/banco/arquitetura/regra.
- **Dependências:** Sprints E1 e Expand E1; decisões DEC-001…DEC-006.
- **Critérios de Aceite:** documentos oficiais criados; reflexo exato do estado aprovado; nenhuma decisão nova/inventada.
- **Resultado:** ✔ Concluída — documentação oficial criada em `docs/`.
- **Checkpoint Relacionado:** Checkpoint 004.
- **Changelog Relacionado:** — (Sprint de documentação; não consta no Changelog por política).

## Sprint G1

- **Identificador:** G1 (Governança — transversal)
- **Objetivo:** elevar a documentação a um padrão definitivo de governança.
- **Escopo:** Constituição + "Como evoluir" em `ARQUITETURA_OFICIAL.md`; regra de imutabilidade/sequência em `DECISIONS.md`; padronização de `SPRINTS.md` e `CHECKPOINTS.md`; separação Changelog × Decisões; estados no `ROADMAP.md`; criação de `CONTRIBUINDO.md`.
- **Dependências:** Sprint G0.
- **Critérios de Aceite:** ajustes aplicados; `CONTRIBUINDO.md` criado; documentação consistente entre si.
- **Resultado:** ✔ Concluída — padrão de governança estabelecido.
- **Checkpoint Relacionado:** Checkpoint 005.
- **Changelog Relacionado:** — (Sprint de documentação; não consta no Changelog por política).

## Sprint G2

- **Identificador:** G2 (Governança — transversal)
- **Objetivo:** consolidação documental eliminando duplicações e padronizando estrutura de Sprints/Checkpoints/Changelog/Roadmap.
- **Escopo:** reconstrução de `SPRINTS.md`; campos completos em `CHECKPOINTS.md`; `CHANGELOG.md` apenas com implementações; `ROADMAP.md` visual vertical; reescrita de `CONTRIBUINDO.md`. Sem código/banco/arquitetura/regra.
- **Dependências:** Sprints G0 e G1.
- **Critérios de Aceite:** documentos reconstruídos sem duplicação; estrutura padronizada.
- **Resultado:** ✔ Concluída — documentação padronizada.
- **Checkpoint Relacionado:** Checkpoint 006.
- **Changelog Relacionado:** — (Sprint de documentação; não consta no Changelog por política).

## Sprint G3

- **Identificador:** G3 (Governança — transversal)
- **Objetivo:** adotar o padrão de manutenção "reconstrução integral, não patch incremental" e reescrever do zero todos os documentos de `docs/`, com auditoria de duplicações/inconsistências.
- **Escopo:** reconstrução integral dos 8 documentos de `docs/`; auditoria (títulos/seções/campos/Sprints/DEC/Checkpoints duplicados, formatação, referências quebradas); registro do padrão de manutenção em `CONTRIBUINDO.md`. Sem código/banco/arquitetura/regra; sem alterar/criar decisões.
- **Dependências:** Sprints G0, G1 e G2.
- **Critérios de Aceite:** 8 documentos reconstruídos; auditoria executada; nenhuma duplicação estrutural remanescente; referências íntegras.
- **Resultado:** ✔ Concluída — documentação limpa, única e definitiva.
- **Checkpoint Relacionado:** Checkpoint 007.
- **Changelog Relacionado:** — (Sprint de documentação; não consta no Changelog por política).

## Sprint Expand E4

- **Identificador:** Expand E4 (FASE 1 — Expand)
- **Objetivo:** materializar, de forma exclusivamente aditiva, o catálogo oficial da DEC-012 (Indústria → Portfólio → Categoria → Subcategoria → Produto) e a autorização operacional Hub↔Portfólio.
- **Escopo:** criar `portfolios`, `categorias`, `subcategorias` e `hub_portfolios` (autorização N:N referenciando `hubs`); adicionar `products.portfolio_id`/`categoria_id`/`subcategoria_id` (nullable); índices. Sem migração de dados, sem alterar código/RLS, sem tocar nas estruturas legadas (`suppliers*`, `freight_carriers`, `health_hubs`). Arquivos: `hubdev/bootstrap/expand_catalogo.sql` (+ rollback).
- **Dependências:** Sprint Expand E1 (`hubs`); DEC-012; DEC-008. (E3 — Equipes — reservada conforme nota da Expand E2.)
- **Critérios de Aceite:** AC1 tabelas criadas · AC2 colunas em `products` nullable · AC3 `hub_portfolios` referencia `hubs` (nunca `health_hubs`) · AC4 índices · AC5 legado intocado · AC6 RLS inalterado · AC7 código inalterado · AC8 smoke test descartável (Portfólio/Hub fictícios; não tocar "Pharma1") · AC9 verificação objetiva · (extra) sem migração de dados.
- **Resultado:** ✔ Concluída — DDL aplicado via SQL Editor no HUB DEV (`pnkgwfgjhijksfmofiot`); 4 tabelas + 3 colunas em `products` verificadas; aditivo puro, sem regressão. Smoke descartável OK (FKs Portfólio→Categoria→Subcategoria e Hub↔Portfólio validadas).
- **Checkpoint Relacionado:** Checkpoint 008.
- **Changelog Relacionado:** 2026-06-29 — Sprint Expand E4.

## Sprint Expand E4-app

- **Identificador:** Expand E4-app (FASE 1 — Expand · Aplicação Web)
- **Objetivo:** materializar na Aplicação Web o catálogo da DEC-012, em 3 fatias aditivas, restritas à Indústria (admin/gestor).
- **Escopo:**
  - **Fatia A** — CRUD de Portfólio (`configuracoes/portfolios`).
  - **Fatia B** — Categoria/Subcategoria por Portfólio (`configuracoes/portfolios/[id]`).
  - **Fatia C** — Autorização Hub↔Portfólio em duas visões (`portfolios/[id]` → Hubs; `hubs/[id]` → Portfólios), usando `hub_portfolios` (revogar preserva status).
  - Tipos `Portfolio/Categoria/Subcategoria/HubPortfolio`; itens de menu e card em Configurações. Sem RLS por Hub (fica para Migrate); fluxo legado de produtos/fornecedores intocado.
- **Dependências:** Sprint Expand E4 (banco); DEC-012.
- **Critérios de Aceite:** AC1 build OK (build:hubdev) · AC2 rotas geradas · AC3 gating admin/gestor (307 sem sessão) · AC4 CRUD validado no HUB DEV · AC5 aditivo (sem tocar legado) · AC6 deploy Vercel alinhado.
- **Resultado:** ✔ Concluída — Fatias A–C implementadas, build OK, commits `9efefc5`/`7cbd9ea`/`203d991`, deploy em `hub-plataforma-dev.vercel.app`. (Validação visual da Fatia C pelo usuário pendente.)
- **Checkpoint Relacionado:** Checkpoint 009.
- **Changelog Relacionado:** 2026-06-29 — Catálogo/Portfólio (Aplicação Web).

## Sprint Expand E5 — Importação para Portfólio

- **Identificador:** Expand E5 (FASE 1 — Expand)
- **Objetivo:** importar Produtos por planilha (XLSX/CSV) **para um Portfólio**, materializando o vínculo N:N `product_portfolios` (DEC-013) e respeitando a descontinuação de Fornecedor (DEC-014).
- **Escopo:**
  - **Banco (Expand):** RPC `importar_produtos_portfolio` (`SECURITY DEFINER`, validação interna de autorização) + índice de apoio ao dedup. Arquivos: `hubdev/bootstrap/expand_rpc_importar_produtos_portfolio.sql` (+ rollback). Sem novas policies (acesso ao vínculo só via RPC nesta fase); sem alterar tabelas/RLS/Fornecedor.
  - **Backend:** server actions `previewImportacaoPortfolio` e `importarProdutosParaPortfolio` em `portfolios/actions.ts` (chamam a RPC com `createClient()`); reuso de `criarCategoria`/`criarSubcategoria` para resolução manual de pendências.
  - **Frontend:** rota `configuracoes/portfolios/[id]/importar`; componente de upload + mapeamento de colunas + preview classificado (novo/vincular/atualizar/ignorado/erro) + painel de pendências de Categoria/Subcategoria; botão "Importar produtos" na página do Portfólio; "Baixar modelo".
- **Regras de negócio fixadas:**
  - Importação **atômica**: ou importa 100% das linhas, ou 0% (sem escrita parcial).
  - **Produtos** podem ser criados automaticamente (dedup por **nome normalizado** dentro da Indústria); nome repetido na mesma planilha é erro.
  - **Categorias/Subcategorias NÃO** são criadas automaticamente — citação inexistente vira **pendência** que bloqueia a importação (admin resolve: selecionar existente, criar manual ou cancelar).
  - **Preço obrigatório** (preço comercial vive no vínculo); `products.preco_unitario` só como fallback na criação.
  - **`products.portfolio_id` não é usado** (vínculo exclusivamente em `product_portfolios`).
- **Dependências:** Expand E4/E4-app (Portfólio/Categoria/Subcategoria); vínculo `product_portfolios` (Expand DEC-013); DEC-013; DEC-014.
- **Critérios de Aceite:** AC1 SQL aplicado no HUB DEV (função + índice) · AC2 build OK (build:hubdev) · AC3 gating admin/gestor · AC4 preview reporta erros e pendências sem persistir · AC5 importação atômica (smoke: erro/pendência ⇒ 0 gravações) · AC6 dedup N:N (mesmo produto reusado em 2 Portfólios) · AC7 idempotência (reimportar não duplica) · AC8 nenhuma escrita em `products.portfolio_id`; nenhuma criação automática de Categoria/Subcategoria · AC9 Fornecedor intocado (DEC-014).
- **Resultado:** ✔ Implementada e validada por smoke (44/44) no HUB DEV; RPC aplicada via SQL Editor; build OK. **Commit e deploy aguardando aprovação.**
- **Checkpoint Relacionado:** Checkpoint 012.
- **Changelog Relacionado:** 2026-06-30 — Importação para Portfólio (Expand E5).

---

## Convenção de identificadores

- **E#** — fundação/infraestrutura.
- **Expand E# / M# / C#** — fases Expand / Migrate / Contract.
- **G#** — governança (transversais; não constam no Changelog).
