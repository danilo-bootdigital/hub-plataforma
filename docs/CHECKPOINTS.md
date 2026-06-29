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
