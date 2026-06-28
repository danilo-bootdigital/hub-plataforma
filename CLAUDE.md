# Instruções do Projeto

Sempre responda em **português do Brasil** (pt-BR), independentemente do idioma usado na pergunta.

## Documentação oficial (fonte única)

A documentação oficial do projeto está **centralizada na pasta [`docs/`](docs/)** — fonte única de verdade.

- [`docs/ARQUITETURA_OFICIAL.md`](docs/ARQUITETURA_OFICIAL.md) — **Constituição do projeto**: referência arquitetural suprema; em qualquer divergência, ela prevalece.
- [`docs/CONTRIBUINDO.md`](docs/CONTRIBUINDO.md) — **porta de entrada** para qualquer novo desenvolvedor (ordem de leitura, fluxo de trabalho e regras).
- Demais: `DECISIONS.md` (decisões), `ROADMAP.md`, `SPRINTS.md`, `CHECKPOINTS.md`, `CHANGELOG.md`, `RISCOS.md`.

> `hubdev/README.md` é apenas documentação operacional do ambiente HUB DEV — **não** é fonte de documentação oficial do projeto.

## Ambiente oficial de desenvolvimento

- **HUB DEV / Homologação é o ÚNICO ambiente oficial de desenvolvimento.** Project Ref **`pnkgwfgjhijksfmofiot`** — `https://pnkgwfgjhijksfmofiot.supabase.co`.
- Toda operação de banco deve ser direcionada **exclusivamente** a esse projeto. O projeto legado e qualquer outro projeto Supabase são **proibidos**. Em dúvida sobre o projeto conectado, **pare e confirme** antes de executar.
- Rodar a Aplicação Web sempre via **build + start** (nunca `next dev`).

## Estratégia e Sprints

A evolução do schema segue **Expand → Migrate → Contract** (aditivo primeiro; migração e remoção depois). Nenhuma Sprint é concluída enquanto seu status não estiver registrado na documentação oficial.

- **Sprint E1** (conexão Aplicação Web ↔ HUB DEV): **concluída**.
- **Sprint Expand E1** (núcleo Hub + Carteiras): **concluída** (criadas `hubs`, `carteiras`, `contacts.carteira_id`; aditivo puro).
- **Sprints de Governança G0, G1, G2 e G3:** **concluídas** — documentação oficial consolidada em `docs/`.

Toda alteração futura segue obrigatoriamente o fluxo **ARQUITETURA → DEC → Sprint → Checkpoint → Changelog**. Mudança de domínio/arquitetura exige uma nova **DEC** (ver `docs/DECISIONS.md`).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
