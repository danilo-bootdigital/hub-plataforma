# CONSTITUIÇÃO DO PROJETO — Hub Plataforma
### (Arquitetura Oficial)

> **Documento máximo e Constituição do projeto.** É a referência arquitetural **suprema** de toda a Plataforma.
> **Resolução de divergências:** em caso de conflito entre este documento e qualquer outro documento, artefato, código ou comunicação, **esta Constituição prevalece** — e a divergência deve ser corrigida no documento subordinado, nunca aqui.
> Esta Constituição só pode ser alterada por uma nova decisão registrada em [`DECISIONS.md`](DECISIONS.md).
> Última consolidação: **2026-06-26** (Governança — Sprints G0–G3).

---

## 1. Visão da Plataforma

O **Hub Plataforma** é a Plataforma de gestão comercial de uma Indústria, operada por meio de uma **Aplicação Web** (Next.js) conectada ao Supabase. A Plataforma organiza a operação comercial em torno de **Hubs** e **Carteiras**, do primeiro contato (**Solicitação de Novo Cliente**) até o **Pedido**.

## 2. Objetivo

Centralizar e padronizar a operação comercial da Indústria — clientes, atendimento, pipeline, orçamentos e pedidos — sobre um domínio oficial coerente, evoluído de forma segura pela estratégia **Expand → Migrate → Contract**.

## 3. Princípios inegociáveis

1. **Aditivo primeiro.** Evolução de schema segue **Expand → Migrate → Contract**: cria-se o novo (Expand), migra-se (Migrate) e só então remove-se o legado (Contract). Nada é removido fora da fase Contract.
2. **Ambiente oficial único.** Todo trabalho de banco ocorre **exclusivamente** no HUB DEV (`pnkgwfgjhijksfmofiot`). Projeto legado e qualquer outro são proibidos.
3. **Confirmar antes de operar.** Antes de qualquer operação de banco, confirmar o Project Ref alvo. Em dúvida, **parar e reportar**.
4. **Execução via build + start.** A Aplicação Web sobe sempre por `build` + `start`; **nunca** `next dev` (satura `fork` no sandbox).
5. **Governança.** Qualquer erro encontrado vira **item de auditoria**: parar, reportar causa/arquivos/impacto/sugestão e aguardar aprovação. Não corrigir domínio/banco/arquitetura/regra sem autorização.
6. **Nomenclatura oficial obrigatória** (ver §10). Proibido "App"/"Aplicativo".
7. **Sem documentação, sem conclusão.** Nenhuma Sprint é concluída enquanto seu status não estiver registrado nesta documentação.

## 4. Estratégia Expand → Migrate → Contract

- **Expand** — adicionar as novas estruturas oficiais (aditivo puro, nullable, sem migrar dados, sem alterar código/RLS).
- **Migrate** — popular/migrar dados para as novas estruturas, ajustar código e definir RLS das novas tabelas.
- **Contract** — remover estruturas legadas de compatibilidade, já sem uso.

A **Baseline 001** definitiva só será gerada ao fim do Contract (squash do estado final).

## 5. Entidades oficiais

Árvore oficial de **catálogo** (DEC-003 — não existe mais camada "Catálogo"):

```
Indústria → Categorias → Subcategorias → Produtos
```

Árvore oficial **comercial**:

```
Indústria → Hub → Carteira → Cliente → Atendimento Comercial → Pipeline → Orçamento → Pré-pedido → Pedido
```

Entidades oficiais do domínio (DEC-006) e situação atual:

| Entidade oficial | Situação atual |
|---|---|
| Indústria | Implementada (`organizations`) |
| Hub | Implementada (`hubs` — Expand E1) |
| Carteira | Implementada (`carteiras` — Expand E1) |
| Categoria | Planejada (não confundir com `supplier_categories` legado) |
| Subcategoria | Planejada |
| Produto | Implementada (`products`) |
| Cliente | Implementada (`contacts`) |
| Atendimento Comercial | Planejada (substitui `Deal` — DEC-002) |
| Pipeline | Implementada (`pipelines` / `pipeline_stages`) |
| Orçamento | Implementada (`quotes`) |
| Pré-pedido | Planejada |
| Pedido | Implementada (`orders`) |

## 6. Entidades removidas / em compatibilidade temporária

- **Lead** — removida do domínio (DEC-001). Ponto de entrada passa a ser **Solicitação de Novo Cliente**.
- **Deal** — removida como conceito (DEC-002). Substituída por **Atendimento Comercial**.
- **Catálogo** — removida como camada (DEC-003).

**Estruturas temporárias de compatibilidade** (DEC-006) — permanecem **apenas** para viabilizar Expand → Migrate → Contract e **devem desaparecer na fase Contract**:

`leads` · `deals` · `health_hubs` · `supplier_categories`

> Observação: o código atual da Aplicação Web ainda consome essas estruturas legadas. Isso é esperado durante Expand/Migrate e **não** é uma inconsistência.

## 7. Regras de domínio

- **Solicitação de Novo Cliente** é o ponto de entrada do funil (substitui Lead).
- **Atendimento Comercial** é o conceito comercial em andamento (substitui Deal).
- O catálogo é estritamente **Categoria → Subcategoria → Produto**, sem camada "Catálogo".
- Toda remoção de entidade legada ocorre **somente na fase Contract**.

## 8. Isolamento entre Indústria, Hub e Carteiras

- **Indústria** (`organizations`) é o tenant raiz. Todo dado é escopado por `organization_id`.
- **Hub** (`hubs`) é a unidade de negócio dentro da Indústria (`hubs.organization_id`).
- **Carteira** (`carteiras`) **pertence à Indústria** (`carteiras.organization_id`) e **autoriza um Hub** (`carteiras.hub_id`, nullable) — DEC-008. A Carteira agrupa **Clientes** (`contacts.carteira_id`).
- **Isolamento:** dados de uma Indústria não cruzam para outra (escopo por `organization_id`). A Carteira é o agrupamento operacional de Clientes sob autorização de um Hub. O RLS **existente** preserva o escopo por Indústria; as policies das tabelas novas (`hubs`, `carteiras`) serão definidas na fase **Migrate**.

> **Operação e papéis (DEC-011):** a estrutura operacional `Indústria → Representante (empresa) → Hub → Proprietário do Hub → Assistentes`, os modos de Carteira (OPEN/DISTRIBUTED), os estados do Hub (ATIVO/INATIVO/SUSPENSO/BLOQUEADO) e o controle de acesso estão definidos na **DEC-011** e detalhados em [`DOMINIO.md`](DOMINIO.md) e [`FUNCIONAL.md`](FUNCIONAL.md). A Indústria permanece o tenant raiz e dona dos dados; Representante/Hub são operadores autorizados.

## 9. Ambiente oficial de desenvolvimento

- **HUB DEV / Homologação** — **único** ambiente oficial de desenvolvimento.
  - Project Ref: **`pnkgwfgjhijksfmofiot`**
  - URL: `https://pnkgwfgjhijksfmofiot.supabase.co`
- A Aplicação Web aponta ao HUB DEV via `.env.local.hubdev` (gitignored). Subir sempre por **build + start**.
- **HUB PROD** (produção) será definido apenas ao fim do Contract.
- Ver risco operacional do CLI em [`RISCOS.md`](RISCOS.md).

## 10. Nomenclaturas oficiais

**Proibido** usar "App" ou "Aplicativo". Termos oficiais:

| Conceito | Termo oficial |
|---|---|
| Produto | **Hub Plataforma** |
| Sistema | **Plataforma** |
| Código Next.js | **Aplicação Web** |
| Ambiente local | **Ambiente de Desenvolvimento** |
| Ambiente cloud | **HUB DEV / Homologação** |
| Produção | **HUB PROD** |

## 11. Como evoluir a Plataforma

Toda evolução segue um fluxo **único e obrigatório**, sem pular etapas:

```
Arquitetura → Decisão → Sprint → Checkpoint → Changelog
```

1. **Arquitetura** ([`ARQUITETURA_OFICIAL.md`](ARQUITETURA_OFICIAL.md)) — esta Constituição define o que é permitido; nada pode contrariá-la.
2. **Decisão** ([`DECISIONS.md`](DECISIONS.md)) — toda mudança de domínio/arquitetura nasce como uma nova **DEC** sequencial e imutável.
3. **Sprint** ([`SPRINTS.md`](SPRINTS.md)) — a DEC é executada por uma Sprint, dentro de **Expand → Migrate → Contract**, com critérios de aceite.
4. **Checkpoint** ([`CHECKPOINTS.md`](CHECKPOINTS.md)) — ao concluir, registra-se o estado do sistema (data, commit, ambiente, banco, situação).
5. **Changelog** ([`CHANGELOG.md`](CHANGELOG.md)) — registra-se cronologicamente o que foi **efetivamente implementado**.

> Regra: sem DEC não há Sprint de domínio; sem Checkpoint **e** Changelog não há conclusão. Decisões não entram no Changelog (ficam em [`DECISIONS.md`](DECISIONS.md)).

---

## Documentos relacionados

- [`CONTRIBUINDO.md`](CONTRIBUINDO.md) — como trabalhar dentro deste projeto (leitura obrigatória inicial).
- [`DECISIONS.md`](DECISIONS.md) — decisões arquiteturais (os "porquês").
- [`DOMINIO.md`](DOMINIO.md) — entidades de negócio do domínio.
- [`FUNCIONAL.md`](FUNCIONAL.md) — papéis, permissões, estados e fluxo operacional.
- [`ROADMAP.md`](ROADMAP.md) — fases e o que está concluído / a fazer.
- [`SPRINTS.md`](SPRINTS.md) — execução por Sprint.
- [`CHANGELOG.md`](CHANGELOG.md) — histórico cronológico de implementações.
- [`CHECKPOINTS.md`](CHECKPOINTS.md) — checkpoints do projeto.
- [`RISCOS.md`](RISCOS.md) — riscos arquiteturais e mitigações.
