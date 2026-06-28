# DECISIONS — Registro de Decisões Arquiteturais

> Registro permanente das decisões arquiteturais do Hub Plataforma.
> Cada decisão: identificador · descrição · motivo · impacto · data · status.
> Datas conforme DEC-004 (consolidação documental = 2026-06-26; não inventar datas anteriores).

---

## Regras deste registro (imutabilidade)

1. **Decisões são imutáveis.** Nenhuma DEC existente pode ser editada após registrada.
2. **Evolução por substituição.** Para mudar uma decisão, registra-se uma **nova DEC** que a substitui; a antiga **permanece** no histórico com o status atualizado para "Substituída por DEC-XXX".
3. **Identificador sequencial.** Toda decisão futura recebe o próximo identificador sequencial (**DEC-011, DEC-012, …**). Identificadores nunca são reutilizados nem reaproveitados.
4. **Status possíveis:** `Aprovada / vigente` · `Substituída por DEC-XXX` · `Revogada`.

> A próxima decisão a ser registrada será a **DEC-012**.

---

## DEC-001 — Remoção de Lead

- **Descrição:** Lead deixa de existir no domínio. O ponto de entrada passa a ser **Solicitação de Novo Cliente**.
- **Motivo:** alinhamento do domínio do Hub Plataforma; Lead é conceito legado herdado do sistema anterior.
- **Impacto:** a tabela `leads` permanece apenas como compatibilidade temporária durante Expand → Migrate → Contract; **remoção definitiva exclusivamente na fase Contract**.
- **Data:** 2026-06-26
- **Status:** Aprovada / vigente

## DEC-002 — Substituição de Deal por Atendimento Comercial

- **Descrição:** a entidade `Deal` deixa de existir como conceito de negócio, substituída por **Atendimento Comercial**.
- **Motivo:** padronizar o conceito comercial do domínio do Hub Plataforma.
- **Impacto:** a estrutura `deals` poderá permanecer temporariamente durante a fase Migrate por compatibilidade com o código legado; ao final do **Contract**, toda referência a Deal deverá ter sido eliminada.
- **Data:** 2026-06-26
- **Status:** Aprovada / vigente

## DEC-003 — Remoção da camada Catálogo

- **Descrição:** a entidade "Catálogo" foi removida do domínio. A árvore oficial passa a ser **Indústria → Categorias → Subcategorias → Produtos**.
- **Motivo:** simplificar e oficializar a hierarquia de catálogo, sem uma camada intermediária "Catálogo".
- **Impacto:** estruturas legadas relacionadas a catálogo serão tratadas apenas durante **Migrate/Contract**.
- **Data:** 2026-06-26
- **Status:** Aprovada / vigente

## DEC-004 — Política de datas da documentação

- **Descrição:** utilizar as **datas efetivas** do projeto; quando a decisão foi consolidada nesta fase de arquitetura, usar a **data da consolidação documental**. Não inventar datas anteriores.
- **Motivo:** integridade e rastreabilidade do histórico.
- **Impacto:** decisões consolidadas na Sprint G0 recebem data **2026-06-26**; Bootstrap recebe **2026-06-25** (data efetiva no git).
- **Data:** 2026-06-26
- **Status:** Aprovada / vigente

## DEC-005 — Escopo concluído do Roadmap

- **Descrição:** considerar oficialmente concluídos: Bootstrap, GitHub, HUB DEV, Supabase, Conexão da Plataforma, Sprint E1 e Sprint Expand E1. Os demais itens permanecem **não iniciados**.
- **Motivo:** estabelecer marco oficial de progresso.
- **Impacto:** baseia o estado de [`ROADMAP.md`](ROADMAP.md).
- **Data:** 2026-06-26
- **Status:** Aprovada / vigente

## DEC-006 — Entidades oficiais e estruturas de compatibilidade

- **Descrição:**
  - **Entidades oficiais:** Indústria, Hub, Carteira, Categoria, Subcategoria, Produto, Cliente, Atendimento Comercial, Pipeline, Orçamento, Pré-pedido, Pedido.
  - **Estruturas temporárias de compatibilidade:** `leads`, `deals`, `health_hubs`, `supplier_categories`.
- **Motivo:** fixar o domínio oficial atual e separar o legado em transição.
- **Impacto:** as estruturas de compatibilidade permanecem apenas para viabilizar Expand → Migrate → Contract e **deverão desaparecer na fase Contract**.
- **Data:** 2026-06-26
- **Status:** Aprovada / vigente

---

## Decisões consolidadas de fases anteriores

> Decisões aprovadas anteriormente no projeto, consolidadas na Sprint G0 (não são novas).

## DEC-007 — HUB DEV como ambiente oficial único

- **Descrição:** o HUB DEV / Homologação (`pnkgwfgjhijksfmofiot`) é o **único** ambiente oficial de desenvolvimento.
- **Motivo:** evitar operações no projeto legado ou em projetos divergentes.
- **Impacto:** toda operação de banco é direcionada exclusivamente a esse Project Ref; em dúvida, parar e confirmar. Ver [`RISCOS.md`](RISCOS.md) (CLI linkado ao projeto errado).
- **Data:** 2026-06-26
- **Status:** Aprovada / vigente

## DEC-008 — Carteira pertence à Indústria e autoriza um Hub

- **Descrição:** a Carteira pertence à Indústria (`carteiras.organization_id`) e **autoriza um Hub** (`carteiras.hub_id`). A responsabilidade operacional ficará em outra camada futuramente.
- **Motivo:** modelar corretamente a hierarquia Indústria → Hub → Carteira → Cliente.
- **Impacto:** define o relacionamento criado na Sprint Expand E1; `hub_id` permanece nullable nesta fase.
- **Data:** 2026-06-26
- **Status:** Aprovada / vigente

## DEC-009 — Execução via build + start (nunca next dev)

- **Descrição:** a Aplicação Web sobe sempre por `build` + `start`; é proibido `next dev` (Turbopack) no sandbox.
- **Motivo:** `next dev` saturou o `fork` (centenas de workers) e travou o shell (AUDIT-E1-01).
- **Impacto:** procedimento padrão de execução local/HUB DEV.
- **Data:** 2026-06-26
- **Status:** Aprovada / vigente

## DEC-010 — Nomenclatura oficial (proibido "App"/"Aplicativo")

- **Descrição:** padronização de nomenclatura: Hub Plataforma, Plataforma, Aplicação Web, Ambiente de Desenvolvimento, HUB DEV / Homologação, HUB PROD. Proibido "App"/"Aplicativo".
- **Motivo:** consistência de comunicação e documentação.
- **Impacto:** aplica-se a toda documentação, planejamento e comunicação. Ver [`ARQUITETURA_OFICIAL.md`](ARQUITETURA_OFICIAL.md) §10.
- **Data:** 2026-06-26
- **Status:** Aprovada / vigente

---

## DEC-011 — Perfis, Papéis, Escopos e Operação (Indústria × Hub)

- **Descrição:** define o modelo oficial de controle de acesso e operação em **dois blocos** — **Indústria** (dona dos dados; cria e governa Hubs e Carteiras) e **Hub** (operador autorizado). Estabelece papéis, escopos, modos de Carteira, estados do Hub, Responsável da Carteira e concessões. **Não substitui a entidade Representante.**
  - **Hierarquia oficial:** `Indústria → Representante (empresa) → Hub → Proprietário do Hub → Assistentes`.
  - **Representante** continua sendo **entidade de negócio** (empresa parceira da Indústria); **dentro do Representante existe o Hub operacional**. O **Assistente de Venda não substitui o Representante** — é apenas usuário operacional do Hub.
  - **Papéis oficiais:** Indústria → `administrador`, `gestor`, `financeiro`; Hub → `proprietario_hub`, `assistente`. **"Atendimento" deixa de ser perfil** (passa a ser função atribuída por permissão). **Suporte removido** do modelo.
  - **Escopos:** `plataforma` (reservado/futuro) · `indústria` · `hub` · `equipe` (opcional) · `próprio`.
  - **Propriedade (inequívoca):** Cliente, Produto, Categoria, Subcategoria e **Carteira pertencem à Indústria**. O **Hub é operador autorizado**, nunca proprietário.
  - **Governança do Hub (exclusiva da Indústria):** a Indústria **cadastra, ativa, inativa, suspende e bloqueia** o Hub; **define e altera** qual Hub opera cada Carteira. O Hub **não cria a si mesmo, não cria Carteiras, não transfere Carteiras** — apenas opera as Carteiras autorizadas.
  - **Estados do Hub:** `ATIVO` (opera normalmente) · `INATIVO` (não opera, decisão administrativa) · `SUSPENSO` (interrupção temporária — contrato/inadimplência/pausa) · `BLOQUEADO` (bloqueio por segurança/decisão administrativa).
  - **Modos de operação da Carteira (definidos pelo Proprietário do Hub, por Carteira):** `OPEN` (Carteira Aberta — todos os Assistentes autorizados trabalham os Clientes) · `DISTRIBUTED` (Carteira Distribuída — Clientes/Atendimentos distribuídos a Assistentes específicos). Conceito a ser futuramente materializado como enum.
  - **Responsável da Carteira:** usuário **do Hub** (Proprietário do Hub ou Assistente designado) para fins de **gestão, indicadores, SLA, auditoria e responsabilidade operacional**. **Não altera a propriedade** da Carteira (que permanece exclusivamente da Indústria).
  - **Concessões:** o Proprietário do Hub concede capacidades adicionais a Assistentes específicos (ver/editar todos os Orçamentos/Pedidos do Hub, acessar Atendimentos de outros, redistribuir, relatórios) — **explícitas, auditáveis e revogáveis**.
  - **Auditoria:** alterações de papel, estados do Hub, autorização/alteração de Hub de Carteira, definição de modo, distribuição/redistribuição, definição de Responsável e concessões/revogações geram registro **imutável** (autor, alvo, antes→depois, data/hora).
- **Motivo:** resolver a dúvida funcional do `FUNCIONAL.md` Cap. 8 e fixar fronteiras claras de propriedade (Indústria) × operação (Hub).
- **Impacto:** base oficial para permissões, menu, criação de usuários, escopo de acesso, RLS e auditoria. Enum técnico `user_role` receberá (de forma **aditiva**, fase Expand) `proprietario_hub` e `assistente`; `vendedor` permanece **compatibilidade temporária até o Contract**; `admin`/`gestor`/`financeiro` mantidos; `atendimento` deixa de ser perfil e `suporte` é removido (limpeza física no **Contract**). Modo de Carteira e estados do Hub serão materializados como enums em Expand. **Esta DEC não implementa nada** (sem banco/código/RLS/migration agora). Exige atualização de `DOMINIO.md` e `FUNCIONAL.md`.
- **Data:** 2026-06-26
- **Status:** Aprovada / vigente
