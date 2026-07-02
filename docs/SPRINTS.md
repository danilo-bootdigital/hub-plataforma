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
- **Resultado:** ✔ Concluída — implementada e validada por smoke (44/44) no HUB DEV; RPC aplicada via SQL Editor; commit `0170912`; deploy em `https://hub-plataforma-dev.vercel.app`.
- **Checkpoint Relacionado:** Checkpoint 012.
- **Changelog Relacionado:** 2026-06-30 — Importação para Portfólio (Expand E5).

## Sprint Expand E6 — Vínculo em massa Produto↔Portfólio

- **Identificador:** Expand E6 (FASE 1 — Expand)
- **Objetivo:** vincular **produtos existentes** a um Portfólio **em massa** (sem ser um a um), materializando `product_portfolios` (DEC-013), sem Fornecedor (DEC-014).
- **Escopo:**
  - **Banco (Expand):** RPC `vincular_produtos_portfolio(portfolio, product_ids[], categoria?, subcategoria?)` (`SECURITY DEFINER`, atômica, idempotente — `on conflict do nothing`, preço herdado do produto) + helper `produtos_vinculados_portfolio(portfolio) → uuid[]`. Arquivos `hubdev/bootstrap/expand_rpc_vincular_produtos_portfolio.sql` (+ rollback). Sem policies novas.
  - **Backend:** action `vincularProdutosAoPortfolio` em `portfolios/actions.ts`.
  - **Frontend (2 pontos de entrada):** (a) seção "Produtos do portfólio" na página do Portfólio com modal multi-seleção (busca, classificação opcional, lista de já vinculados) — `components/portfolios/vincular-produtos.tsx`; (b) ação em lote "Vincular ao portfólio" na lista de Produtos (`tabela-produtos.tsx`).
- **Regras:** preço do vínculo herda do produto; classificação opcional aplicada ao lote; idempotente (já vinculado ignorado); `products.portfolio_id` não usado.
- **Dependências:** Expand E5 (importação/vínculo); DEC-013; DEC-014.
- **Critérios de Aceite:** AC1 SQL aplicado no HUB DEV (2 funções) · AC2 build OK · AC3 gating admin/gestor · AC4 vínculo em massa cria N vínculos · AC5 idempotência (rerodar ignora) · AC6 N:N (mesmo produto em ≥2 portfólios) · AC7 classificação opcional aplicada · AC8 sem `products.portfolio_id`; sem Fornecedor.
- **Resultado:** ✔ Concluída — smoke 13/13 no HUB DEV; RPC aplicada via SQL Editor; build OK.
- **Checkpoint Relacionado:** Checkpoint 013.
- **Changelog Relacionado:** 2026-06-30 — Vínculo em massa Produto↔Portfólio (Expand E6).

## Sprint Expand E7 — Página HUB "Produtos" (consulta operacional)

- **Identificador:** Expand E7 (FASE 1 — Expand)
- **Objetivo:** tela `/hub/produtos` para **Proprietário e Assistentes** consultarem os produtos autorizados pelos Portfólios liberados (DEC-013/014). **Sem CRUD** — o Hub não cadastra produtos, apenas consome.
- **Escopo:**
  - **Banco (Expand):** colunas `products.metadata` e `product_portfolios.metadata` (jsonb, flexível p/ campos específicos de Portfólio); RPCs `SECURITY DEFINER` `hub_produtos_listar` (busca/filtros/ordenação/paginação server-side), `hub_produto_detalhe`, `hub_produtos_filtros` + helper `_hub_ctx`. Arquivos `hubdev/bootstrap/expand_hub_produtos.sql` (+ rollback). Autorização por Hub via `hub_portfolios` ativos; Indústria vê tudo da org.
  - **Backend:** actions em `app/(dashboard)/hub/produtos/actions.ts`.
  - **Frontend:** `hub/produtos/page.tsx` (gate + carga inicial server-side) + `components/hub/produtos-consulta.tsx` (DataTable ordenável, paginação, contagem, drawer 500px dinâmico com Esc/click-fora, responsivo → lista no mobile); item de menu para `proprietario_hub`/`assistente`.
  - **Tela dinâmica:** colunas operacionais fixas; drawer exibe só campos preenchidos, agrupados; campos extras de importação vivem em `metadata` e aparecem em "Informações técnicas / Outros dados". Sem imagens, sem cards, sem "—" em excesso.
- **Fora de escopo:** Orçamento e pré-pedido (etapa posterior).
- **Dependências:** Expand E4/E5/E6; DEC-013; DEC-014.
- **Critérios de Aceite:** AC1 SQL aplicado no HUB DEV (3 RPCs + metadata) · AC2 build OK · AC3 gate proprietario_hub/assistente (admin/gestor preview) · AC4 busca/filtros/ordenação/paginação server-side · AC5 autorização por Hub (só Portfólios autorizados) · AC6 drawer dinâmico só com campos preenchidos + metadata · AC7 sem CRUD; sem imagens; sem Fornecedor.
- **Resultado:** ✔ Concluída — smoke 16/16 no HUB DEV; RPCs + metadata aplicados via SQL Editor; build OK.
- **Checkpoint Relacionado:** Checkpoint 014.
- **Changelog Relacionado:** 2026-06-30 — Página HUB Produtos (Expand E7).

## Sprint Expand E8 — RBAC: Perfis × Funções × Permissões (DEC-015)

- **Identificador:** Expand E8 (FASE 1 — Expand)
- **Objetivo:** fundação do novo RBAC (DEC-015): separar Perfil de Permissões via camada de **Função (Role)**, sem quebrar auth/permissões atuais.
- **Escopo (Expand — aditivo puro):** tabelas `funcoes` (escopo Hub) e `funcao_permissoes` (módulo×ação); coluna `profiles.funcao_id`; RPC resolvedora `minhas_permissoes()` (admin/proprietário=total; gestor=fixo; assistente=Função). RLS habilitada sem policies (acesso via RPC). Arquivos `hubdev/bootstrap/expand_rbac_funcoes.sql` (+ rollback). **Nada removido**, enum/RLS existente intocados.
- **Fatias seguintes (não nesta Sprint):**
  - **Migrate:** `vendedor→assistente` + Função padrão por Hub (preserva acesso); RPCs CRUD de Função; ligar **menu + middleware + server actions** à resolução de permissões; refatorar tela **Usuários** (drawer: dados/perfil/permissões/status) + nova tela **Funções**; fluxo **Criar Hub com Proprietário obrigatório**.
  - **Contract:** remover perfis legados do enum/código (`vendedor`, `atendimento`, `suporte`, `financeiro` como perfil).
- **Aplicação das permissões (DEC-015):** menu + middleware/rotas + server actions. RLS permanece por **Perfil + Hub**; granular por módulo/ação só em fase futura.
- **Dependências:** DEC-015 (emenda DEC-011); `hubs` (DEC-008).
- **Critérios de Aceite:** AC1 tabelas + coluna criadas · AC2 `minhas_permissoes()` resolve corretamente por perfil/Função · AC3 RLS existente e enum intocados · AC4 comportamento atual preservado (nada quebrado) · AC5 smoke (Função + permissões + atribuição a assistente).
- **Resultado:** ✔ Expand concluído — SQL aplicado no HUB DEV; smoke 9/9 (`minhas_permissoes` admin=total, assistente herda Função; constraint de ação; teardown com restauração). Migrate/Contract nas próximas fatias.
- **Checkpoint Relacionado:** Checkpoint 015.
- **Changelog Relacionado:** 2026-06-30 — RBAC Expand (Funções/Permissões).

---

## Convenção de identificadores

- **E#** — fundação/infraestrutura.
- **Expand E# / M# / C#** — fases Expand / Migrate / Contract.
- **G#** — governança (transversais; não constam no Changelog).

---

## Plano de Implementação — DEC-019 (Conferência Operacional de Receita)

> Fonte: **DEC-019** (estende DEC-018). Fase de arquitetura **encerrada**. Sprints pequenos, independentes e testáveis, na ordem obrigatória **S1 → S8**. Mapeamento no fluxo oficial: **S1 = Expand**; **S2–S8 = Migrate**; **sem Contract** (nada é removido). Nenhuma Sprint inicia sem autorização explícita.

### Princípios de Implementação (OBRIGATÓRIOS durante toda a Sprint)

1. **Nunca** implementar uma Sprint antes de a anterior estar **aprovada**.
2. Cada Sprint deve **terminar com testes e validação** antes de iniciar a próxima.
3. **Nenhuma regra de negócio dentro da IA.** A IA **apenas extrai** informações e **explica** inconsistências.
4. O **motor de regras** é o responsável por calcular **score, alertas e pendências**.
5. Toda decisão operacional deve ser **rastreável, auditável e reproduzível**.
6. O sistema deve permanecer **desacoplado do provedor de IA**.
7. Nenhuma Sprint poderá **quebrar compatibilidade** com as **DEC-018** e **DEC-019**.
8. Toda implementação mantém o princípio: **Receita → Extração → Motor de Regras → Score → Revisão Humana → Aprovação Operacional**.

### SPRINT 1 — Infraestrutura (Expand)
- **Objetivo:** criar toda a estrutura persistente do módulo, sem qualquer IA.
- **Escopo:** tabelas, relacionamentos, índices, constraints, RLS, gancho de auditoria, reuso do Storage (DEC-018), versionamento append-only.
- **Arquivos criados:** `supabase/migrations/057_receita_conferencia.sql`; `hubdev/bootstrap/expand_receita_conferencia.sql` (+ rollback); adições em `types/database.ts`.
- **Arquivos alterados:** `types/database.ts` (estender `QuoteReceita`/`ReceitaStatusFluxo`); `docs/CHANGELOG.md`, `docs/CHECKPOINTS.md`.
- **Banco:** enums (`receita_status_analise`, `receita_motivo`, `receita_provedor_ocr`, `receita_provedor_ia`, `checklist_escopo`, `checklist_item_tipo_regra`, `item_severidade`); tabelas `receita_checklists`, `receita_checklist_itens`, `receita_modelos`, `receita_conferencias` (append-only), `receita_conferencia_pendencias`; `ALTER quote_receitas` (`checklist_id`, `status_analise_ia`, `score_ultima_conferencia`, novos valores em `status_fluxo`); índices (DEC-019 §3); RLS `get_organization_id()`; **constraint** `status_fluxo='aprovada_operacionalmente' ⇒ validada_por NOT NULL`; append-only (revoke UPDATE/DELETE em `receita_conferencias`).
- **Componentes React:** nenhum.
- **Server Actions:** nenhuma.
- **RBAC:** reservar o **módulo `receita`** (sem gates funcionais ainda).
- **Testes:** smoke SQL no HUB DEV (insert/select por org; RLS nega cross-org; constraint bloqueia aprovada sem `validada_por`; append-only impede UPDATE); `build:hubdev` OK.
- **Critérios de aceite:** migration idempotente aplicada; smoke X/X; **zero** mudança de comportamento na app.
- **Riscos:** schema drift (aplicar via SQL Editor); constraint/trigger de aprovação; enum vs CHECK.
- **Dependências:** DEC-018 (`quote_receitas`, bucket privado).
- **Complexidade:** Média · **Risco:** Médio · **Duração:** 2–3 dias · **Ordem obrigatória:** 1ª.
- **Resultado:** ✔ **Concluída (2026-07-02).** Migration `057` aplicada no HUB DEV via SQL Editor; smoke verde (catálogo/RLS/constraints/trigger/append-only/CHECKs). Commit `8fb0c2c`; Checkpoint 017.

### SPRINT 2 — Motor de Regras (determinístico, sem IA, sem UI)
- **Objetivo:** lógica de conferência 100% determinística e testável.
- **Escopo:** resolução hierárquica (Produto > Portfólio > Indústria); regras (`presenca`/`formato`/`comparacao_orcamento`/`valor_esperado`); **score 0–100**; pendências com **motivo normalizado**; mapeamento score/severidade → `status_analise`. Entrada: `extracao_json` (fixtures) + orçamento + checklist.
- **Arquivos criados:** `lib/conferencia/tipos.ts`, `lib/conferencia/resolver-checklist.ts`, `lib/conferencia/motor-regras.ts` (função pura), `lib/conferencia/__tests__/motor-regras.test.ts`.
- **Arquivos alterados:** `package.json` (test runner — ver riscos).
- **Banco:** nenhuma alteração (fixtures em memória; lê estruturas do S1).
- **Componentes React:** nenhum.
- **Server Actions:** nenhuma.
- **RBAC:** n/a.
- **Testes:** **unit tests** da função pura (sem pendências; CRM ausente; produto/concentração divergente; quantidade fora da tolerância; receita vencida; baixa confiança → `precisa_de_revisao_humana`).
- **Critérios de aceite:** score e pendências corretos e determinísticos; cobertura de todos os `motivo`; build OK.
- **Riscos:** calibração das faixas score→status; **projeto sem test runner** (decidir `vitest`/script node).
- **Dependências:** S1 (tipos/enums); DEC-019 §9.
- **Complexidade:** Alta · **Risco:** Médio · **Duração:** 3–4 dias · **Ordem obrigatória:** 2ª (pode paralelizar com S1 após os tipos).
- **Resultado:** ✔ **Concluída (2026-07-02).** `lib/conferencia/` (tipos + resolver + motor); testes `node:test` 11/11 (fixtures Tirzepatida); runner sem dependência nova (`npm run test:conferencia`). Commit `6f59f52`; Checkpoint 018. Decisão do test runner: **Node nativo `node --test` + `tsc`** (sem vitest/jest).

### SPRINT 3 — Interface Administrativa (CRUD de checklists)
- **Objetivo:** cadastrar/gerir checklists, regras, obrigatoriedades, pesos e associação de motivos.
- **Escopo:** CRUD de `receita_checklists` + itens; escopo (Indústria/Portfólio/Produto); ativar/desativar; **versionar**; cadastro de `receita_modelos`.
- **Arquivos criados:** `app/(dashboard)/configuracoes/checklists-receita/page.tsx`, `.../actions.ts`, `components/conferencia/checklist-editor.tsx`, `checklist-lista.tsx`, `receita-modelos-editor.tsx`.
- **Arquivos alterados:** `lib/navegacao.ts`, `middleware.ts`, `lib/rbac.ts`.
- **Banco:** leitura/escrita nas tabelas do S1; nenhuma nova.
- **Componentes React:** lista + editor (matriz item × obrigatório/severidade/peso/tipo_regra/config + motivo), seletor de escopo, versões, upload de receita-modelo.
- **Server Actions:** `listarChecklists`, `salvarChecklist` (upsert + itens, versiona), `desativarChecklist`, `salvarReceitaModelo`, `resolverChecklistPreview`.
- **RBAC:** **`receita:configurar_checklist`** (Indústria: Ind/Portfólio; Proprietário: Produto — DEC-016/017). Gate na rota + actions.
- **Testes:** smoke CRUD no HUB DEV; RLS/escopo; validação de `config_json`; negação a não-autorizado; build.
- **Critérios de aceite:** criar/editar/versionar checklist e receita-modelo; preview mostra qual regra vence; negação a perfil sem permissão.
- **Riscos:** complexidade da UI de matriz; governança de edição por escopo.
- **Dependências:** S1 (tabelas); S2 (preview — opcional).
- **Complexidade:** Média-Alta · **Risco:** Médio · **Duração:** 3–4 dias · **Ordem obrigatória:** 3ª (paralelizável após S1).

### SPRINT 4 — Upload da Receita (histórico/versões/timeline, sem IA)
- **Objetivo:** evoluir o upload da DEC-018 para histórico versionado, visualização e timeline.
- **Escopo:** múltiplos anexos versionados; timeline (transições de `status_fluxo`); visualização inline (PDF/imagem via signed URL); download.
- **Arquivos criados:** `components/conferencia/receita-timeline.tsx`, `receita-visualizador.tsx`, `receita-versoes-lista.tsx`.
- **Arquivos alterados:** `components/orcamentos/receita-tab.tsx`, `app/(dashboard)/orcamentos/actions-receita.ts`.
- **Banco:** usa `quote_receitas` (DEC-018) + auditoria; timeline **derivada** (sem tabela nova obrigatória).
- **Componentes React:** timeline, visualizador inline, lista de versões.
- **Server Actions:** `getReceitasVersionadas`, `getSignedUrl` (reuso), anexar (reuso DEC-018).
- **RBAC:** `receita:conferir`/visualizar conforme Função.
- **Testes:** upload múltiplo; signed URL abre/expira; download; timeline correta; validação tipo/tamanho.
- **Critérios de aceite:** ver histórico/versões/timeline; visualizar inline; baixar; **sem IA**.
- **Riscos:** viewer de PDF; exposição de dado sensível.
- **Dependências:** DEC-018, S1.
- **Complexidade:** Média · **Risco:** Baixo-Médio · **Duração:** 2–3 dias · **Ordem obrigatória:** 4ª (independe de S2/S3; paralelizável após S1).

### SPRINT 5 — Camada de IA (`ExtratorReceita`, provider-agnostic)
- **Objetivo:** extração desacoplada do provedor; IA **apenas** extrai/organiza/explica — **jamais decide**.
- **Escopo:** interfaces `LeitorDocumento` (OCR) + `ExtratorReceita` (IA); **factory de provedor** (`claude`/`openai`/`gemini`/`azure`/`local`); implementação inicial **Claude** (`claude-opus-4-8`, multimodal, structured output `json_schema strict`); retorno = `extracao_json` + `explicacao` + `confianca`.
- **Arquivos criados:** `lib/ia/leitor-documento.ts`, `lib/ia/extrator-receita.ts`, `lib/ia/schema-extracao.ts`, `lib/ia/provedores/index.ts` (factory), `lib/ia/provedores/claude.ts`, `lib/ia/__tests__/extrator.test.ts`.
- **Arquivos alterados:** env (`.env.local.hubdev`, Vercel).
- **Banco:** define campos que o S6 persiste (`provedor_ocr`/`provedor_ia`/`modelo_ia`/`prompt_versao`/`extracao_json`); persistência real no S6.
- **Componentes React:** nenhum.
- **Server Actions:** nenhuma pública (orquestração no S6).
- **RBAC:** n/a (não exposto).
- **Testes:** interface com **mock provider**; teste real Claude opcional (fixture PDF, schema válido); troca de provedor via env sem alterar o chamador; **schema sem campo de decisão/aprovação**.
- **Critérios de aceite:** extração retorna JSON válido + explicação + confiança; provedor trocável; IA nunca retorna decisão.
- **Riscos:** custo/latência; chave de API; qualidade de extração; **privacidade** (dado de saúde ao provedor — decisão pendente).
- **Dependências:** S1 (schema); DEC-019 §8.
- **Complexidade:** Alta · **Risco:** Alto · **Duração:** 3–5 dias · **Ordem obrigatória:** 5ª.

### SPRINT 6 — Integração (pipeline Receita→Motor→Orçamento→Pedido)
- **Objetivo:** orquestrar o pipeline completo e o bloqueio de pedido.
- **Escopo:** `rodarPreAnalise` (arquivo → OCR/IA extrai → **motor** calcula → persiste `receita_conferencias` + pendências → atualiza `quote_receitas`); decisões humanas com gate + constraint; **bloqueio de `transformarEmPedido`** quando `products.exige_receita`.
- **Arquivos criados:** `app/(dashboard)/orcamentos/actions-conferencia.ts`.
- **Arquivos alterados:** `app/(dashboard)/orcamentos/actions.ts` (gate em `transformarEmPedido`), `actions-hub.ts` (se aplicável), `types/database.ts`.
- **Banco:** escreve `receita_conferencias`/`pendencias`; usa constraint de aprovação; **IA/OCR via service role só leem o arquivo; decisão via client do usuário**.
- **Componentes React:** botão "Rodar pré-análise" mínimo (UI plena no S7).
- **Server Actions:** `rodarPreAnalise` (`receita:conferir`), `aprovarReceitaOperacionalmente`/`rejeitar`/`marcarRevisao` (`receita:aprovar`), `getConferencias`.
- **RBAC:** **`receita:conferir`** e **`receita:aprovar`** — gate de código **+** constraint no banco.
- **Testes:** smoke fim-a-fim com **IA mockada** (recebida→pré-análise→`em_conferencia`→aprovar→`aprovada_operacionalmente`); **IA não consegue aprovar** (sem `user_id`); `transformarEmPedido` bloqueado sem receita aprovada quando `exige_receita`; auditoria gravada.
- **Critérios de aceite:** pipeline completo (IA mock); bloqueio funciona e é **configurável**; append-only preservado; auditoria.
- **Riscos:** acoplamento com `transformarEmPedido` (fluxo crítico) → regressão; consistência transacional upload+persist.
- **Dependências:** S1, S2, S5 (e S4 para o arquivo).
- **Complexidade:** Alta · **Risco:** Alto · **Duração:** 3–5 dias · **Ordem obrigatória:** 6ª.

### SPRINT 7 — UX (dashboard de conferência)
- **Objetivo:** interface completa na aba Receita.
- **Escopo:** dashboard com **score**, **alertas**, **checklist aplicado**, **extração × orçamento** lado a lado, **histórico/timeline**, **explicabilidade** (explicação da IA + `motivo` do motor), botões de decisão.
- **Arquivos criados:** `components/conferencia/painel-conferencia.tsx`, `score-badge.tsx`, `alertas-lista.tsx`, `extracao-vs-orcamento.tsx`, `decisao-humana.tsx`.
- **Arquivos alterados:** `components/orcamentos/receita-tab.tsx`, `orcamento-tabs.tsx` (se necessário).
- **Banco:** somente leitura (reuso S6).
- **Componentes React:** dashboard e subcomponentes acima.
- **Server Actions:** leitura (reuso S6).
- **RBAC:** botões condicionais por **`receita:aprovar`**.
- **Testes:** visual/manual logado; render lazy (carga sob demanda DEC-018); acessibilidade básica; build.
- **Critérios de aceite:** operador vê score/alertas/comparação/histórico/explicação e decide; **terminologia correta** ("pré-análise concluída", "sem pendências aparentes", "pendências encontradas", "aprovada operacionalmente por usuário"); **nunca** "validada pela IA".
- **Riscos:** UI passar impressão de "aprovação automática"; performance de render.
- **Dependências:** S6 (dados), S1–S5.
- **Complexidade:** Média-Alta · **Risco:** Médio · **Duração:** 3–4 dias · **Ordem obrigatória:** 7ª.

### SPRINT 8 — Hardening
- **Objetivo:** robustez, compliance e operação.
- **Escopo:** auditoria completa; logs estruturados; performance/índices; permissões (inclusive negativas); observabilidade de IA (tokens/custo/latência por provedor); **retenção/expurgo** do `extracao_json` e arquivos; suíte de testes consolidada.
- **Arquivos criados:** runbook em `docs/`; script/job de retenção; testes adicionais.
- **Arquivos alterados:** actions (logs), revisões de RLS; migration `058_retencao_conferencia.sql` se necessário.
- **Banco:** job de expurgo; índices adicionais conforme medição.
- **Componentes React:** ajustes menores.
- **Server Actions:** revisão de gates; rate-limiting da IA.
- **RBAC:** matriz de permissões auditada (casos negativos).
- **Testes:** carga; RLS negativa; auditoria 100%; retenção.
- **Critérios de aceite:** auditoria cobre todos os eventos; sem PII além do necessário; performance aceitável; permissões negativas OK.
- **Riscos:** **compliance** de dado de saúde (retenção); custo/latência da IA em escala.
- **Dependências:** todos os anteriores.
- **Complexidade:** Média · **Risco:** Médio-Alto · **Duração:** 3–5 dias · **Ordem obrigatória:** 8ª (final).

### Matriz de implementação (funcionalidade → Sprint)

| # | Funcionalidade | Sprint | Fase |
|---|---|---|---|
| 1 | Tabelas, enums, relacionamentos, índices | S1 | Expand |
| 2 | RLS, constraint de aprovação, append-only | S1 | Expand |
| 3 | Reuso do Storage privado + versionamento (base) | S1 | Expand |
| 4 | Extensão de `quote_receitas` (status_fluxo, score, checklist_id) | S1 | Expand |
| 5 | Resolução hierárquica de checklist (Ind→Port→Prod) | S2 | Migrate |
| 6 | Cálculo de score 0–100 | S2 | Migrate |
| 7 | Geração de pendências + motivos normalizados | S2 | Migrate |
| 8 | Mapeamento score/severidade → `status_analise` | S2 | Migrate |
| 9 | CRUD checklists/itens/obrigatoriedade/pesos | S3 | Migrate |
| 10 | Associação item → motivo/severidade | S3 | Migrate |
| 11 | Cadastro de receitas-modelo (`receita_modelos`) | S3 | Migrate |
| 12 | Upload multi-versão + timeline + visualização + download | S4 | Migrate |
| 13 | Interface `LeitorDocumento` (OCR) | S5 | Migrate |
| 14 | `ExtratorReceita` + factory (Claude/OpenAI/Gemini/Azure/Local) | S5 | Migrate |
| 15 | Extração JSON + explicação + confiança | S5 | Migrate |
| 16 | Orquestração `rodarPreAnalise` + persistência da conferência | S6 | Migrate |
| 17 | Decisão humana (aprovar/reprovar) + gate + constraint | S6 | Migrate |
| 18 | Bloqueio de `transformarEmPedido` quando `exige_receita` | S6 | Migrate |
| 19 | RBAC `receita:configurar_checklist` | S3 | Migrate |
| 20 | RBAC `receita:conferir` / `receita:aprovar` | S6 | Migrate |
| 21 | Dashboard: score/alertas/checklist/extração×orçamento/timeline/explicabilidade | S7 | Migrate |
| 22 | Auditoria completa, logs, observabilidade de IA | S8 | Migrate |
| 23 | Retenção/expurgo de documentos e JSON | S8 | Migrate |
| 24 | Performance, permissões negativas, testes finais | S8 | Migrate |

**Caminho crítico (ordem obrigatória):** S1 → S2 → S5 → S6 → S7 → S8. **Paralelizáveis após S1:** S3 (apoiado por S2) e S4. S6 é o gargalo de integração (depende de S1+S2+S5, e de S4 para o arquivo).

> **Status da fase de arquitetura:** encerrada. A implementação (Sprint 1) só inicia mediante **autorização explícita**.

### Realinhamento MVP-first — DEC-019 (2026-07-02)

> **Aprovado.** Foco no **MVP**: "o cliente envia uma receita e o sistema informa se ela está **apta para conferência humana** ou **quais pendências corrigir**". **Central de Conferência, filas, SLA, múltiplos operadores, prioridade, produtividade e dashboards → fase pós-MVP** (nada removido; Sprints 1 e 2 permanecem válidas). O resultado apresentado ao assistente passa a se chamar **"Diagnóstico da Receita"**.
>
> **Fluxo do MVP:** Upload → Extração → **Motor de Regras** → **Diagnóstico da Receita** → **Conferência humana** (obrigatória). O motor é o **coração**; nenhuma regra de negócio fora dele; a IA apenas **alimenta** o motor.

**Ordem de execução do MVP** (substitui a ordem S3–S8 acima enquanto o MVP não estiver concluído):

- ✅ **S1 — Infraestrutura** (concluída) · ✅ **S2 — Motor de Regras** (concluída)
- **MVP-3 — Regras & Diagnóstico (SEM IA):** checklist **padrão** + checklist **Tirzepatida** (como dados), **regras**, **orientação operacional** e **Diagnóstico da Receita**, tudo funcionando com **JSON de entrada simulado** (fixtures) — **sem depender da IA**. Entrega a "camada 3" (orientação) e o objeto de resultado (**Diagnóstico da Receita**) sobre o motor da S2. Função pura + testes `node --test`. Sem persistência/UI/RBAC.
- **MVP-4 — Camada de IA:** `ExtratorReceita` + **Provider Claude** + **JSON estruturado** (validado). A IA **apenas alimenta** o motor com a extração; **não altera nenhuma regra de negócio**. OCR como interface opcional (multimodal). + `ANTHROPIC_API_KEY` nas envs.
- **MVP-5 — Integração/pipeline + decisão humana + RBAC:** `rodarPreAnalise` (extração → motor → grava conferência) + decisão humana (**aprovar operacionalmente / necessita correção / rejeitar**); estende `funcao_permissoes.chk_acao` para `receita:conferir`/`receita:aprovar`.
- **MVP-6 — UI mínima na aba Receita:** botão "Rodar pré-análise" + **Diagnóstico da Receita** (status + pendências + orientação) + decisão humana. **MVP utilizável aqui.**
- **MVP-7 — Fecho:** validação end-to-end no HUB DEV + auditoria/observabilidade mínimas.

**Caminho crítico:** MVP-3 → MVP-5 → MVP-6 → MVP-7 (MVP-4 entra entre MVP-3 e MVP-5; a IA passa a alimentar o motor sem mudar regras).

**Adiado (pós-MVP):** Central de Conferência; filas/SLA/atribuição/prioridade/dashboards; CRUD administrativo de checklists (MVP usa **seed**); histórico/timeline ricos; `receita_modelos`; OCR externo dedicado; bloqueio de `transformarEmPedido`; hardening completo.

**Termos oficiais no resultado (Diagnóstico da Receita):** `sem pendências aparentes` · `pendências encontradas` · `apta para conferência humana` · `necessita correção`. **Nunca** "validada" nem linguagem jurídica.
