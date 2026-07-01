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
- **Git Commit:** `__HASH__`
- **Git Branch:** main
- **Project Ref Supabase:** `pnkgwfgjhijksfmofiot` (HUB DEV / Homologação)
- **Ambiente:** HUB DEV (banco — RPCs + metadata via SQL Editor) + produção Vercel (`hub-plataforma-dev`)
- **Banco:** colunas `products.metadata`/`product_portfolios.metadata` (jsonb); RPCs `SECURITY DEFINER` `hub_produtos_listar`/`hub_produto_detalhe`/`hub_produtos_filtros` + `_hub_ctx`. Artefatos `hubdev/bootstrap/expand_hub_produtos.sql` (+ rollback).
- **Situação:** ✔ Concluído — smoke 16/16; deploy em `https://hub-plataforma-dev.vercel.app`
- **Observações:** `/hub/produtos` para Proprietário/Assistente (admin/gestor pré-visualizam), consulta server-side (busca/filtros/ordenação/paginação) com autorização por Hub via `hub_portfolios`; drawer dinâmico (só campos preenchidos + `metadata`); sem CRUD, sem imagens/cards. Orçamento/pré-pedido fora desta etapa. Fornecedor intocado (DEC-014).
