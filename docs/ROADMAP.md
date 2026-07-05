# ROADMAP — Hub Plataforma

> Roadmap visual por fases (estratégia Expand → Migrate → Contract). Status conforme DEC-005.
> Atualizado em 2026-07-05 — reflete Checkpoints 001–023 e DEC-001…DEC-022.
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
        │   EXPAND          🟩      │  Núcleo concluído
        │   ✔ E1 · E4 · E4-app ·    │
        │   ✔ E5 · E6 · E7 · E8     │
        │   (aditivo puro no schema)│
        └────────────┬─────────────┘
                     ↓
        ┌──────────────────────────┐
        │   MIGRATE         ⬜      │  Planejada
        │   ⬜ M1 · M2               │
        │   (migração de compat/    │
        │    legado após Expand)    │
        └────────────┬─────────────┘
                     ↓
        ┌──────────────────────────┐
        │   CONTRACT        ⬜      │  Planejada
        │   ⬜ C1 · C2               │
        │   (remoção do legado)     │
        └────────────┬─────────────┘
                     ↓
        ┌──────────────────────────┐
        │   ENTREGA         ⬜      │  Planejada
        │   ⬜ Baseline 001          │
        │   ⬜ Produção (HUB PROD)   │
        └──────────────────────────┘

   ┌───────────────────────────────────────────────┐
   │  TRANSVERSAIS (paralelos às fases de schema)    │
   │  · Governança: G0 · G1 · G2 · G3        🟩     │
   │  · Módulos de Produto: DEC-016…DEC-022  🟨     │
   └───────────────────────────────────────────────┘
```

Cada fase de **schema** depende da conclusão da anterior. A Baseline 001 só é gerada ao fim do Contract. Governança e Módulos de Produto evoluem **em paralelo**, sempre de forma aditiva (Expand) sobre o schema.

## Fases de schema (Expand → Migrate → Contract)

| Fase | Etapa | Fonte | Estado |
|---|---|---|---|
| Fundação | Bootstrap · GitHub · HUB DEV · Supabase · Conexão · Sprint E1 | DEC-001…005 | 🟩 Concluída |
| Expand | Núcleo Hub + Carteiras (Expand E1) | — | 🟩 Concluída |
| Expand | Catálogo / Portfólio (E4, E4-app) | DEC-012 | 🟩 Concluída (Ckpt 008–011) |
| Expand | Importação para Portfólio (E5) | DEC-013 / DEC-014 | 🟩 Concluída (Ckpt 012) |
| Expand | Vínculo em massa Produto ↔ Portfólio (E6) | DEC-013 / DEC-014 | 🟩 Concluída (Ckpt 013) |
| Expand | Página HUB "Produtos" — consulta operacional (E7) | — | 🟩 Concluída (Ckpt 014) |
| Expand | RBAC: Perfis × Funções × Permissões (E8) | DEC-015 | 🟩 Concluída (Ckpt 015) |
| Migrate | M1 · M2 (migração de dados e compat) | DEC-005 | ⬜ Planejada |
| Contract | C1 · C2 (remoção de legado) | DEC-005 | ⬜ Planejada |
| Entrega | Baseline 001 · Produção (HUB PROD) | — | ⬜ Planejada |

## Módulos de Produto (transversais — aditivos sobre Expand)

| Módulo | Fonte | Estado |
|---|---|---|
| Receita no Orçamento (aba sob demanda + Storage) | DEC-018 | 🟩 Concluída (Ckpt 016) |
| Conferência de Receita — MVP documental (menu próprio; IA extrai · motor de regras · decisão humana) | DEC-019 | 🟩 MVP utilizável (Ckpt 017–022) · fluxo acoplado ao orçamento adiado (pós-MVP) |
| Cadastro de Clientes (pré-cadastro Hub → aprovação Indústria) | DEC-020 | 🟩 Concluída (Ckpt 023) · e-mail à Indústria na Fase 2 |
| Configurações do Hub (identidade white-label + assistente de IA comercial) | DEC-021 | 🟩 Config-1/2/3 em produção · Config-4 arquivada |
| Separação Administração (Indústria) × Operação (Hub) | DEC-022 | 🟩 Em produção (menu + middleware por perfil) · follow-up de fluxo do orçamento pendente |

## Governança (transversal)

| Sprint / Decisão | Escopo | Estado |
|---|---|---|
| G0 · G1 · G2 · G3 | Consolidação da documentação oficial em `docs/` | 🟩 Concluída (Ckpt 004–007) |
| DEC-016 | Fronteira de governança: Indústria governa o Hub, Proprietário opera | 🟩 Aprovada / vigente |
| DEC-017 | Governança de Clientes e Carteiras: Indústria governa a base, Hub opera | 🟩 Aprovada / vigente |

## Próximos passos em aberto (backlog registrado)

- **DEC-019 — fluxo acoplado ao orçamento** (comparação extração × orçamento, cobertura documental, gate no pedido): adiado explicitamente para pós-MVP.
- **DEC-022 — follow-up de fluxo:** com a Indústria fora do orçamento, definir como o Hub avança o passo hoje em `aguardando_aprovacao_interna` (decisão de fluxo, não de acesso).
- **DEC-020 — e-mail à Indústria** no envio do pré-cadastro (Fase 2).
- **Observabilidade / monitoramento de produção** (request-id, log JSON estruturado, health check, query/cache tracking, métricas, alertas, rollback): **a tratar** — exige DEC nova antes de implementação.

## Notas

- Sprints de **Governança (G0–G3)** e **Módulos de Produto (DEC-018…DEC-022)** são **transversais** — não pertencem às fases Expand/Migrate/Contract de schema, mas são sempre **aditivos** (Expand) sobre ele.
- Itens não marcados como concluídos permanecem **Planejada** (DEC-005).
- Escopo detalhado de cada Sprint em [`SPRINTS.md`](SPRINTS.md); decisões em [`DECISIONS.md`](DECISIONS.md); estado por entrega em [`CHECKPOINTS.md`](CHECKPOINTS.md).
