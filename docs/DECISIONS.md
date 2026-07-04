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

## DEC-015 — Sistema de Perfis, Funções e Permissões (RBAC)

- **Descrição:** refatora o modelo de usuários/permissões e passa a ser a **arquitetura oficial**. Separa definitivamente **Perfil** (papel estrutural, fixo) de **Permissões**, introduzindo uma camada intermediária de **Função (Role)**. **Emenda a DEC-011** na parte de papéis: consolida os perfis em **exatamente quatro**; `vendedor`, `atendimento` (já não era perfil), `suporte` (já removido) e `financeiro` **deixam de ser perfis**. As demais cláusulas da DEC-011 (propriedade Indústria×operação Hub, governança do Hub, auditoria) **permanecem vigentes**.
  - **Três camadas:** **Perfil** → **Função** → **Permissões**. A Permissão (módulo × ação) é atribuída à **Função**; o usuário recebe uma Função e **herda** as permissões. (Modelo padrão de ERPs/CRMs; escalável.)
  - **Perfis oficiais (fixos — nenhum novo sem nova DEC):**
    - **Administrador da Indústria** (`admin`): acesso total à plataforma da Indústria (usuários, gestores, produtos, portfólios, importação, hubs, autorizações, configurações, auditoria, relatórios).
    - **Gestor da Indústria** (`gestor`): operacional (produtos, portfólios, importação, autorizações, consulta de hubs, relatórios). **Sem** configurações críticas; **não** administra administradores.
    - **Proprietário do Hub** (`proprietario_hub`): controle **total do seu Hub** (equipe, clientes, carteiras, leads, WhatsApp, agenda, produtos [consulta], pedidos, orçamentos, financeiro futuro, integrações, configurações do Hub). **Nunca** altera Indústria, Produtos ou Portfólios da Indústria.
    - **Assistente** (`assistente`): **único** perfil operacional do Hub. Permissões **configuráveis via Função** definida pelo Proprietário. Substitui e elimina "Assistente de Venda", "Vendedor" e quaisquer outros perfis operacionais.
  - **Função (Role):** criada pelo **Proprietário do Hub**, escopo do **Hub** (`funcoes.hub_id`). Ex.: Comercial, Financeiro, Atendimento, Supervisor. Carrega o conjunto de **permissões** (`funcao_permissoes`: módulo × ação). Dois Assistentes podem ter Funções diferentes; o Perfil continua "Assistente".
  - **Permissões (módulo × ação):** módulos = `dashboard, clientes, leads, produtos, carteiras, whatsapp, agenda, pedidos, orcamentos, financeiro, equipe, configuracoes, relatorios, integracoes`; ações = `visualizar, criar, editar, excluir` (quando aplicável).
  - **Resolução de permissões:** `admin` e `proprietario_hub` → acesso **total** (não editável). `gestor` → **conjunto fixo** definido pela arquitetura (não editável). `assistente` → permissões da sua **Função**.
  - **Aplicação (1ª entrega):** permissões aplicadas em **menu + middleware/rotas + server actions**. A **RLS** do banco permanece por **Perfil + Hub** (como hoje). **RLS granular por módulo/ação fica para fase futura**, só se necessário (menor risco, preserva a segurança atual, valida o modelo antes de levar granularidade ao banco).
  - **Hub obrigatoriamente com Proprietário:** todo Hub **deve** ter um Proprietário. O fluxo de **Criar Hub** passa a exigir **selecionar ou criar um Proprietário** e vinculá-lo automaticamente; **não** é permitido salvar Hub sem Proprietário.
  - **Migração (aditiva, sem quebrar auth):** `vendedor → assistente`; `admin/gestor/proprietario_hub` inalterados. Assistentes existentes recebem uma **Função padrão por Hub** (ex.: "Comercial") com conjunto-base que **preserva o acesso atual** (ninguém perde acesso). Hoje não há usuários `financeiro/atendimento/suporte` (0 registros) — apenas regra no enum, sem migração de dados. Preservar usuários, relacionamentos e autenticação.
  - **Faseamento (Expand → Migrate → Contract):**
    - **Expand (aditivo puro):** criar `funcoes`, `funcao_permissoes`, `profiles.funcao_id`; RPC resolvedora `minhas_permissoes()`. Nada removido; comportamento atual preservado.
    - **Migrate:** `vendedor→assistente` + Função padrão; ligar menu/middleware/server-actions à resolução; refatorar tela de Usuários (drawer: dados/perfil/permissões/status) e nova tela de **Funções**; fluxo "Criar Hub com Proprietário obrigatório".
    - **Contract:** remover perfis legados do enum/código (`vendedor`, `atendimento`, `suporte`, `financeiro` como perfil) e limpezas finais.
- **Motivo:** simplificar perfis, eliminar redundância, separar Perfil de Permissões e tornar a autorização escalável (Função) — alinhando a papéis estáveis (Indústria×Hub) e reduzindo risco de manutenção conforme a base de usuários cresce.
- **Impacto:** base oficial de RBAC da plataforma. Todo desenvolvimento futuro segue este modelo; **nenhum novo perfil sem nova DEC**. Exige atualização de `DOMINIO.md`, `FUNCIONAL.md` e `PERMISSOES.md`. Enum `user_role` recebe (Expand) e perde (Contract) valores de forma faseada.
- **Riscos principais:** área de auth/permissões é a mais sensível (risco de lockout/exposição) — mitigado por faseamento, aplicação primeiro fora da RLS e smoke a cada fatia; migração de `vendedor` e atribuição de Função padrão sem perda de acesso; mudança de enum `user_role` (aditiva no Expand, remoção só no Contract); "Criar Hub" passa a exigir Proprietário (validar fluxos existentes de criação de Hub).
- **Data:** 2026-06-30
- **Status:** Aprovada / vigente

## DEC-016 — Fronteira de governança: Indústria governa o Hub, Proprietário opera o Hub

- **Descrição:** **emenda a DEC-015** fixando a separação entre **governança** (Indústria) e **operação** (Hub). A **Indústria não administra a equipe operacional do Hub**.
  - **Administrador da Indústria** — governa: cria Hub; edita dados administrativos do Hub; define/troca Proprietário; ativa/desativa Hub; autoriza/remove Portfólios; visualiza Hubs. **Não**: cria Assistentes; gerencia equipe interna do Hub; distribui clientes/carteiras; opera a rotina comercial do Hub.
  - **Proprietário do Hub** — opera o **seu** Hub com **todas** as permissões: cria/convida/edita/desativa Assistentes; cria Funções/Roles; atribui Função aos Assistentes; configura permissões da Função; gerencia clientes, carteiras, distribuição, WhatsApp, produtos, orçamentos, pré-pedidos e demais módulos. Todo Hub tem obrigatoriamente um Proprietário (invariante DEC-015).
  - **Assistente** — criado/convidado **somente pelo Proprietário**; pertence a um Hub; recebe uma Função e herda as permissões; não administra o Hub salvo o que a Função permitir.
  - **Ajustes:** (1) Criar Hub obriga Proprietário — selecionar existente **ou** criar novo; não salva sem. (2) Tela de Usuários da Indústria mostra **apenas** usuários da Indústria e Proprietários de Hub — **não** cria/edita Assistentes. (3) Tela de equipe do Hub (`/hub/assistentes`) é exclusiva do Proprietário — criar/convidar Assistentes, atribuir Função, ativar/desativar. (4) RBAC: Indústria acessa a área da Indústria; Proprietário e Assistente a área do Hub (Assistente conforme Função); a Indústria **não** opera a equipe interna do Hub. (5) Auditoria: registrar criação de Hub, definição/alteração de Proprietário, criação de Assistente, alteração de Função e desativação de usuário.
- **Motivo:** evitar mistura entre gestão da Indústria e gestão operacional do Hub; a Indústria **governa** o Hub, o Proprietário **opera** o Hub.
- **Impacto:** move a gestão de Assistentes/Funções para o Proprietário; a tela de Usuários da Indústria deixa de listar/criar Assistentes. Não altera enum/RLS; aplicação em telas + gates + auditoria.
- **Data:** 2026-07-01
- **Status:** Aprovada / vigente

## DEC-017 — Governança de Clientes e Carteiras: Indústria governa a base, Hub opera

- **Descrição:** estende DEC-008 (Carteiras) e DEC-016 (governança). A **Indústria detém e organiza a base** (Clientes + Carteiras); o **Hub apenas opera** o que lhe foi autorizado. Distingue dois conceitos que **nunca** se confundem:
  - **Carteira (Indústria)** — organização comercial **oficial** da base de clientes (ex.: "Região Campinas"). Pertence à Indústria.
  - **Responsável operacional (Hub)** — quem, **dentro do Hub**, atende aquele cliente (ex.: Assistente Ana). Não altera a Carteira do cliente.
  - **Indústria pode:** cadastrar cliente manual; importar clientes por planilha; criar/editar Carteira; definir/mover cliente entre Carteiras; vincular Carteira ao Hub; visualizar qual Hub opera cada Carteira.
  - **Hub NÃO:** cria a carteira-mãe da Indústria; importa a base geral; move cliente entre Carteiras globais da Indústria.
  - **Proprietário do Hub (operação):** vê clientes das Carteiras autorizadas; **distribui clientes entre Assistentes** (define responsável operacional); acompanha atendimento; opera WhatsApp/orçamentos/pré-pedidos.
  - **Assistente:** acessa clientes/carteiras conforme a sua Função (DEC-015).
- **Ajustes:** (1) módulo Indústria "Clientes e Carteiras" (listar/cadastrar/importar clientes, criar/editar Carteira, mover cliente de Carteira, vincular Carteira↔Hub, ver Hub operante); (2) no Hub, exibir só clientes/carteiras autorizados; distribuição de **responsável operacional** (novo — por cliente, distinto de `carteiras.responsavel_id`); (3) import + cadastro manual + troca de Carteira **apenas na Indústria** (página + server actions com gate admin/gestor); (4) middleware/RBAC bloqueia essas ações ao Hub; (5) auditoria de importação, criação, edição e troca de Carteira.
- **Motivo:** separar a **governança da base** (Indústria) da **operação** (Hub); impedir que o Hub altere a base oficial; não confundir Carteira com responsável operacional.
- **Impacto:** gating de import/cadastro/troca-de-Carteira para a Indústria; introdução do **responsável operacional por cliente** no Hub (distribuição); consolidação da visão Indústria "Clientes e Carteiras". Aplicação em telas + gates + auditoria (sem alterar a natureza de `carteiras`).
- **Data:** 2026-07-01
- **Status:** Aprovada / vigente

## DEC-018 — Receita no Orçamento: aba com carregamento sob demanda + arquivo no Storage

- **Descrição:** introduz a **Receita** como parte do detalhe do Orçamento, sob a diretriz de **performance por carga sob demanda**. A Receita é o registro que reúne o **modelo/rascunho** gerado a partir do orçamento **e** a **receita assinada** anexada. Novo `quote_receitas` em relação **1:N** com `quotes` (permite reenvio/versões). Decisões fixadas:
  - **Aba sob demanda:** o detalhe do Orçamento passa a ter abas; a aba **Receita** só **monta e busca dados quando aberta** — nada de receita/anexo/histórico/pagamento é carregado no load inicial. A aba "Orçamento" mantém o conteúdo atual **inalterado**.
  - **Fluxo (`status_fluxo`):** `rascunho → modelo_gerado → enviada → recebida → validada | rejeitada`. Ações **separadas**: gerar modelo (a partir dos itens), editar texto, salvar rascunho, anexar assinada, validar/rejeitar, marcar enviada.
  - **Arquivo no Storage:** a receita assinada vai para o bucket **privado** `orcamento-receitas` (dado sensível); o banco guarda **apenas metadados** (`arquivo_path`, `arquivo_nome`, `arquivo_tipo`, `arquivo_tamanho`, `enviado_em`). Acesso somente via **service role + signed URL** (sem leitura pública).
  - **Sem acoplamentos:** PDF continua **só por ação do usuário** (intocado); **nenhum** envio automático de WhatsApp; sem `select('*')` novo; **legado `leads`/`suppliers` intocado**.
  - **Índices mínimos:** `quote_receitas(quote_id | status_fluxo | criado_em)` e, de brinde para a listagem, `quotes(status)` e `quotes(criado_em)`.
- **Ajustes:** (1) migration `056_orcamento_receitas.sql` (tabela + índices + RLS `get_organization_id()` + bucket privado); (2) server actions dedicadas por ação (`actions-receita.ts`); (3) wrapper de abas + componente da aba Receita (lazy); (4) troca mínima no `page.tsx` do detalhe (sem alterar a query pesada existente — refatoração da tela fica para depois); (5) tipos `QuoteReceita`/`ReceitaStatusFluxo`.
- **Motivo:** habilitar a Receita sem penalizar a abertura do orçamento (carga essencial primeiro; o resto sob demanda) e sem refatorar a tela inteira agora; manter dado sensível fora do banco e sob acesso restrito.
- **Impacto:** aditivo puro (nova tabela/bucket/índices); nenhuma mudança em `quotes`/`quote_items` nem no legado. Aplicação no detalhe do Orçamento (abas) + Storage + RLS. A refatoração completa do detalhe (server queries por aba, histórico paginado, pagamento) permanece como trabalho futuro sob os mesmos requisitos.
- **Data:** 2026-07-01
- **Status:** Aprovada / vigente

## DEC-019 — Conferência Operacional de Receita (pré-análise por IA + motor de regras + revisão humana)

Estende a **DEC-018** (Receita no Orçamento). Define como o Hub confere, de forma **operacional** (nunca jurídica), a receita assinada enviada pelo cliente, com apoio de **IA apenas para extração/explicação** e um **motor de regras interno** que aponta pendências e calcula um **score**. A aprovação final é **sempre humana**.

**Pipeline canônico (aprovado):** Receita → **OCR/leitura do documento** → **IA extrai dados estruturados** (e explica inconsistências) → **motor de regras interno** compara com o checklist → **sistema gera score (0–100) e alertas** → **humano aprova ou reprova operacionalmente**. A **IA NÃO é o agente principal de decisão**: apenas **extrai** e **explica**. Quem define **pendência, aprovação operacional ou bloqueio** é o **motor de regras do sistema + usuário autorizado**.

### 1. Objetivo
Dar ao operador (Proprietário/Assistente do Hub) uma **pré-análise automática** da receita anexada ao orçamento que aponte **campos ausentes, divergências e ilegibilidade**, acelerando a decisão — **sem** substituir o julgamento humano e **sem** emitir validação jurídica ou clínica. A ferramenta apenas indica: **sem pendências aparentes**, **pendências encontradas**, **ilegível**, **divergente do orçamento** ou **precisa de revisão humana**. A conclusão do fluxo é **"aprovada operacionalmente por usuário"**. **Proibido** o termo "validada pela IA"; a UI usa **"pré-análise concluída"**, **"sem pendências aparentes"**, **"pendências encontradas"** e **"aprovada operacionalmente por usuário"**.

### 2. Escopo
- **Inclui:** cadastro de checklists/regras (por Indústria → Portfólio → Produto); upload da receita assinada (Storage privado, DEC-018); **extração** dos dados da receita por IA; **explicação** textual da IA; **motor de regras interno** (determinístico) que gera pendências, divergências e **score de conferência**; histórico versionado de conferências; decisão humana (aprovar operacionalmente / rejeitar / marcar para revisão); auditoria completa.
- **Não inclui (fora de escopo, explícito):** validação **jurídica** ou **clínica** da receita; aprovação automática pela IA; dispensação/logística; assinatura digital certificada. A IA **não decide** status — apenas extrai e explica.
- **Formatos variados:** PDF e imagens (JPG/PNG/WEBP). Leitura em **duas etapas desacopladas** — **OCR/leitura** do documento e **extração estruturada por IA** — ambas atrás de uma **abstração de provedor** (§8), nada fixo em Claude.
- **Checklist por Indústria/Portfólio/Produto** (não apenas por tipo de documento) — resolução "mais específico vence" (§3).

### 3. Modelagem
Três planos separados: **(a) regras/checklist** (cadastro), **(b) extração da IA + análise do motor de regras** (sugestão, somente leitura para decisão), **(c) decisão humana** (aprovação operacional). A IA escreve só em (b.extração); o motor de regras escreve (b.análise); a aprovação vive em (c).
- **`receita_checklists`** — `id, organization_id, nome, escopo ('industria'|'portfolio'|'produto'), industria_id?, portfolio_id?, produto_id?, tipo_documento, ativo, versao, criado_por, criado_em, atualizado_em`. Resolução **mais específica vence** (produto > portfólio > indústria).
- **`receita_checklist_itens`** — `id, checklist_id, chave, rotulo, obrigatorio, tipo_regra ('presenca'|'formato'|'comparacao_orcamento'|'valor_esperado'), config_json (regex/tolerâncias/valores), peso (int), severidade ('info'|'aviso'|'critico'), ordem`.
- **`quote_receitas`** (estender DEC-018) — `+ checklist_id?`, `+ status_analise_ia?`, `+ score_ultima_conferencia?`; `status_fluxo` ganha `em_conferencia` e `aprovada_operacionalmente`. `validada_por/validada_em/validacao_comentario` (já existem) = **decisão humana**.
- **`receita_conferencias`** (append-only; N por receita = **histórico de versões**) — `id, organization_id, quote_receita_id, quote_id, checklist_id, checklist_versao, provedor_ocr, provedor_ia, modelo_ia, prompt_versao, texto_ocr?, extracao_json (jsonb), explicacao_ia (text), status_analise, score (0..100), confianca_extracao (0..1), tokens_entrada, tokens_saida, custo_estimado, criado_por, criado_em`.
- **`receita_conferencia_pendencias`** — `id, conferencia_id, origem ('regra'|'extracao'), chave, motivo (enum normalizado — ver abaixo), tipo ('campo_ausente'|'divergencia'|'formato_invalido'|'ilegivel'|'suspeita'), severidade, mensagem, esperado, encontrado`.
- **`receita_modelos`** — receitas-modelo/exemplos **por produto** para melhorar extração e comparação: `id, organization_id, produto_id (FK), nome, arquivo_path (bucket privado), campos_referencia_json (gabarito esperado: doses válidas, layout, campos), observacoes, ativo, criado_por, criado_em`. Servem de referência ao checklist e como *few-shot* opcional do extrator.
- **Motivos normalizados (`motivo`)** — enum de reprovação/pendência: `crm_ausente`, `crm_uf_ausente`, `assinatura_ausente`, `paciente_ausente`, `cpf_ausente_obrigatorio`, `produto_divergente`, `concentracao_divergente`, `quantidade_divergente`, `posologia_ausente`, `data_ausente`, `receita_vencida`, `documento_ilegivel`, `outro`. Usado em pendências e no comentário de reprovação humana (relatórios/auditoria consistentes).
- **Índices:** `receita_conferencias(quote_receita_id|quote_id|status_analise|criado_em)`, `receita_conferencia_pendencias(conferencia_id|severidade)`, `receita_checklist_itens(checklist_id)`, checklists por (`industria_id`/`portfolio_id`/`produto_id`). **RLS** por `organization_id` (`get_organization_id()`). Arquivo no bucket privado `orcamento-receitas` (DEC-018) — banco só metadados. Migration prevista: `057_receita_conferencia.sql`.

### 4. Fluxo operacional
`recebida` → **[Rodar pré-análise]** (ação explícita) → IA **extrai** dados + **explica** → **motor de regras** aplica o checklist resolvido, gera **pendências** e **score**, define `status_analise` → `status_fluxo='em_conferencia'` → painel lado a lado (extração × orçamento, lista de pendências, selo da IA, score) → **revisor humano** decide: **Aprovar operacionalmente** (`aprovada_operacionalmente`) · **Rejeitar** (`rejeitada`) · **Marcar p/ revisão** (`precisa_revisao_humana`). Reexecutável (novo anexo/checklist) preservando histórico. Tudo dentro da aba Receita (carregamento sob demanda, DEC-018).

### 5. Status (dois eixos separados)
- **Operacional — `status_fluxo`:** `rascunho → modelo_gerado → enviada → recebida → em_conferencia → aprovada_operacionalmente | rejeitada | precisa_revisao_humana`.
- **Pré-análise — `status_analise`** (resultado do **motor de regras**, rótulo exibido; **nunca** aprova): `sem_pendencias_aparentes` ("sem pendências aparentes") · `pendencias_encontradas` ("pendências encontradas") · `ilegivel` · `divergente_do_orcamento` · `precisa_de_revisao_humana`. A UI sinaliza **"pré-análise concluída"** ao término da execução; a conclusão do fluxo é **"aprovada operacionalmente por usuário"**. **Nunca** "validada pela IA".
- **Três planos, sempre separados:** (a) **extração da IA** (`extracao_json` + explicação, sem decisão), (b) **resultado do motor de regras** (pendências + `motivo` + `score` + `status_analise`), (c) **decisão humana** (`aprovada_operacionalmente`/`rejeitada`, com `validada_por`).
- **Score de conferência (0..100):** calculado pelo **motor de regras** a partir dos itens do checklist (peso × severidade). Faixas mapeiam para `status_analise` (ex.: pendência **crítica** ou baixa confiança de extração → `precisa_de_revisao_humana`; divergência de item/concentração/quantidade/paciente → `divergente_do_orcamento`). **Nenhuma faixa aprova** — sempre requer humano.

### 6. Regras de negócio
1. **IA só extrai e explica.** Quem aponta pendências/score/status é o **motor de regras determinístico** (código), não a IA — isso torna a decisão auditável e independente de provedor.
2. **IA nunca aprova**, jurídica ou operacionalmente. Não há caminho de código onde saída de IA escreve `aprovada_operacionalmente`.
3. **Aprovação = usuário autorizado** (permissão RBAC nova, ver §7). Constraint: `status_fluxo='aprovada_operacionalmente'` ⇒ `validada_por IS NOT NULL`.
4. **Ilegível/baixa confiança de extração** → força `precisa_de_revisao_humana` e bloqueia atalhos.
5. **Comparação com o orçamento:** paciente, itens, quantidades e apresentação (tolerância no checklist).
6. **Vínculo com pipeline (configurável):** se algum item do orçamento tem `products.exige_receita`, `transformarEmPedido` **pode exigir** receita `aprovada_operacionalmente` (regra ligável por Hub/organização).
7. **Auditoria obrigatória:** cada execução de IA e cada decisão humana em `audit_logs` + histórico técnico em `receita_conferencias`.

### 7. Permissões (RBAC — DEC-015)
- **Nova permissão de módulo `receita`** com ações: `conferir` (rodar pré-análise), `aprovar` (aprovar operacionalmente/rejeitar), `configurar_checklist` (CRUD de regras).
- **Cadastro de checklists** por escopo: Indústria (admin/gestor) define regras por Indústria/Portfólio; Proprietário do Hub pode ajustar as de Produto conforme governança (DEC-016/017). **Assistente** confere e (se a Função permitir) aprova; sem permissão, o botão "Aprovar operacionalmente" não aparece. RLS por `organization_id` + escopo por Hub.

### 8. Arquitetura de extração (OCR + IA) — provider-agnostic
- **Etapas desacopladas atrás de abstrações:** (1) `LeitorDocumento` (OCR/leitura) → texto/coordenadas; (2) `ExtratorReceita` (entrada: texto/arquivo + contexto do checklist/orçamento; saída: `extracao_json` + `explicacao` + `confianca`); (3) **motor de regras** (função pura). Nada fixo em Claude.
- **Provedores plugáveis** — `provedor_ocr` e `provedor_ia`: `claude` | `openai` | `gemini` | `ocr_externo` | `motor_local` (futuro). Implementação **inicial: Anthropic Claude** (`@anthropic-ai/sdk`, `claude-opus-4-8`, entrada multimodal `document`/`image`, **structured output** `output_config.format json_schema strict`, sem `temperature`), podendo combinar um OCR externo antes da IA. `provedor_ocr`, `provedor_ia`, `modelo_ia`, `prompt_versao` gravados por conferência → **troca/mistura de provedores sem migração**.
- **Fronteira dura:** OCR e IA devolvem **apenas** texto/dados extraídos + explicação + confiança — **nunca** decidem. O **motor de regras** (função pura, testável) recebe `extracao_json` + checklist (+ `receita_modelos` de referência) + orçamento e produz **pendências (com `motivo` normalizado), divergências, `score` (0–100) e `status_analise`**. Trocar de provedor não muda a lógica de decisão.
- **Segurança/observabilidade:** chaves por provedor em env (local + Vercel); disparo só sob ação do usuário; tokens/custo por provedor registrados; dado sensível de saúde em bucket privado + signed URL.

### 9. Checklist inicial para Tirzepatida (exemplo de referência)
Escopo **produto** (mais específico). Itens (chave · obrigatório · severidade · tipo):
- `nome_paciente` · sim · crítico · presença
- `prescritor_nome` · sim · crítico · presença
- `crm_uf` · sim · crítico · formato (`CRM \d+/[A-Z]{2}`) → motivo `crm_ausente`/`crm_uf_ausente`
- `cpf_paciente` · condicional · aviso · presença (obrigatório quando a regra exigir) → motivo `cpf_ausente_obrigatorio`
- `data_emissao` · sim · aviso · formato data + validade (config: ≤ 90 dias)
- `medicamento` · sim · crítico · comparação_orçamento (nome bate com item do orçamento)
- `concentracao_dose` · sim · crítico · valor_esperado (ex.: 2,5/5/7,5/10/12,5/15 mg — config)
- `quantidade` · sim · crítico · comparação_orçamento (qtd × tolerância)
- `posologia` · sim · aviso · presença
- `via_administracao` · não · info · valor_esperado (subcutânea)
- `assinatura` · sim · crítico · presença (assinatura/carimbo detectável)
- `legibilidade` · sim · crítico · ilegível (se confiança de extração < limiar → pendência crítica)
> Observação de negócio (não jurídica): produtos injetáveis/uso contínuo tendem a exigir mais rigor de conferência; a severidade/pesos são parametrizáveis no checklist.

### 10. Riscos e decisões pendentes
- **Risco — dado sensível (saúde):** definir política de **retenção** do `extracao_json` (ex.: minimizar campos, expurgo por prazo); bucket privado obrigatório.
- **Risco — leitura como "aprovação":** UI/textos devem deixar claro que é **pré-análise operacional**, nunca validação.
- **Risco — custo/latência da IA:** só sob ação; observabilidade de tokens; avaliar modelo mais barato para extração se necessário (decisão registrada em `modelo_ia`).
- **Risco — schema drift:** migration `057` aplicada via SQL Editor no HUB DEV (CLI linkado a projeto incorreto).
- **Pendente — bloqueio de `transformarEmPedido`:** obrigatório vs. configurável por Hub (proposto: configurável, default ligado quando `exige_receita`).
- **Pendente — eixo principal do checklist:** confirmar Indústria→Portfólio→Produto com "mais específico vence" (proposto) vs. herança/merge de regras.
- **Pendente — limiares de score/confiança** e mapeamento exato faixa→`status_analise` (a calibrar com casos reais).
- **Pendente — provedor de IA** de longo prazo (Anthropic inicial; interface já isola a troca).

- **Ajustes (implementação — Sprint futura, faseada Expand→Migrate):** migration `057_receita_conferencia.sql` (checklists hierárquicos, itens, `receita_conferencias` com `provedor_ocr`/`provedor_ia`, `receita_conferencia_pendencias` com `motivo` normalizado, `receita_modelos`, colunas em `quote_receitas`, índices, RLS, constraint de aprovação); abstrações `LeitorDocumento` (OCR) + `ExtratorReceita` (IA) com **provedores plugáveis** (Claude inicial; OpenAI/Gemini/OCR externo/motor local futuros); **motor de regras** (função pura → pendências + `motivo` + score + `status_analise`); server actions separadas (`rodarPreAnalise`, `aprovarReceitaOperacionalmente`, `rejeitar`, `marcarRevisao`, CRUD de checklist e de `receita_modelos`); UI da conferência (3 planos: extração IA · resultado do motor · decisão humana); permissão RBAC `receita:conferir`/`receita:aprovar`/`receita:configurar_checklist`; gate opcional em `transformarEmPedido` quando `products.exige_receita`; chaves de provedores nas envs.
- **Motivo:** conferência operacional rápida e auditável, com IA restrita a **extração/explicação** e decisão **determinística (motor de regras) + humana** — reduzindo risco jurídico e dependência de provedor, com pipeline OCR→IA→motor→humano.
- **Impacto:** aditivo (novas tabelas/permissão/env); estende DEC-018; possível gate opcional em `transformarEmPedido`. Nada implementado nesta DEC.
- **Realinhamento MVP-first (2026-07-02):** a execução foca no **MVP** — Upload → Extração → **Motor de Regras** → **Diagnóstico da Receita** → **Conferência humana**. **Central de Conferência, filas, SLA, múltiplos operadores, prioridade, produtividade e dashboards ficam para fase pós-MVP** (nada removido; DEC-019 permanece vigente na íntegra como norte). O resultado apresentado ao assistente chama-se **"Diagnóstico da Receita"**. Ordem do MVP e itens adiados detalhados em [`SPRINTS.md`](SPRINTS.md) → "Realinhamento MVP-first — DEC-019". O motor de regras (Sprint 2) segue sendo o coração; a IA apenas o alimenta, sem alterar regras.
- **Emenda — Conferência INDEPENDENTE do orçamento no MVP (2026-07-02):** o módulo de Conferência de Receita, **neste MVP**, é **independente do orçamento**. Fluxo: **Menu "Conferência de Receita" → upload da receita → selecionar produto → pré-análise → resultado (sem pendências aparentes | pendências encontradas) + orientação → decisão humana**. **NÃO** compara com orçamento, **NÃO** calcula cobertura documental do pedido, **NÃO** bloqueia pedido, **NÃO** cria Central. A conferência verifica a **receita como documento**, considerando o **produto selecionado** (paciente, prescritor, CRM/UF, assinatura, data, medicamento, concentração, quantidade, posologia, **limite máximo por receita se o produto tiver essa regra**, legibilidade). Consequências arquiteturais: **estrutura própria, limpa e simplificada (SEM Event Sourcing no MVP)** — três tabelas: `conferencias_receita` (tabela principal com `status_atual`, `status_processamento`, `resultado_analise` escritos direto pela aplicação, para leitura simples da UI), `conferencia_receita_pendencias` (detalhe das pendências do motor) e `historico_decisoes_conferencia_receita` (**auditoria IMUTÁVEL — append-only** apenas das **decisões humanas**: `aprovada`/`reprovada`/`devolvida_para_correcao`, com usuário `NOT NULL`, data/hora e observação). Sem trigger de projeção, sem log de eventos, sem payload. As tabelas acopladas `quote_receitas`/`receita_conferencias` **não** são usadas neste MVP e ficam para o fluxo acoplado futuro. Storage reusa o bucket privado com prefixo `conferencia/`; **Diagnóstico simplificado para documental-only** (sem bloco comercial); motor ganha regra `limite_maximo`; `medicamento`/`concentração` via `valor_esperado` contra o produto. IA continua só extraindo; motor cuida de pendências/score/diagnóstico; **decisão sempre humana** (status de decisão exige `decidido_por`; histórico exige usuário; a IA nunca decide). **Event Sourcing avaliado e adiado**: agrega valor marginal no MVP (baixo volume, workflow único) e pode entrar de forma aditiva numa versão futura sobre esta base, já que as decisões nascem em histórico append-only. **Metadados de validação por produto (migration 061 — catálogo único):** os valores das regras (medicamento/concentração/via) e o limite máximo **não** ficam hardcoded no checklist. Em vez de N tabelas específicas, há **um catálogo keyed** `product_validation_metadata` (colunas `chave`, `tipo` ∈ lista/numero/texto, `valores`/`valor_num`/`valor_texto`, `ativo`; `chave` e `tipo` restritos por CHECK; UNIQUE(product_id, chave); RLS por organização). Chaves iniciais: `medicamento_aliases`, `concentracoes_permitidas`, `vias_permitidas`, `limite_maximo_por_receita`. A regra do checklist declara `origemValores: "<chave>"` e a **composição (server action)** hidrata `config.valores` (tipo lista; para medicamento inclui `product.nome` implícito) ou `config.limiteMaximo` (tipo numero) via helper puro `hidratarChecklistComMetadadosProduto` **antes** de chamar o motor. O **motor permanece puro e agnóstico** (só executa contra `config.valores`/`config.limiteMaximo`; não conhece o catálogo). Novo metadado = nova **chave/linha (dado)**, sem alterar seed, checklist ou código (nova *categoria* de metadado adiciona uma `chave` ao CHECK — mudança mínima). Escolha registrada: **Opção B disciplinada** (catálogo único com guarda-corpos) sobre N tabelas específicas. O fluxo **acoplado ao orçamento** (comparação/cobertura/bloqueio) permanece como evolução pós-MVP.
- **Data:** 2026-07-02
- **Status:** Aprovada / vigente — implementação pendente (Sprint futura). Revisada em 2026-07-02 (pipeline OCR→IA→motor→humano; provedor de IA genérico; motivos normalizados; receitas-modelo; separação extração/motor/humano; terminologia). Realinhada em 2026-07-02 (MVP-first; "Diagnóstico da Receita"; Central e correlatos adiados).

---

## DEC-020 — Cadastro de Clientes (Pré-cadastro do Hub → Aprovação da Indústria)

Define o novo módulo **Cadastro de Clientes**: o Hub (Proprietário ou Assistente) realiza o **pré-cadastro** de um cliente/profissional (dados + documentos) e o **envia para a Indústria**, que é a **única** autorizada a **aprovar, reprovar ou solicitar correção**. O Hub **nunca** decide o status final. Após a aprovação, o pré-cadastro pode ser **convertido** em Cliente ativo (`contacts`), mantendo vínculo de auditoria com o pré-cadastro original — que **nunca é excluído**.

Coerente com DEC-011/016/017 (Indústria **governa**/possui a base; Hub **opera**) e DEC-015 (RBAC por Perfil + Função). **Não cria** perfil novo: "Usuário da Indústria" = perfis `admin`/`gestor` (acesso total); usuários do Hub = `proprietario_hub`/`assistente`.

### 1. Fluxo de status (eixo único)
`rascunho → enviado → em_analise → correcao_solicitada → aprovado | reprovado`.
- **Hub:** cria, edita rascunho, anexa documentos, **Salvar Rascunho**, **Enviar para Indústria**, **reenviar** após correção. Escopo: só os cadastros do próprio Hub.
- **Indústria:** visualiza os cadastros a ela destinados, baixa documentos, **Solicitar Correção** (observação obrigatória), **Aprovar**, **Reprovar** (motivo obrigatório), **Converter em Cliente**.

### 2. Fronteira de governança
Hub cria/envia/corrige; Indústria decide. As transições de decisão (aprovar/reprovar/solicitar correção) e a conversão são **exclusivas de `admin`/`gestor`** e implementadas em **RPCs `SECURITY DEFINER`** (authz no banco), não por RLS de UPDATE aberto ao Hub. **`aprovar`/`reprovar` NÃO são permissões concedíveis a Função de Hub** — pertencem à Indústria por Perfil.

### 3. Modelo de dados (aditivo — migration `064`)
- **`hub_client_onboarding`** — `id, hub_id (→hubs), industry_id (= organization_id da Indústria dona do Hub), tipo_pessoa ('fisica'|'juridica'), status, nome_completo, razao_social, nome_fantasia, registro_conselho, cpf, cnpj, data_nascimento, email, endereco_completo, cep, telefones (jsonb), observacao_correcao, motivo_reprovacao, criado_por, enviado_em, aprovado_por_industria_id, aprovado_em, reprovado_em, converted_contact_id (→contacts, vínculo de auditoria), created_at, updated_at`.
- **`hub_client_onboarding_files`** — `id, onboarding_id (CASCADE), hub_id, tipo_documento, nome_arquivo, storage_path, mime_type, tamanho, uploaded_by, created_at`. Tipos: `comprovante_endereco, contrato_social, alvara_funcionamento, alvara_vigilancia_sanitaria, crm_frente, crm_verso`.
- **`hub_client_onboarding_events`** — histórico/linha do tempo **append-only** (trigger bloqueia UPDATE/DELETE): `id, onboarding_id, tipo_evento, ator_id, observacao, metadata (jsonb), created_at`.
- **`notifications`** — central genérica in-app: `id, user_id, organization_id, tipo, titulo, mensagem, link, lida, entidade_tipo, entidade_id, created_at`. RLS: `user_id = auth.uid()`.
- **Documentos obrigatórios** — PF: `comprovante_endereco, crm_frente, crm_verso`. PJ: os de PF + `contrato_social, alvara_funcionamento, alvara_vigilancia_sanitaria`.

### 4. Storage e RLS
- Bucket **privado** `client-onboarding-docs` (`public:false`, sem policy pública). Upload/leitura via **service role**; visualização por **signed URL** (TTL curto). Nenhum arquivo público.
- **RLS:** Hub vê/edita `hub_id = get_hub_id()`; Indústria vê `industry_id = get_organization_id()`. Novo helper `get_hub_id()` (espelha `get_organization_id()`).

### 5. RBAC (DEC-015)
- **Proprietário do Hub e Assistente** operam o Cadastro de Clientes **por padrão** — ambos fazem o pré-cadastro, então o item é **padrão do Hub, sem gate por Função** (perfis `proprietario_hub`+`assistente`). A autorização fina (escopo por Hub, transições) vive nas RPCs `SECURITY DEFINER`. A Indústria (`admin`/`gestor`) vê a área própria. `aprovar`/`reprovar`/`converter` são **exclusivos da Indústria** por Perfil (RPC), nunca concedíveis a Função de Hub.

### 6. Sub-entregas
- **Notificações:** central in-app (tabela `notifications` + sino no header) para os eventos enviado/correção/reapresentado/aprovado/reprovado.
- **Envio por e-mail à Indústria (Fase 2):** complementar ao fluxo interno (nunca substitui). Exige provedor de e-mail (não há no projeto hoje). Fica documentado; o evento `email_enviado` já é previsto no histórico.

### 7. Interface e nomenclatura
Segue o padrão visual do sistema; formulário amplo (~60–70% da largura) com abas **Pessoa Física / Pessoa Jurídica**, barra de progresso, área dedicada de documentos e linha do tempo. **Proibido "Stin Pharma" em qualquer tela** — termos neutros (Cadastro de Clientes, Pré-cadastro, Documentação Cadastral, Enviar para Indústria, Em análise pela Indústria, Correção solicitada, Aprovado/Reprovado pela Indústria).

- **Rotas:** Hub — `/hub/cadastro-clientes`, `/novo`, `/[id]`. Indústria — `/configuracoes/cadastro-clientes`, `/[id]`.
- **Motivo:** dar ao Hub uma forma padronizada e auditável de pré-cadastrar clientes e submetê-los à Indústria, preservando a fronteira propriedade (Indústria) × operação (Hub) e a decisão exclusiva da Indústria.
- **Impacto:** aditivo puro (novas tabelas/bucket/RPCs/telas + módulo RBAC `cadastro_clientes` + central de notificações). Não altera enum de perfis nem tabelas existentes; a conversão apenas **insere** em `contacts`. Migration `064_hub_client_onboarding.sql` aplicada via SQL Editor no HUB DEV (`pnkgwfgjhijksfmofiot`).
- **Data:** 2026-07-03
- **Status:** Aprovada / vigente — em implementação (Sprint Cadastro de Clientes, Expand). E-mail à Indústria em Fase 2.
