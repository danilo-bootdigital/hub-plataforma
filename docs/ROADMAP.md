# ROADMAP — Hub Plataforma

> Roadmap visual por fases (estratégia Expand → Migrate → Contract). Status conforme DEC-005.
> Atualizado em 2026-06-26.
>
> **Legenda:** 🟩 Concluída · 🟨 Em andamento · ⬜ Planejada

## Fluxo das fases

```
        ┌──────────────────────────┐
        │   FUNDAÇÃO        🟩      │  Concluída
        │   Bootstrap · GitHub ·    │
        │   HUB DEV · Supabase ·    │
        │   Conexão · Sprint E1     │
        └────────────┬─────────────┘
                     ↓
        ┌──────────────────────────┐
        │   EXPAND          🟨      │  Em andamento
        │   ✔ Expand E1             │
        │   ⬜ Expand E2 · E3        │
        └────────────┬─────────────┘
                     ↓
        ┌──────────────────────────┐
        │   MIGRATE         ⬜      │  Planejada
        │   ⬜ M1 · M2               │
        └────────────┬─────────────┘
                     ↓
        ┌──────────────────────────┐
        │   CONTRACT        ⬜      │  Planejada
        │   ⬜ C1 · C2               │
        └────────────┬─────────────┘
                     ↓
        ┌──────────────────────────┐
        │   ENTREGA         ⬜      │  Planejada
        │   ⬜ Baseline 001          │
        │   ⬜ Produção (HUB PROD)   │
        └──────────────────────────┘
```

Cada fase **depende da conclusão da anterior**. A Baseline 001 só é gerada ao fim do Contract.

## Detalhamento

| Fase | Etapa | Estado |
|---|---|---|
| Fundação | Bootstrap · GitHub · HUB DEV · Supabase · Conexão · Sprint E1 | 🟩 Concluída |
| Expand | Expand E1 | 🟩 Concluída |
| Expand | Expand E2 · Expand E3 | ⬜ Planejada |
| Migrate | M1 · M2 | ⬜ Planejada |
| Contract | C1 · C2 | ⬜ Planejada |
| Entrega | Baseline 001 · Produção (HUB PROD) | ⬜ Planejada |

## Notas

- Sprints de **Governança (G0, G1, G2, G3)** são transversais — não pertencem às fases Expand/Migrate/Contract.
- Itens não marcados como concluídos permanecem **Planejada** (DEC-005).
- Escopo detalhado de cada Sprint em [`SPRINTS.md`](SPRINTS.md).
