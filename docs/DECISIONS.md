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

> A próxima decisão a ser registrada será a **DEC-014**.

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

---

## DEC-012 — Modelo Oficial de Portfólio e Catálogo

- **Descrição:** oficializa a hierarquia de catálogo do Hub Plataforma como **Indústria → Portfólio → Categoria → Subcategoria → Produto** e define a **autorização operacional Hub ↔ Portfólio** como **regra separada**, que incide sobre Portfólios sem alterar a natureza deles. Fornecedor deixa de ser entidade de domínio e passa a legado/compatibilidade.
  - **Conceito-base:** **Portfólio é a unidade comercial de agrupamento de produtos da Indústria. A autorização de operação do Hub ocorre sobre Portfólios.** Portfólio **não é** um mecanismo de autorização — é um agrupamento comercial; a autorização é uma **relação operacional distinta**.
  - **Portfólio:** agrupamento comercial de produtos da Indústria (ex.: o grupo de produtos X compõe o Portfólio Y). Pertence à Indústria (escopo `organization_id`); só a Indústria cria, edita, ativa, inativa e exclui. Não é a camada "Catálogo" removida pela DEC-003.
  - **Hierarquia e classificação:** Produto **pertence a um Portfólio** (`produto.portfolio_id`); **Categoria e Subcategoria são classificação/tipificação** dos Produtos **dentro do Portfólio** (organizam, não autorizam). Produto pode estar classificado em Categoria/Subcategoria (opcional).
  - **Propriedade:** Portfólio, Categoria, Subcategoria e Produto **pertencem à Indústria** (coerente com DEC-011). O Hub **não possui** Portfólio.
  - **Autorização Hub ↔ Portfólio (regra separada):** relação operacional distinta do Portfólio, **N:N**, materializada por tabela própria (`hub_portfolios`, referenciando a tabela oficial `hubs`). Conceder/revogar é **exclusivo da Indústria (ADM/GES)** e **auditável** (DEC-011). O Portfólio **existe independentemente** de haver autorização; revogar **não apaga** Produtos nem Orçamentos emitidos.
  - **Granularidade por Portfólio (não por Produto):** característica **da regra de autorização** — por governança, estabilidade (Produtos novos em Portfólio autorizado ficam disponíveis sem reautorização), clareza operacional (espelha Carteira↔Hub da DEC-008) e performance/RLS. Não define a natureza do Portfólio.
  - **Operação do Hub:** o Hub **vê apenas** Produtos de Portfólios autorizados ao seu Hub e ativos; **utiliza** como consumo (montar Orçamento) e **não cria, não edita, não importa, não exclui** Produtos (DEC-011). O **Assistente herda** a autorização do seu Hub (`assistente → hub → hub_portfolios → portfolios → produtos`); sem autorização de catálogo por Assistente individual.
  - **Produto no Orçamento + congelamento (snapshot):** o Produto entra como item (`quote_items`) referenciando opcionalmente o Produto de origem (`product_id`, referência histórica). Só Produtos de Portfólios autorizados/ativos para o Hub do emissor. Os dados são **congelados na emissão** (snapshot **completo**: descrição, preço unitário, unidade, nome/SKU, composição, apresentação e `portfolio_id` de origem) e **não mudam** se o Produto for alterado depois. Hoje já há congelamento parcial (`quote_items.descricao`, `preco_unitario`, `subtotal`); esta DEC oficializa e completa.
  - **Fornecedor = legado:** `suppliers`, `supplier_categories`, `supplier_freight`, `freight_carriers` e `suppliers.hub_id` passam a **compatibilidade temporária**, sem evolução de domínio; **não são entidade oficial**. Remoção física **somente no Contract** (espelha DEC-001/002).
  - **Tabela de hub oficial:** `hubs` (DEC-008). `health_hubs` é **legado** — a autorização nunca o referencia; reconciliação `health_hubs → hubs` é trabalho de Migrate.
  - **Relação com DEC-003:** **complementa** a DEC-003 (acrescenta a camada Portfólio acima de Categoria); a DEC-003 **permanece vigente**. Portfólio **não é** o "Catálogo" removido.
  - **Nomenclatura oficial (futuras tabelas, em português):** `portfolios`, `categorias`, `subcategorias`, `hub_portfolios`; coluna `products.portfolio_id`.
  - **Faseamento (Expand → Migrate → Contract):**
    - **Expand (aditivo puro):** criar `portfolios`, `categorias`, `subcategorias`, `hub_portfolios`; adicionar `products.portfolio_id` e classificação oficial — tudo nullable/idempotente, sem tocar em dado existente.
    - **Migrate:** backfill do catálogo em Portfólios; popular `products.portfolio_id`/classificação; reconciliar `health_hubs → hubs` e converter `suppliers.hub_id` em `hub_portfolios` quando aplicável; ativar **RLS por Hub** sobre o catálogo; completar congelamento de `quote_items`; migrar telas de Produtos para o modelo Portfólio.
    - **Contract:** remover fisicamente `suppliers`, `supplier_categories`, `supplier_freight`, `freight_carriers`, `suppliers.hub_id` e `health_hubs`; remover telas/colunas de Fornecedor e caminhos de criação de Produto pelo Hub; tornar `products.portfolio_id` **NOT NULL**.
- **Motivo:** alinhar o catálogo à arquitetura oficial (DEC-003/006/011), oficializar **Portfólio como agrupamento comercial** da Indústria e estabelecer a **autorização operacional Hub↔Portfólio como regra separada**, substituindo Fornecedor (legado herdado do sistema antigo).
- **Impacto:** base oficial para o módulo de Catálogo/Portfólio, autorização Hub↔Portfólio, RLS por Hub e congelamento de Orçamento. Fornecedor e `health_hubs` viram legado até Contract. **Esta DEC não implementa nada** (sem banco/código/RLS/migration/tela/deploy). Exige atualização posterior de `DOMINIO.md`, `FUNCIONAL.md` e `PERMISSOES.md`. **Riscos principais:** convivência `hubs`×`health_hubs` (padronizar em `hubs`); duplicidade Categoria legado×oficial; introdução de RLS por Hub sobre base hoje só-Indústria (ativar só em Migrate, com testes); fidelidade de Orçamentos legados (garantida pelo snapshot); preservar o Hub real "Pharma1" nos testes; manter telas atuais funcionando durante Expand.
- **Data:** 28/06/2026
- **Status:** Aprovada / vigente

## DEC-013 — Relação Produto ↔ Portfólio (N:N) e lar do Preço

- **Descrição:** estabelece que a relação **Produto ↔ Portfólio é N:N** e define que o **preço comercial vive no vínculo Produto↔Portfólio**. **Emenda a DEC-012** nas cláusulas de cardinalidade (§136) e nomenclatura (§145): onde a DEC-012 dizia "Produto **pertence a um** Portfólio (`produto.portfolio_id`)", passa a valer **Produto ↔ Portfólio N:N**. As demais cláusulas da DEC-012 (Portfólio = agrupamento comercial; autorização Hub↔Portfólio como regra separada; Fornecedor e `health_hubs` legados; faseamento) **permanecem vigentes**. A DEC-012 segue **Aprovada / vigente**, emendada apenas nos pontos acima.
  - **Produto é único na Indústria:** identidade canônica única; **não se duplica** o Produto para colocá-lo em outro Portfólio.
  - **Cardinalidade N:N:** o mesmo Produto pode compor **vários Portfólios**; um Portfólio reúne **vários Produtos**. Materializada por tabela de vínculo própria (técnico futuro: `product_portfolios`) com **unicidade `(produto, portfólio)`** — um Portfólio **não duplica** o mesmo Produto.
  - **Classificação por vínculo:** Categoria e Subcategoria classificam o Produto **dentro de cada Portfólio**; portanto a classificação pertence ao **vínculo** (Produto×Portfólio), não ao Produto isolado. O mesmo Produto pode ter Categoria/Subcategoria diferentes em Portfólios diferentes.
  - **Lar do Preço (decisão central):** o **preço comercial** (preço unitário e valor da caixa) **vive no vínculo Produto↔Portfólio**, pois o Portfólio é a **unidade comercial** (DEC-012 §134). Durante a transição mantém-se **fallback** em `products.preco_unitario`/`products.valor_caixa`; o preço efetivo = **`COALESCE(vínculo, produto)`**. No **Contract**, o preço **autoritativo** é o do vínculo (o do Produto vira referência/seed ou é removido).
  - **Snapshot do Orçamento:** o item do Orçamento congela o preço **resolvido no contexto do Portfólio** na emissão (+ `portfolio_id` de origem), conforme DEC-012 §141. Revogar/alterar Portfólio ou preço **não muda** Orçamentos já emitidos.
  - **Autorização Hub↔Portfólio inalterada:** `hub_portfolios` continua N:N por Portfólio. Muda apenas o **critério de visibilidade do Produto pelo Hub**: o Hub vê o Produto se ele estiver em **algum Portfólio autorizado e ativo**, avaliado **pelo vínculo** (não por coluna única do Produto).
  - **Faseamento (Expand → Migrate → Contract):**
    - **Expand (aditivo puro):** criar o vínculo `product_portfolios` (produto, portfólio, categoria, subcategoria, preço unitário, valor da caixa, ativo; unicidade `(produto, portfólio)`) **sem remover** `products.portfolio_id`/classificação/preço.
    - **Migrate:** backfill 1→N (cada `products.portfolio_id` atual vira uma linha de vínculo, copiando preço e classificação); trocar a **RLS de `products`** para avaliar pelo vínculo; ajustar cadastro (seleção de **múltiplos** Portfólios), importação e orçamento.
    - **Contract:** remover de `products` as colunas `portfolio_id`, `categoria_id`, `subcategoria_id` e consolidar o preço **autoritativo** no vínculo.
- **Motivo:** a regra de negócio aprovada exige o **mesmo Produto em mais de um Portfólio sem duplicação**, e o preço precisa de **contexto comercial (Portfólio)** para não quebrar importação, orçamento e autorização por Hub. O modelo `portfolio_id` único da DEC-012 impede ambos.
- **Impacto:** base oficial para o vínculo N:N, preço por Portfólio (com fallback transitório via `COALESCE`), RLS por vínculo, importação para Portfólio e congelamento do Orçamento. **Esta DEC não implementa nada** (sem banco/código/RLS/migration/tela/deploy). Já refletida em `DOMINIO.md`; exige atualização posterior de `FUNCIONAL.md` e `PERMISSOES.md` quando o vínculo for implementado.
- **Riscos principais:** dupla fonte de preço durante a transição (mitigado por `COALESCE` e por tornar o vínculo autoritativo no Contract); migração da RLS de `products` de coluna única para o vínculo (ativar com testes, preservando o Hub real "Pharma1"); consistência do backfill 1→N; manter telas, importação e orçamento funcionando durante o Expand.
- **Data:** 2026-06-30
- **Status:** Aprovada / vigente

## DEC-014 — Descontinuação de Fornecedor (Supplier) como entidade de negócio

- **Descrição:** o conceito de **Fornecedor** (`suppliers` e todo o seu ecossistema) **deixa de ser entidade de negócio** do Hub Plataforma. Fazia sentido na arquitetura anterior, mas **não pertence ao modelo atual**. Esta DEC **torna terminal** o que a DEC-012 classificara como "Fornecedor = legado": Fornecedor não é mais legado tolerado — está **descontinuado** e **proibido** em qualquer regra ou funcionalidade nova. A cadeia oficial passa a ser, **sem Fornecedor**:
  - **`Indústria → Portfólios → Produtos → Hub → Clientes → Orçamentos → Pedidos`.**
  - **Proibições (efeito imediato):** não usar Fornecedor em nenhuma regra de negócio; não criar funcionalidade nova com Fornecedor; não usar `supplier_id` em consultas, filtros ou relacionamentos novos; não usar telas de Fornecedor como referência para novas implementações; não usar nomenclatura de fornecedor em importação, orçamento, produtos ou portfólios.
  - **Substituições conceituais:** o vínculo comercial do Produto e o **preço** passam pelo **Portfólio** (DEC-013, `product_portfolios`); a **visibilidade/autorização** passa por **Hub↔Portfólio** (`hub_portfolios`, DEC-012); o **Orçamento** deixa de ser "travado por Fornecedor" e passa a ser montado a partir dos **Produtos dos Portfólios autorizados ao Hub**.
  - **Não remover agora:** nenhuma remoção física (banco) ou visual (telas) neste momento. Toda dependência atual é **inventariada** abaixo para remoção no **Contract** (espelha o faseamento das DEC-001/002/012). Durante a transição, telas e colunas atuais continuam funcionando.
  - **Inventário de dependências de Fornecedor (para remoção no Contract):**
    - **Banco — tabelas a remover:** `suppliers` (`008_suppliers.sql`), `supplier_categories` (`009_supplier_categories.sql`), `supplier_freight` (`031_supplier_freight.sql`), `freight_carriers` (`034_freight_carriers.sql`).
    - **Banco — colunas a remover:** `products.supplier_id` e `products.category_id` (→ `supplier_categories`, legado, não confundir com `categoria_id` → `categorias`); `quotes.supplier_id`, `quotes.carrier_id`, `quotes.frete_regiao`; `suppliers.hub_id` (`053`); RPCs que copiam `supplier_id`/`carrier_id` (`044`, `051`).
    - **Rotas/telas a remover:** `app/(dashboard)/configuracoes/fornecedores/**` (lista, `[id]`, `importar`); entradas de Fornecedor em `configuracoes/page.tsx`.
    - **Componentes a remover:** todo `components/fornecedores/**` (`tabela-fornecedores`, `modal-novo-fornecedor`, `hub-selector`, `tabela-frete`, `gerenciar-categorias`, `form-importacao-produtos`).
    - **Acoplamento a refatorar ANTES do Contract (bloqueadores):** **Orçamento exige Fornecedor** — `orcamentos/actions.ts` (`supplier_id` obrigatório + `validarFornecedorItens`), `components/orcamentos/form-orcamento.tsx`, `orcamentos/novo` e `[id]/editar`, geração de PDF e detalhe; **Frete/Transportadora** enraizado em Fornecedor (precisa de novo lar — Indústria ou Hub); **Pedidos e Relatórios** filtram/agrupam por `quote.supplier_id` (`pedidos/page.tsx`, `relatorios/page.tsx`, filtros e exportações).
    - **Tipos:** `Supplier`, `SupplierCategory` e campos `supplier_id` em `Product`/`Quote` (`types/database.ts`).
- **Motivo:** alinhar a plataforma à arquitetura oficial vigente (DEC-011/012/013), na qual Indústria, Portfólio, Produto e Hub já cobrem propriedade, agrupamento comercial, preço e autorização — tornando Fornecedor redundante e fonte de ambiguidade. Encerra a herança do sistema antigo.
- **Impacto:** nenhuma mudança imediata de banco/código/tela/deploy — **esta DEC não remove nada**. Define a direção: novas implementações (incl. **importação para Portfólio**) **não** usam Fornecedor. A remoção física ocorre no **Contract**, após os bloqueadores (Orçamento e Frete) terem substituto. Exige atualização posterior de `DOMINIO.md`, `FUNCIONAL.md` e `PERMISSOES.md`.
- **Riscos principais:** o **Orçamento atualmente não funciona sem `supplier_id`** — remover antes de migrar a montagem para Portfólio/Hub quebraria o fluxo; **Frete/Transportadora** não tem lar fora de Fornecedor (definir antes do Contract); **Pedidos/Relatórios** perdem o eixo "por fornecedor" (definir novo eixo — Portfólio/Indústria); fidelidade de Orçamentos/Pedidos legados que gravaram `supplier_id` (preservar via snapshot, não apagar histórico).
- **Data:** 2026-06-30
- **Status:** Aprovada / vigente
