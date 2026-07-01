# CHANGELOG — Hub Plataforma

> Registro cronológico **exclusivamente de implementações efetivamente realizadas** (código, infraestrutura, banco). Datas efetivas (DEC-004).
> **Não constam aqui:** decisões arquiteturais (ver [`DECISIONS.md`](DECISIONS.md)) nem Sprints de documentação/governança (ver [`SPRINTS.md`](SPRINTS.md)).
> Formato por entrada: data · objetivo · alterações · estruturas criadas · estruturas preservadas · observações.

---

## 2026-07-01 — DEV: exclusão definitiva de usuário (limpeza de ambiente)

- **Objetivo:** ação administrativa para excluir usuários em DEV/organização inicial. **Exceção** — em produção o padrão é **Desativar** (mantido).
- **Banco (SQL Editor, HUB DEV):** RPC `SECURITY DEFINER` `contar_vinculos_usuario` (só admin) — varre **dinamicamente todos os FKs que referenciam `profiles(id)`** (leads, clientes, orçamentos, pedidos, conversas/mensagens, carteiras e quaisquer outros; exclui `audit_logs`) e sinaliza se é Proprietário de Hub. `hubdev/bootstrap/dev_excluir_usuario.sql`.
- **Aplicação Web:** action `excluirUsuarioDefinitivo` (só admin; confirmação forte **"EXCLUIR USUÁRIO"**; sem auto-exclusão; bloqueia se houver vínculo ou for Proprietário de Hub; remove do Auth com cascade do profile; registra `audit_logs`). Seção **"Zona de perigo"** no drawer de Usuários. Desativar/Reativar mantido.
- **Observações:** smoke **8/8** no HUB DEV (usuário limpo total 0; flag de Proprietário; negação a não-admin; deleção com cascade do profile e remoção do Auth), dado `zz_smoke_del` removido. Commit `9d85827`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-07-01 — RBAC Contract (parte segura): criação de usuário só com perfis oficiais (DEC-015)

- **Objetivo:** impedir a criação de novos usuários com perfis legados, sem o risco de reescrever a lógica de negócio legada.
- **Aplicação Web:** `modal-novo-usuario` oferece apenas **Administrador da Indústria / Gestor da Indústria / Assistente** (Proprietário é criado pelo fluxo de Hub); `criarUsuario` valida o cargo por whitelist. Sem novo SQL.
- **Adiado (Contract completo — risco alto):** remoção física dos valores do enum `user_role` (`vendedor/atendimento/financeiro/suporte`) exige recriar o tipo + reescrever `profiles.cargo`; e há ~40 pontos de código com lógica de negócio ramificando nesses perfis (leads/pipeline/orçamentos/tarefas/whatsapp/relatórios). Como há **0 usuários** legados, são ramos/valores mortos e inofensivos; a remoção fica para um esforço dedicado e testado.
- **Observações:** com isso, nenhum novo usuário legado é criado. Commit `81eb211`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-06-30 — RBAC Migrate-B (resto): guard de rota (middleware) + flip vendedor→assistente (DEC-015)

- **Objetivo:** aplicar permissões também nas rotas (middleware) e concluir a migração de perfis legados operacionais.
- **Aplicação Web:** `middleware.ts` ganha guard por permissão **só para Assistente** — rotas mapeadas (`/assistente/clientes|orcamentos|prepedidos`, `/hub/produtos`) exigem `visualizar` no módulo da Função; sem permissão → redireciona a `/assistente`. Fail-open (erro/sem dado não bloqueia); rotas não mapeadas e demais perfis passam.
- **Banco (dados):** `vendedor → assistente` (1 usuário, `mo@pharma1.com.br`); distribuição final `admin 1 / proprietario_hub 3 / assistente 5`; 0 vendedores. O usuário migrado está sem Hub/Função (admin deve atribuir na tela de Usuários para operar).
- **Estruturas preservadas:** enum `user_role` ainda contém os legados (removidos só no Contract); RLS por Perfil+Hub inalterada.
- **Observações:** com isso o RBAC (DEC-015) está aplicado em **menu + middleware + (server actions via RLS/gates existentes)**. Falta o Contract (limpeza do enum). Commit `ca2b07d`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-06-30 — Remoção da UI do Hub legado (Hubs de Saúde / health_hubs)

- **Objetivo:** remover o "hub legado" (Hubs de Saúde) da plataforma — telas, menu (card) e código.
- **Aplicação Web:** removidos o card em `configuracoes/page.tsx`, a rota `app/(dashboard)/configuracoes/hubs-de-saude/**` e os componentes `components/hubs-de-saude/**`. Confirmado: nada externo importava esses componentes/actions.
- **Preservado (Contract):** a tabela `health_hubs` **não** foi removida — é referenciada por `suppliers.hub_id` e Fornecedor ainda tem o bloqueador do Orçamento (DEC-014). Remoção física da tabela fica para o Contract, após o desacoplamento de Fornecedor.
- **Observações:** o Hub oficial é `hubs` (`/configuracoes/hubs`), intocado. Commit `b66113f`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-06-30 — RBAC Migrate-C: Hub sempre com Proprietário (invariante DEC-015)

- **Objetivo:** garantir que um Hub nunca fique sem Proprietário. Criação já exigia/criava o Proprietário (`criarHub`); faltava fechar a brecha de **remoção**.
- **Aplicação Web:** `definirProprietarioHub` passa a **rejeitar remoção** (`proprietarioId` vazio) — só permite **substituir**; `components/hubs/tabela-hubs.tsx` remove a opção "— Nenhum —" (placeholder desabilitado "Selecionar proprietário…"). Sem novo SQL.
- **Observações:** criação de Hub já cobre "Proprietário obrigatório"; a troca cobre "selecionar Proprietário existente". Commit `64d6ec8`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-06-30 — RBAC Migrate-C: tela de Usuários (drawer + atribuição de Função) — DEC-015

- **Objetivo:** refatorar `/configuracoes/usuarios` para o modelo DEC-015 — drawer com Dados/Perfil/Permissões/Status e atribuição de **Função** ao Assistente.
- **Aplicação Web:** tabela com colunas Nome/E-mail/Telefone/Perfil/Hub/Status/Último acesso/Criado em/Ações; linha abre **drawer** (Esc/click-fora). Assistente → seletor de **Função** (do próprio Hub); Admin/Proprietário/Gestor sem edição (nota de acesso). `page.tsx` enriquece com Hub (join), Função e último acesso (`auth.admin.listUsers` via admin client). Action `atribuirFuncao` (admin; valida org + Hub da Função). `badge-perfil` relabelado (DEC-015; `assistente` = "Assistente"). Sem novo SQL.
- **Estruturas preservadas:** criação de usuário/senha/status inalteradas; perfis legados ainda exibidos (Contract remove).
- **Observações:** build OK. Validação visual (clicar/atribuir) pelo admin. Commit `642b5db`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-06-30 — RBAC Migrate-C: tela de Funções (Proprietário) — DEC-015

- **Objetivo:** dar ao Proprietário do Hub a UI para criar/editar Funções e marcar permissões por módulo/ação.
- **Banco (SQL Editor, HUB DEV):** RPCs `SECURITY DEFINER` `funcoes_listar` / `funcao_salvar` (upsert + substitui permissões, atômico) / `funcao_excluir` (bloqueia se houver usuários). Só `proprietario_hub`, escopo do próprio Hub. `hubdev/bootstrap/migrate_rbac_funcoes_crud.sql`.
- **Aplicação Web:** rota `/hub/funcoes` (gate Proprietário) + item de menu **Funções**; `components/hub/funcoes-gerenciar.tsx` (lista + editor com **matriz módulos × ações** Ver/Criar/Editar/Excluir); actions `listarFuncoes`/`salvarFuncao`/`excluirFuncao`.
- **Observações:** smoke **12/12** no HUB DEV (criar/listar/editar/excluir, bloqueio de exclusão com usuários, negação a não-Proprietário), dados `ZZ_SMOKE_E9_*` limpos. Commit `3d2021e`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-06-30 — RBAC Migrate (parcial): Função padrão + menu por permissões (DEC-015)

- **Objetivo:** iniciar a aplicação do RBAC (DEC-015) sem quebrar nada — migração de dados e primeira aplicação (menu), confinada ao Assistente.
- **Banco (SQL Editor, HUB DEV — Migrate-A):** Função padrão **"Comercial"** por Hub + baseline de permissões (dashboard/leads/clientes/produtos/pedidos/orçamentos/whatsapp/agenda) + atribuição aos assistentes existentes. `hubdev/bootstrap/migrate_rbac_funcao_padrao.sql`. Verificado: 2 funções, 2/3 assistentes com função (o 3º sem Hub fica sem função), acesso preservado.
- **Aplicação Web (Migrate-B — menu):** `lib/rbac.ts` (`resolverPermissoes`/`podeVer`/`podeAcao` via `minhas_permissoes()`); `lib/navegacao.ts` ganha `modulo` por item e filtra o menu do **Assistente** pelas permissões da Função (fail-open; demais perfis inalterados); layout/sidebar/sidebar-mobile/header passam as permissões resolvidas.
- **Estruturas preservadas:** admin/gestor/proprietário com menu idêntico; RLS por Perfil+Hub inalterada; enum intocado.
- **Observações:** primeira aplicação do RBAC no menu. Próximas fatias: middleware/rotas + server actions (guard por permissão) + flip `vendedor→assistente`; telas Usuários (drawer)/Funções; Criar Hub com Proprietário. Commit `12369d2`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-06-30 — RBAC: fundação de Funções e Permissões (Sprint Expand E8, DEC-015)

- **Objetivo:** iniciar o novo RBAC (DEC-015) — separar Perfil de Permissões via camada de Função (Role), de forma aditiva, sem quebrar auth/permissões atuais.
- **Banco (SQL Editor, HUB DEV):** tabelas `funcoes` (escopo Hub) e `funcao_permissoes` (módulo×ação, `chk_acao`); coluna `profiles.funcao_id`; índices; RLS habilitada sem policies (acesso via RPC). RPC `SECURITY DEFINER` `minhas_permissoes()` (admin/proprietário=total; gestor=fixo; assistente=Função). Artefatos `hubdev/bootstrap/expand_rbac_funcoes.sql` (+ rollback).
- **Aplicação Web:** nenhuma mudança de comportamento nesta fatia (fundação). Wiring de menu/middleware/server-actions e telas ficam para o Migrate.
- **Estruturas preservadas:** enum `user_role`, RLS existente e dados intocados; perfis atuais preservados.
- **Observações:** smoke funcional **9/9** no HUB DEV (resolvedor por perfil/Função, constraint de ação, teardown com restauração do usuário de teste). Sem deploy (app inalterado nesta fatia). Commit `5276589`.

## 2026-06-30 — Página HUB "Produtos" (consulta operacional — Sprint Expand E7, DEC-013/014)

- **Objetivo:** tela `/hub/produtos` para Proprietário e Assistentes consultarem os produtos autorizados pelos Portfólios liberados. Sem CRUD; o Hub apenas consome.
- **Banco (SQL Editor, HUB DEV):** colunas `products.metadata` e `product_portfolios.metadata` (jsonb, flexível por Portfólio); RPCs `SECURITY DEFINER` `hub_produtos_listar` (busca/filtros/ordenação/paginação server-side), `hub_produto_detalhe`, `hub_produtos_filtros` + helper `_hub_ctx`. Autorização por Hub via `hub_portfolios` ativos (Indústria vê tudo da org). Artefatos `hubdev/bootstrap/expand_hub_produtos.sql` (+ rollback).
- **Aplicação Web:** rota `app/(dashboard)/hub/produtos` (gate proprietario_hub/assistente; admin/gestor/financeiro pré-visualizam) + `components/hub/produtos-consulta.tsx` (DataTable ordenável, paginação, contagem, busca instantânea, filtros Categoria/Portfólio/Status, drawer 500px dinâmico com Esc/click-fora, responsivo → lista no mobile); item de menu "Produtos" para Hub/Assistente. Sem imagens/cards; drawer exibe só campos preenchidos + `metadata`.
- **Estruturas preservadas:** Fornecedor intocado (DEC-014); sem CRUD de produtos no Hub.
- **Observações:** smoke funcional **16/16** no HUB DEV (listar/filtros/paginação/ordenação/detalhe+metadata/filtros), dados `ZZ_SMOKE_E7_*` com teardown e ambiente limpo. Orçamento/pré-pedido fora desta etapa. Commit `d24c485`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-06-30 — Fix: coluna/filtro de Portfólio na lista de Produtos lê o vínculo N:N (DEC-013/014)

- **Objetivo:** a lista de Produtos mostrava "—" no Portfólio (e filtrava errado) porque lia `products.portfolio_id` (legado, não mais preenchido).
- **Aplicação Web:** `configuracoes/produtos/page.tsx` lê `product_portfolios` (join `portfolios`) via **admin client** com escopo na organização (RLS sem policies p/ app) e monta `vinculosPorProduto`; `tabela-produtos.tsx` passa a exibir e filtrar pelos Portfólios do vínculo N:N (um produto pode aparecer em vários). Sem novo SQL.
- **Observações:** corrige o sintoma reportado; alinhado à DEC-014 (não usar `products.portfolio_id`). Commit `8d46862`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-06-30 — Vínculo em massa Produto↔Portfólio (Sprint Expand E6 — DEC-013/DEC-014)

- **Objetivo:** vincular **produtos já existentes** a um Portfólio **em massa** (sem ser um a um), além da importação por planilha.
- **Banco (SQL Editor, HUB DEV):** RPC `vincular_produtos_portfolio(portfolio, product_ids[], categoria?, subcategoria?)` (`security definer`, atômica, **idempotente** — `on conflict do nothing`, preço **herdado** do produto) + helper `produtos_vinculados_portfolio(portfolio) → uuid[]`. Artefatos `hubdev/bootstrap/expand_rpc_vincular_produtos_portfolio.sql` (+ rollback). Sem novas policies.
- **Aplicação Web:** seção "Produtos do portfólio" na página do Portfólio com **modal de multi-seleção** (busca, classificação opcional, lista de já vinculados) — `components/portfolios/vincular-produtos.tsx`; ação em lote **"Vincular ao portfólio"** na lista de Produtos (`components/produtos/tabela-produtos.tsx`); action `vincularProdutosAoPortfolio`.
- **Estruturas preservadas:** Fornecedor intocado (DEC-014); `products.portfolio_id` não utilizado.
- **Regras:** preço do vínculo herda do produto; classificação opcional aplicada ao lote; idempotente (já vinculado é ignorado).
- **Observações:** smoke funcional **13/13** no HUB DEV (vínculo em massa, idempotência, N:N, classificação, atomicidade do erro), dados `ZZ_SMOKE_E6_*` com teardown e ambiente limpo. Commit `350c0f7`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-06-30 — Importação para Portfólio (Sprint Expand E5 — DEC-013/DEC-014)

- **Objetivo:** importar Produtos por planilha (XLSX/CSV) **para um Portfólio**, materializando o vínculo N:N `product_portfolios` (preço/classificação por Portfólio).
- **Banco (SQL Editor, HUB DEV):** RPC `importar_produtos_portfolio` (`security definer`, **atômica** — 100% ou 0%, valida autorização internamente) + índice `idx_products_org_nome_norm` (apoio ao dedup por nome). Artefatos `hubdev/bootstrap/expand_rpc_importar_produtos_portfolio.sql` (+ rollback). Sem novas policies (acesso ao vínculo só via RPC nesta fase).
- **Aplicação Web:** rota `configuracoes/portfolios/[id]/importar`; `components/portfolios/form-importacao-portfolio.tsx` (upload, detecção/normalização de colunas, preview classificado, **painel de pendências** de Categoria/Subcategoria, "Baixar modelo"); server actions `previewImportacaoPortfolio`/`importarProdutosParaPortfolio`; botão "Importar produtos" na página do Portfólio. Build `build:hubdev` OK.
- **Estruturas preservadas:** Fornecedor intocado (DEC-014); `products.portfolio_id` **não** utilizado (vínculo só em `product_portfolios`).
- **Regras:** atômica (sem importação parcial); Produtos criados por **dedup de nome normalizado** (nome repetido na planilha = erro); **Categorias/Subcategorias não são criadas automaticamente** (citação inexistente vira pendência que bloqueia); **preço obrigatório** (lar do preço é o vínculo).
- **Observações:** smoke funcional **44/44** (30 RPC autenticada end-to-end no HUB DEV + 14 modelo/parser); dados `ZZ_SMOKE_*` com teardown e ambiente limpo. Commit `0170912`; deploy de produção alinhado em `https://hub-plataforma-dev.vercel.app`.

## 2026-06-30 — RLS de products + remoção do legado no cadastro (DEC-012, Frente 4 final)

- **Objetivo:** isolar produtos por Portfólio autorizado (Hub) e remover a "origem legada" (Fornecedor) da tela de Produtos.
- **Banco (SQL Editor, HUB DEV):** substituída a policy `p_products` (FOR ALL por organização) por `products_sel/ins/upd/del`. Hub (`proprietario_hub`/`assistente`) só lê produtos de Portfólios autorizados (via `get_hub_id()`); Indústria e papéis legados leem/escrevem tudo; Hub não escreve. Artefatos `hubdev/bootstrap/rls_products.sql` (+ rollback que recria `p_products`).
- **Aplicação Web:** modal de Produto sem a seção "Origem (legado)" (Fornecedor/Categoria de fornecedor); selects de Catálogo (Portfólio→Categoria→Subcategoria) empilhados e encadeados; Preço/Unidade/MG/ML em 2×2. Listagem com filtro e coluna por Portfólio (substitui filtros legados). Commit `cbf4c05`, deploy em `hub-plataforma-dev.vercel.app`.
- **Observações:** estratégia por `get_user_role()` (não `hub_id is null`), pois há 1 `assistente` sem hub — que corretamente não vê produtos. Validado em produção.

## 2026-06-30 — RLS do Catálogo (correção do 500 ao criar Portfólio — DEC-012)

- **Objetivo:** corrigir falha em produção ("An error occurred in the Server Components render") ao criar Portfólio e antecipar a RLS por Hub do catálogo.
- **Causa raiz (diagnóstico):** tabela `portfolios` (e `categorias`/`subcategorias`/`hub_portfolios`) estava com **RLS habilitado e 0 policies** → `new row violates row-level security policy for table "portfolios"` no `insert` da Server Action `criarPortfolio`. SELECT retornava vazio; INSERT era negado.
- **Alterações:** aplicadas via SQL Editor no HUB DEV (`pnkgwfgjhijksfmofiot`).
- **Estruturas criadas:**
  - função `get_hub_id()` (`security definer`, padrão das helpers de RLS)
  - 4 policies por tabela (select/insert/update/delete) em `portfolios`, `categorias`, `subcategorias`, `hub_portfolios`
  - artefatos `hubdev/bootstrap/rls_catalogo.sql` (+ rollback)
- **Regra aplicada:** Indústria (admin/gestor/financeiro) vê tudo; admin/gestor escrevem; Hub/Assistente leem apenas Portfólios autorizados (`hub_portfolios.status='ativo'` via `get_hub_id()`).
- **Observações:** `products` (legado) não alterado. RLS por Hub do catálogo (era Frente 4 do Migrate) antecipada para as 4 tabelas novas. Validado: criação de Portfólio OK em produção.

## 2026-06-29 — Catálogo / Portfólio na Aplicação Web (Sprint Expand E4-app — DEC-012)

- **Objetivo:** materializar o catálogo da DEC-012 na Aplicação Web (telas restritas à Indústria), em 3 fatias aditivas.
- **Alterações:** código Next.js; build via `build:hubdev`; deploy de produção no Vercel.
- **Estruturas criadas:**
  - tipos `Portfolio`, `Categoria`, `Subcategoria`, `HubPortfolio` (`types/database.ts`)
  - rota `configuracoes/portfolios` (lista/CRUD) + `components/portfolios/{tabela,modal}-…`
  - rota `configuracoes/portfolios/[id]` (Categoria/Subcategoria + Hubs autorizados) + `gerenciar-categorias`, `autorizacao-portfolios`
  - rota `configuracoes/hubs/[id]` (Portfólios autorizados do Hub)
  - server actions de Portfólio, Categoria, Subcategoria e Autorização Hub↔Portfólio
  - item de menu e card em Configurações
- **Estruturas preservadas:** fluxo legado de produtos/fornecedores intocado.
- **Observações:** gating admin/gestor; sem RLS por Hub (Migrate). Commits `9efefc5`/`7cbd9ea`/`203d991`. Deploy alinhado ao local em `https://hub-plataforma-dev.vercel.app`.

## 2026-06-29 — Sprint Expand E4 (Catálogo / Portfólio — DEC-012)

- **Objetivo:** materializar, de forma aditiva, o catálogo oficial da DEC-012 (Portfólio → Categoria → Subcategoria → Produto) e a autorização operacional Hub↔Portfólio no HUB DEV (`pnkgwfgjhijksfmofiot`).
- **Alterações:** DDL aditivo aplicado via SQL Editor do HUB DEV.
- **Estruturas criadas:**
  - tabela `portfolios` (`id, organization_id, nome, descricao, ativo, criado_em, atualizado_em`; unique `organization_id+nome`)
  - tabela `categorias` (`id, organization_id, portfolio_id→portfolios, nome, ativo, criado_em`)
  - tabela `subcategorias` (`id, organization_id, categoria_id→categorias, nome, ativo, criado_em`)
  - tabela `hub_portfolios` (`id, organization_id, hub_id→hubs, portfolio_id→portfolios, status, criado_em, atualizado_em`; unique `hub_id+portfolio_id`)
  - colunas `products.portfolio_id`, `products.categoria_id`, `products.subcategoria_id` (uuid, nullable)
  - índices `idx_portfolios_org`, `idx_categorias_portfolio`, `idx_subcategorias_categ`, `idx_hubport_hub`, `idx_hubport_portfolio`, `idx_products_portfolio/categoria/subcategoria`
  - artefatos `hubdev/bootstrap/expand_catalogo.sql`, `hubdev/bootstrap/expand_catalogo_rollback.sql`
- **Estruturas preservadas:** `suppliers`, `supplier_categories`, `supplier_freight`, `freight_carriers`, `health_hubs` e demais — intocadas (legado/compat até Contract).
- **Observações:** aditivo puro; sem migração de dados; sem alteração de código/RLS. `hub_portfolios` referencia a tabela oficial `hubs` (nunca `health_hubs`). RLS por Hub e backfill ficam para Migrate.

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
