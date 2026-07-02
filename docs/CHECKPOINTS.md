# CHECKPOINTS — Hub Plataforma

> Histórico de checkpoints. Cada checkpoint registra:
> **Data · Git Commit · Git Branch · Project Ref Supabase · Ambiente · Banco · Situação · Observações.**

---

## Checkpoint 001 — Bootstrap

- **Data:** 2026-06-25
- **Git Commit:** `cb5ad3d` (initial) · `0d29c2b` (Fase 4) · `01dba06` (Fase 5)
- **Git Branch:** main
- **Project Ref Supabase:** — (nenhum projeto aplicado; migrations legadas de referência)
- **Ambiente:** repositório local + Aplicação Web base
- **Banco:** migrations legadas (`supabase/migrations/`) — não aplicadas no HUB DEV
- **Situação:** ✔ Concluído
- **Observações:** identidade padronizada para "Hub Plataforma" (Fases 4 e 5).

## Checkpoint 002 — Sprint E1

- **Data:** 2026-06-26
- **Git Commit:** — (não commitado; configuração local + dados aplicados no HUB DEV)
- **Git Branch:** main
- **Project Ref Supabase:** `pnkgwfgjhijksfmofiot` (HUB DEV / Homologação)
- **Ambiente:** HUB DEV / Homologação
- **Banco:** schema de compatibilidade + seeds mínimos; usuário de teste ativo
- **Situação:** ✔ Concluído
- **Observações:** login → `/painel` → dashboard → seed validados via build + start.

## Checkpoint 003 — Sprint Expand E1

- **Data:** 2026-06-26
- **Git Commit:** — (DDL aplicado via SQL Editor; artefatos `hubdev/bootstrap/expand_e1*.sql` não commitados)
- **Git Branch:** main
- **Project Ref Supabase:** `pnkgwfgjhijksfmofiot` (HUB DEV / Homologação)
- **Ambiente:** HUB DEV / Homologação
- **Banco:** criadas `hubs`, `carteiras`, `contacts.carteira_id` + índices (aditivo puro); legado intocado
- **Situação:** ✔ Concluído 100%
- **Observações:** AC1–AC9 atendidos (AC4/AC6 confirmados no SQL Editor); sem regressão; sem pendências.

## Checkpoint 004 — Sprint G0

- **Data:** 2026-06-26
- **Git Commit:** — (documentos em `docs/` não commitados)
- **Git Branch:** main
- **Project Ref Supabase:** — (documentação)
- **Ambiente:** documentação (`docs/`)
- **Banco:** inalterado
- **Situação:** ✔ Concluído
- **Observações:** documentação oficial criada; DEC-001…DEC-010 registradas.

## Checkpoint 005 — Sprint G1

- **Data:** 2026-06-26
- **Git Commit:** — (ajustes em `docs/` não commitados)
- **Git Branch:** main
- **Project Ref Supabase:** — (documentação)
- **Ambiente:** documentação (`docs/`)
- **Banco:** inalterado
- **Situação:** ✔ Concluído
- **Observações:** Constituição, imutabilidade de decisões, padronização e `CONTRIBUINDO.md`.

## Checkpoint 006 — Sprint G2

- **Data:** 2026-06-26
- **Git Commit:** — (ajustes em `docs/` não commitados)
- **Git Branch:** main
- **Project Ref Supabase:** — (documentação)
- **Ambiente:** documentação (`docs/`)
- **Banco:** inalterado
- **Situação:** ✔ Concluído
- **Observações:** consolidação documental; duplicações eliminadas; padrão de Sprints/Checkpoints/Changelog/Roadmap.

## Checkpoint 007 — Sprint G3

- **Data:** 2026-06-26
- **Git Commit:** — (ajustes em `docs/` não commitados)
- **Git Branch:** main
- **Project Ref Supabase:** — (documentação)
- **Ambiente:** documentação (`docs/`)
- **Banco:** inalterado
- **Situação:** ✔ Concluído
- **Observações:** reconstrução integral dos 8 documentos + auditoria; padrão "reconstruir, não patch" adotado em `CONTRIBUINDO.md`; sem duplicações estruturais.

## Checkpoint 008 — Sprint Expand E4 (Catálogo / Portfólio — DEC-012)

- **Data:** 2026-06-29
- **Git Commit:** — (DDL aplicado via SQL Editor; artefatos `hubdev/bootstrap/expand_catalogo*.sql` não commitados)
- **Git Branch:** main
- **Project Ref Supabase:** `pnkgwfgjhijksfmofiot` (HUB DEV / Homologação)
- **Ambiente:** HUB DEV / Homologação
- **Banco:** criadas `portfolios`, `categorias`, `subcategorias`, `hub_portfolios` + colunas `products.portfolio_id/categoria_id/subcategoria_id` + índices (aditivo puro); legado (`suppliers*`, `freight_carriers`, `health_hubs`) intocado
- **Situação:** ✔ Concluído
- **Observações:** aplicado via SQL Editor após barrar uma tentativa em projeto errado (pré-check `tem_hubs=0`); reaplicado no projeto correto (`tem_hubs=1`). Verificação: 4 tabelas + 3 colunas confirmadas. RLS e backfill ficam para Migrate (DEC-012). Smoke descartável OK (cria/limpa `ZZ_SMOKE_*`: Portfólio→Categoria→Subcategoria + autorização Hub↔Portfólio; sem erro de FK).

## Checkpoint 009 — Sprint Expand E4-app (Catálogo/Portfólio na Aplicação Web)

- **Data:** 2026-06-29
- **Git Commit:** `9efefc5` (Fatia A) · `7cbd9ea` (Fatia B) · `203d991` (Fatia C) — pushados em `origin/main`
- **Git Branch:** main
- **Project Ref Supabase:** `pnkgwfgjhijksfmofiot` (HUB DEV / Homologação)
- **Ambiente:** Aplicação Web (local build+start e Vercel `hub-plataforma-dev`)
- **Banco:** inalterado (consome as estruturas da Expand E4)
- **Situação:** ✔ Concluído
- **Observações:** Fatias A–C (CRUD Portfólio, Categoria/Subcategoria, autorização Hub↔Portfólio nas duas visões). Build OK; deploy de produção alinhado ao local em `https://hub-plataforma-dev.vercel.app`. Gating admin/gestor. Sem RLS por Hub (Migrate). Validação visual da Fatia C pendente.

## Checkpoint 010 — RLS do Catálogo (correção do 500 ao criar Portfólio)

- **Data:** 2026-06-30
- **Git Commit:** artefatos `hubdev/bootstrap/rls_catalogo*.sql` + docs (ver Changelog 2026-06-30)
- **Git Branch:** main
- **Project Ref Supabase:** `pnkgwfgjhijksfmofiot` (HUB DEV / Homologação)
- **Ambiente:** HUB DEV / Homologação (banco) + produção Vercel (validação)
- **Banco:** habilitado RLS + 4 policies em `portfolios`/`categorias`/`subcategorias`/`hub_portfolios`; criada `get_hub_id()`
- **Situação:** ✔ Concluído
- **Observações:** corrige `new row violates row-level security policy` (RLS ligado sem policies). Diagnóstico via logs Vercel (digest `1290974233`). Antecipa a RLS por Hub do catálogo (era Frente 4 do Migrate). `products` legado não alterado. Criação de Portfólio validada em produção.

## Checkpoint 011 — RLS de products + cadastro sem legado (Frente 4 final)

- **Data:** 2026-06-30
- **Git Commit:** `cbf4c05` (UI + artefatos `rls_products*.sql`)
- **Git Branch:** main
- **Project Ref Supabase:** `pnkgwfgjhijksfmofiot` (HUB DEV / Homologação)
- **Ambiente:** HUB DEV (banco) + produção Vercel (`hub-plataforma-dev`)
- **Banco:** `products` — `p_products` substituída por `products_sel/ins/upd/del` (Hub vê só Portfólios autorizados; Indústria/legado livre; Hub não escreve)
- **Situação:** ✔ Concluído
- **Observações:** modal de Produto sem origem legada (Fornecedor); selects de Catálogo empilhados; listagem por Portfólio. Estratégia por `get_user_role()` (há 1 assistente sem hub). Validado pelo usuário em produção. **Migrate do catálogo concluído** (backfill N/A — base vazia).

## Checkpoint 012 — Importação para Portfólio (Sprint Expand E5 — DEC-013/DEC-014)

- **Data:** 2026-06-30
- **Git Commit:** `0170912` (código + artefatos + docs)
- **Git Branch:** main
- **Project Ref Supabase:** `pnkgwfgjhijksfmofiot` (HUB DEV / Homologação)
- **Ambiente:** HUB DEV (banco — RPC aplicada via SQL Editor) + produção Vercel (`hub-plataforma-dev`)
- **Banco:** RPC `importar_produtos_portfolio` (`security definer`, atômica, autorização interna) + índice `idx_products_org_nome_norm`. Artefatos `hubdev/bootstrap/expand_rpc_importar_produtos_portfolio.sql` (+ rollback).
- **Situação:** ✔ Concluído — smoke 44/44; commit `0170912`; deploy em `https://hub-plataforma-dev.vercel.app`
- **Observações:** smoke funcional **44/44** — 30 asserts da RPC autenticada end-to-end no HUB DEV (preview/aplicar, idempotência, atomicidade 0%/100%, pendência de Categoria/Subcategoria, N:N com preço por Portfólio, sem `supplier`) + 14 do modelo Excel e do parser/normalização. Dados `ZZ_SMOKE_*` com teardown e ambiente limpo confirmado; "Pharma1"/dados reais intocados. `products.portfolio_id` **não** utilizado; Categorias/Subcategorias **não** criadas automaticamente (viram pendência). Fornecedor intocado (DEC-014). Sem policies novas (acesso ao vínculo só via RPC nesta fase).

## Checkpoint 013 — Vínculo em massa Produto↔Portfólio (Sprint Expand E6 — DEC-013/DEC-014)

- **Data:** 2026-06-30
- **Git Commit:** `350c0f7`
- **Git Branch:** main
- **Project Ref Supabase:** `pnkgwfgjhijksfmofiot` (HUB DEV / Homologação)
- **Ambiente:** HUB DEV (banco — RPCs aplicadas via SQL Editor) + produção Vercel (`hub-plataforma-dev`)
- **Banco:** RPC `vincular_produtos_portfolio` (`security definer`, atômica, idempotente, preço herdado) + helper `produtos_vinculados_portfolio` → `uuid[]`. Artefatos `hubdev/bootstrap/expand_rpc_vincular_produtos_portfolio.sql` (+ rollback).
- **Situação:** ✔ Concluído — smoke 13/13; deploy em `https://hub-plataforma-dev.vercel.app`
- **Observações:** vínculo em massa de produtos existentes em **2 pontos de entrada** (modal na página do Portfólio + ação em lote na lista de Produtos). Idempotente (já vinculado ignorado), classificação opcional aplicada ao lote, N:N validado. `products.portfolio_id` não utilizado; Fornecedor intocado (DEC-014). Sem policies novas (acesso só via RPC).

## Checkpoint 014 — Página HUB "Produtos" (consulta operacional — Sprint Expand E7)

- **Data:** 2026-06-30
- **Git Commit:** `d24c485`
- **Git Branch:** main
- **Project Ref Supabase:** `pnkgwfgjhijksfmofiot` (HUB DEV / Homologação)
- **Ambiente:** HUB DEV (banco — RPCs + metadata via SQL Editor) + produção Vercel (`hub-plataforma-dev`)
- **Banco:** colunas `products.metadata`/`product_portfolios.metadata` (jsonb); RPCs `SECURITY DEFINER` `hub_produtos_listar`/`hub_produto_detalhe`/`hub_produtos_filtros` + `_hub_ctx`. Artefatos `hubdev/bootstrap/expand_hub_produtos.sql` (+ rollback).
- **Situação:** ✔ Concluído — smoke 16/16; deploy em `https://hub-plataforma-dev.vercel.app`
- **Observações:** `/hub/produtos` para Proprietário/Assistente (admin/gestor pré-visualizam), consulta server-side (busca/filtros/ordenação/paginação) com autorização por Hub via `hub_portfolios`; drawer dinâmico (só campos preenchidos + `metadata`); sem CRUD, sem imagens/cards. Orçamento/pré-pedido fora desta etapa. Fornecedor intocado (DEC-014).

## Checkpoint 015 — RBAC: fundação Funções/Permissões (Sprint Expand E8 — DEC-015)

- **Data:** 2026-06-30
- **Git Commit:** `5276589`
- **Git Branch:** main
- **Project Ref Supabase:** `pnkgwfgjhijksfmofiot` (HUB DEV / Homologação)
- **Ambiente:** HUB DEV (banco — via SQL Editor). Sem deploy (app inalterado nesta fatia).
- **Banco:** `funcoes`, `funcao_permissoes`, `profiles.funcao_id`, índices, RLS habilitada sem policies; RPC `minhas_permissoes()`. Artefatos `hubdev/bootstrap/expand_rbac_funcoes.sql` (+ rollback).
- **Situação:** ✔ Concluído (Expand) — smoke 9/9
- **Observações:** fundação do RBAC oficial (DEC-015). Emenda a DEC-011. Aditivo puro (enum/RLS/dados intocados). Próximas fatias: Migrate (dados `vendedor→assistente` + Função padrão; menu/middleware/actions; telas Usuários/Funções; Criar Hub com Proprietário) e Contract (limpeza do enum).

## Checkpoint 016 — Receita no Orçamento (aba sob demanda + Storage) — DEC-018

- **Data:** 2026-07-01
- **Git Commit:** `07d7019` (código da Receita ainda não commitado nesta fatia)
- **Git Branch:** main
- **Project Ref Supabase:** `pnkgwfgjhijksfmofiot` (HUB DEV / Homologação)
- **Ambiente:** HUB DEV. **Migration `056_orcamento_receitas.sql` PENDENTE de aplicação via SQL Editor** (CLI linkado a projeto incorreto — aplicar manualmente). App: build `build:hubdev` OK.
- **Banco (a aplicar):** `quote_receitas` (`texto_modelo`, `status_fluxo`, metadados de arquivo, validação; 1:N com `quotes`); índices `quote_id`/`status_fluxo`/`criado_em`/`organization_id`; RLS `get_organization_id()`; bucket **privado** `orcamento-receitas`; índices auxiliares `quotes(status)` e `quotes(criado_em)`.
- **Aplicação Web:** aba **Receita** no detalhe do Orçamento com **carregamento sob demanda** (só monta ao abrir); aba "Orçamento" inalterada. Ações separadas (`actions-receita.ts`): `getReceitasDoOrcamento` (sem `select('*')`), `gerarModeloReceita`, `salvarRascunhoReceita`, `anexarReceitaAssinada` (upload Storage + só metadados no banco, rollback do arquivo em falha), `validarReceita`, `marcarReceitaEnviada`. Signed URL para download; upload via service role.
- **Estruturas preservadas:** query pesada do detalhe, geração de PDF (só por clique), `leads`/`suppliers` (legado) e `quotes`/`quote_items` **intocados**; nenhum WhatsApp automático.
- **Situação:** ⏳ Código pronto e com build OK — **aguardando aplicação da migration 056 no HUB DEV** e testes manuais da aba (ver Changelog/testes). A refatoração completa do detalhe (queries por aba, histórico paginado, pagamento) segue como trabalho futuro.

## Checkpoint 017 — Conferência de Receita: Infraestrutura (Sprint 1 — DEC-019)

- **Data:** 2026-07-02
- **Git Commit:** `8fb0c2c`
- **Git Branch:** main
- **Project Ref Supabase:** `pnkgwfgjhijksfmofiot` (HUB DEV / Homologação)
- **Ambiente:** HUB DEV. Migration `057_receita_conferencia.sql` **aplicada via SQL Editor** (CLI segue linkado ao projeto legado — relink adiado para depois da Sprint 1). App: build `build:hubdev` OK.
- **Banco (aplicado):** tabelas `receita_checklists`, `receita_checklist_itens`, `receita_modelos`, `receita_conferencias` (append-only), `receita_conferencia_pendencias`; extensão aditiva de `quote_receitas` (`checklist_id`, `status_analise_ia`, `score_ultima_conferencia`; `status_fluxo` += `em_conferencia`/`aprovada_operacionalmente`/`precisa_revisao_humana`); índices; RLS `get_organization_id()`; constraint `chk_receita_aprovacao_humana` (aprovação exige `validada_por` — IA não aprova); trigger append-only. Artefatos: `hubdev/bootstrap/expand_receita_conferencia.sql` (+ `rollback_` + `smoke_`).
- **Smoke (SQL Editor, transação com ROLLBACK):** ✔ **todos os testes passaram** — catálogo/RLS/constraints/trigger/policies; coerência de escopo (bloqueado); `status_fluxo=em_conferencia` aceito; aprovação sem usuário bloqueada e com usuário permitida; append-only (UPDATE/DELETE bloqueados); CHECK de score/`status_analise`.
- **Estruturas preservadas:** DEC-018 intocada (aditivo puro); `chk_acao` do RBAC intocado; sem IA/motor de regras/UI/permissões nesta fatia.
- **Situação:** ✔ **Sprint 1 (Expand) concluída** e validada. Próxima: **Sprint 2 — Motor de Regras** (aguardando autorização).
- **Changelog Relacionado:** 2026-07-02 — Sprint 1 DEC-019 (infraestrutura da Conferência).

## Checkpoint 018 — Conferência de Receita: Motor de Regras (Sprint 2 — DEC-019)

- **Data:** 2026-07-02
- **Git Commit:** `6f59f52`
- **Git Branch:** main
- **Project Ref Supabase:** `pnkgwfgjhijksfmofiot` (HUB DEV) — **sem alteração de banco nesta fatia** (lib pura).
- **Ambiente:** código apenas. Build `build:hubdev` OK.
- **Entregue (`lib/conferencia/`):** `tipos.ts` (contrato puro), `resolver-checklist.ts` (Produto>Portfólio>Organização), `motor-regras.ts` (`conferir()` — determinístico: pendências com `motivo` normalizado, `score` 0..100, `status_analise`; sem `Date.now`, `hoje` injetado; **nunca aprova**).
- **Testes:** `node:test` **11/11 verdes** (checklist Tirzepatida — sem pendências/score 100; CRM e assinatura ausentes; produto/concentração/quantidade divergentes; receita vencida; baixa confiança→precisa_de_revisao_humana; ilegível; clamp de score em 0; resolução hierárquica). Runner sem dependência nova: `tsc` → `.tmp-conferencia` (gitignored) + `node --test`; script `npm run test:conferencia`.
- **Estruturas preservadas:** sem IA, sem persistência, sem UI, sem RBAC, sem mudança de schema; DEC-018/019 intactas.
- **Situação:** ✔ **Sprint 2 concluída** e validada. Próxima: **Sprint 3 — Interface Administrativa** (aguardando autorização).
- **Changelog Relacionado:** 2026-07-02 — Sprint 2 DEC-019 (motor de regras).

## Checkpoint 019 — Conferência de Receita: Diagnóstico + checklists no banco (MVP-3 — DEC-019)

- **Data:** 2026-07-02
- **Git Commit:** `295db48` (código puro) + seed 058 (este commit de docs).
- **Git Branch:** main
- **Project Ref Supabase:** `pnkgwfgjhijksfmofiot` (HUB DEV).
- **Ambiente:** HUB DEV. Seed `058_seed_checklists_receita.sql` **aplicada via SQL Editor**. App: build `build:hubdev` OK.
- **Código (puro, `lib/conferencia/`):** `diagnostico.ts` (`montarDiagnostico()` → **Diagnóstico da Receita** estruturado: `resultado`/`score`/`conferenciaDocumental`/`conferenciaComercial`/`orientacaoOperacional`; documental vs comercial; frases de ação por motivo; termos MVP). `mapear-checklist.ts` (`mapChecklistRows()` — linhas do BD → `Checklist`). Motor da S2 **intocado**.
- **Banco (seed):** **Checklist Genérico** (escopo `organizacao`, 10 itens) e **Checklist Tirzepatida** (escopo `produto`, 11 itens, produto `5193483c…`) semeados e verificados. **Lógica da seed endurecida** (não pontual): skip de produto ausente vira **WARNING** (não NOTICE silencioso) + **relatório final** do estado pós-seed; mantém idempotente e self-healing. (Causa do skip inicial: a seed não foi re-executada após o cadastro do produto; a lógica/ILIKE estava correta.)
- **Testes:** `node:test` **16/16** (motor + diagnóstico estruturado + mapeamento), com **JSON simulado** (sem IA).
- **Estruturas preservadas:** sem IA, sem UI, sem RBAC; checklists **no banco** (não no código); DEC-018/019 intactas.
- **Situação:** ✔ **MVP-3 concluída** (Genérico end-to-end; Tirzepatida pendente do produto). Próxima: **MVP-4 — Camada de IA** (aguardando autorização).
- **Changelog Relacionado:** 2026-07-02 — MVP-3 DEC-019 (Diagnóstico + seed de checklists).

## Checkpoint 020 — Conferência de Receita: Camada de IA (MVP-4 — DEC-019)

- **Data:** 2026-07-02
- **Git Commit:** `00358ba` (código) + este commit de docs.
- **Git Branch:** main
- **Project Ref Supabase:** `pnkgwfgjhijksfmofiot` — **sem alteração de banco** nesta fatia.
- **Ambiente:** código apenas. Build `build:hubdev` OK. Nova dependência: `@anthropic-ai/sdk` (`^0.109.1`).
- **Entregue (`lib/ia/`):** `tipos.ts` (`ExtratorReceita` provider-agnostic; saída = `ExtracaoReceita` = entrada do motor). `schema-extracao.ts` (`SCHEMA_EXTRACAO` **sem score/status/aprovação**; `parseExtracao()` validação pura 0..1; `construirPromptExtracao()` — só extrai, nunca decide/aprova/score). `provedores/claude.ts` (`ClaudeExtrator`: `claude-opus-4-8`, PDF/imagem multimodal, saída estruturada via **tool forçada**, resultado validado por `parseExtracao`). `provedores/mock.ts` + `index.ts` (factory; openai/gemini/azure/local futuros).
- **Testes:** `node:test` **24/24** (schema sem decisão; parse válido/inválido; prompt sem linguagem de decisão; **pipeline IA(mock)→motor→Diagnóstico**). Runner: `npm run test:conferencia` (compila `lib/conferencia` + `lib/ia`, exceto o provider Claude/factory que usam SDK).
- **IA apenas alimenta o motor:** o schema não tem campos de decisão; a IA devolve `campos`/`itens`/`confianca`; **motor (S2)** calcula pendências/score/status e o **Diagnóstico da Receita** (MVP-3). Motor intocado.
- **Estruturas preservadas:** sem UI/server action/persistência/RBAC/integração em runtime (fora do escopo); DEC-018/019 intactas.
- **Situação:** ✔ **MVP-4 concluída** e validada. Próxima: **MVP-5 — Integração/pipeline + decisão humana + RBAC** (aguardando autorização).
- **Changelog Relacionado:** 2026-07-02 — MVP-4 DEC-019 (camada de IA).

## Checkpoint 021 — Conferência de Receita: Integração + decisão humana + RBAC (MVP-5 — DEC-019)

- **Data:** 2026-07-02
- **Git Commit:** `1f0d5cc` (código) + este commit de docs.
- **Git Branch:** main
- **Project Ref Supabase:** `pnkgwfgjhijksfmofiot` (HUB DEV). **Migration `059` PENDENTE de aplicação via SQL Editor**.
- **Ambiente:** código apenas (build `build:hubdev` OK). Sem UI/deploy/preview.
- **Entregue:** `app/(dashboard)/orcamentos/actions-conferencia.ts` — `rodarPreAnalise` (receita anexada → download Storage → extração IA → motor → Diagnóstico → persistência em `receita_conferencias` + `receita_conferencia_pendencias` → atualiza `quote_receitas` → auditoria) e decisões humanas `aprovarReceitaOperacionalmente` / `marcarNecessitaCorrecao` / `rejeitarReceita`. `lib/conferencia/persistencia.ts` (mappers puros). `lib/rbac.ts` (`AcaoRbac` += conferir/aprovar).
- **RBAC:** `receita:conferir` (rodar) e `receita:aprovar` (decidir) via `resolverPermissoes`/`podeAcao`. **Nota:** RBAC é **fail-open** (convenção do projeto) — avaliar fail-closed para `receita:aprovar` no hardening.
- **Banco (a aplicar):** migration `059` — `quote_receitas.status_fluxo += 'necessita_correcao'`; `funcao_permissoes.chk_acao += 'conferir','aprovar'`. Artefatos `hubdev/bootstrap/expand_receita_conferencia_mvp5.sql` (+ rollback).
- **Testes:** `node:test` **26/26** (motor + diagnóstico + IA + **mappers de persistência**). E2E (com sessão/arquivo/IA real) fica para MVP-6/deploy.
- **Fronteira mantida:** IA só extrai; motor decide; aprovação humana. DEC-018/019 intactas.
- **Situação:** ✔ **MVP-5 (código) concluída**; migration `059` a aplicar; e2e na MVP-6. Próxima: **MVP-6 — UI mínima na aba Receita** (aguardando autorização).
- **Changelog Relacionado:** 2026-07-02 — MVP-5 DEC-019 (integração + decisão humana + RBAC).
