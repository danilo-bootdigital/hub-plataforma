# DOMÍNIO OFICIAL — Hub Plataforma

> Documento oficial de **domínio de negócio** da Plataforma. Não trata de banco de dados, código ou arquitetura técnica.
> Subordinado à Constituição ([`ARQUITETURA_OFICIAL.md`](ARQUITETURA_OFICIAL.md)); coerente com [`DECISIONS.md`](DECISIONS.md) (DEC-006 e **DEC-011**). **Não cria nem altera nenhuma DEC.**
> Referência oficial de domínio para evolução funcional.

## Convenções

- **Nome oficial** é sempre o termo de negócio; nomes técnicos (ex.: `contacts`, `organizations`) aparecem só como nota de reconciliação.
- **Cliente** = entidade oficial; "Contato"/`contacts` é referência técnica (D1).
- **Indústria** = entidade oficial; "Organização"/`organizations` é a implementação técnica multiempresa (D2).
- **Classificação:** *Núcleo (DEC-006)* · *Apoio*. **Situação:** *Implementada* · *Planejada*.

## Hierarquia oficial (DEC-011)

```
Indústria → Representante (empresa) → Hub → Proprietário do Hub → Assistentes
```

A **Indústria** é dona dos dados (Clientes, Produtos, Categorias, Subcategorias, Carteiras) e **cria/governa** Hubs e Carteiras. O **Representante** é a empresa parceira que contém o **Hub** operacional. O **Hub** apenas **opera** as Carteiras autorizadas pela Indústria.

---

## Indústria  ·  *Núcleo (DEC-006)*

- **Nome oficial:** Indústria
- **Objetivo:** empresa-indústria que opera a Plataforma; contexto raiz e **dona** de todos os dados.
- **Responsabilidade:** conter/isolar os dados; criar e governar Hubs e Carteiras; possuir Clientes/Produtos/Catálogo.
- **Quem cria:** provisionamento da Plataforma.
- **Quem utiliza:** todas as entidades (escopo `indústria`).
- **Relacionamentos:** raiz; autoriza Representantes/Hubs; possui Carteiras, Clientes, Produtos.
- **Ciclo de vida:** criada no provisionamento; ativa enquanto opera.
- **Observações:** implementação técnica = `organizations` (D2). Situação: Implementada.

## Representante  ·  *Apoio*

- **Nome oficial:** Representante
- **Objetivo:** **empresa parceira** da Indústria que opera comercialmente por meio de um Hub.
- **Responsabilidade:** conduzir a operação comercial autorizada, através do seu Hub.
- **Quem cria:** Indústria.
- **Quem utiliza:** estrutura comercial; contém o Hub.
- **Relacionamentos:** pertence à Indústria; **contém um Hub** operacional.
- **Ciclo de vida:** cadastrado pela Indústria; ativo enquanto for parceiro.
- **Observações:** **NÃO é substituído** pelo Assistente de Venda; é entidade de negócio (empresa). Situação: Planejada (estrutura própria).

## Hub  ·  *Núcleo (DEC-006)*

- **Nome oficial:** Hub
- **Objetivo:** unidade operacional, dentro de um Representante, que opera Carteiras autorizadas.
- **Responsabilidade:** executar a operação comercial das Carteiras liberadas pela Indústria.
- **Quem cria:** **Indústria** (o Hub não se cria — DEC-011).
- **Quem edita / muda estado:** Indústria (ATIVO/INATIVO/SUSPENSO/BLOQUEADO).
- **Quem exclui:** Indústria/Administrador (inativação preferencial).
- **Quem visualiza:** Indústria; usuários do próprio Hub.
- **Quando nasce:** quando a Indústria o cadastra.
- **Quando deixa de existir:** inativação (histórico preservado).
- **Relacionamentos:** pertence a um Representante; opera Carteiras autorizadas; contém Proprietário do Hub e Assistentes.
- **Ciclo de vida:** ATIVO ↔ INATIVO/SUSPENSO/BLOQUEADO (DEC-011).
- **Observações:** não confundir com legado `health_hubs`. Situação: Implementada.

## Proprietário do Hub  ·  *Apoio*

- **Nome oficial:** Proprietário do Hub
- **Objetivo:** responsável máximo pela operação do seu Hub.
- **Responsabilidade:** gerir Assistentes, instâncias de WhatsApp, modo das Carteiras, distribuição e concessões.
- **Quem cria:** Indústria/Administrador (ao designar o Proprietário do Hub).
- **Quem utiliza:** operação do Hub.
- **Relacionamentos:** papel de um Usuário no Hub; gerencia Assistentes; pode ser Responsável de Carteira.
- **Ciclo de vida:** designado → ativo enquanto liderar o Hub.
- **Observações:** papel operacional do Hub (DEC-011). Situação: Planejada.

## Assistente de Venda  ·  *Apoio*

- **Nome oficial:** Assistente de Venda
- **Objetivo:** usuário operacional do Hub que faz a venda acontecer.
- **Responsabilidade:** criar Atendimentos/Orçamentos e conduzir suas vendas.
- **Quem cria:** Proprietário do Hub.
- **Quem utiliza:** operação diária do Hub.
- **Relacionamentos:** papel de um Usuário no Hub; pode compor uma Equipe; pode ser Responsável de Carteira; recebe concessões.
- **Ciclo de vida:** cadastrado pelo Proprietário → ativo → desativado.
- **Observações:** **não substitui o Representante** (DEC-011). Técnico: `vendedor` é compat até Contract → `assistente`. Situação: Planejada.

## Equipe  ·  *Apoio*

- **Nome oficial:** Equipe
- **Objetivo:** organização interna **opcional** de Assistentes dentro do Hub.
- **Responsabilidade:** agrupar Assistentes para gestão interna.
- **Quem cria:** Proprietário do Hub.
- **Quem utiliza:** gestão interna do Hub.
- **Relacionamentos:** agrupa Assistentes; pertence ao Hub; **não é exigida pela Carteira**.
- **Ciclo de vida:** criada/ajustada/dissolvida pelo Hub.
- **Observações:** opcional (DEC-011); escopo `equipe`. Situação: Planejada.

## Usuário  ·  *Apoio*

- **Nome oficial:** Usuário
- **Objetivo:** pessoa que acessa e opera a Plataforma.
- **Responsabilidade:** executar ações conforme seu papel e escopo.
- **Quem cria:** Administrador (Indústria) ou Proprietário do Hub (Assistentes).
- **Quem utiliza:** toda a operação.
- **Relacionamentos:** pertence à Indústria; assume papéis (administrador/gestor/financeiro/proprietario_hub/assistente).
- **Ciclo de vida:** criado → ativo → inativado.
- **Observações:** técnico `profiles`/autenticação. Situação: Implementada.

## Carteira  ·  *Núcleo (DEC-006)*

- **Nome oficial:** Carteira
- **Objetivo:** agrupamento de Clientes, **propriedade da Indústria**, autorizado a um Hub.
- **Responsabilidade:** organizar a relação comercial de um conjunto de Clientes.
- **Quem cria:** **Indústria** (o Hub nunca cria Carteiras — DEC-011).
- **Quem edita / autoriza Hub:** Indústria (define e altera o Hub autorizado).
- **Quem exclui:** Indústria/Administrador.
- **Quem visualiza:** Indústria; Hub autorizado (operação).
- **Quando nasce:** quando a Indústria a cria.
- **Quando deixa de existir:** inativação pela Indústria.
- **Relacionamentos:** pertence à Indústria; autorizada a **um Hub** (DEC-008); agrupa Clientes; possui **Responsável da Carteira** (usuário do Hub) e **modo** OPEN/DISTRIBUTED.
- **Ciclo de vida:** Ativa ↔ Inativa; Hub autorizado pode ser alterado pela Indústria.
- **Observações:** o **Responsável da Carteira** (Proprietário ou Assistente designado) é para gestão/indicadores/SLA/auditoria e **não altera a propriedade** (sempre da Indústria) — DEC-011.

## Cliente  ·  *Núcleo (DEC-006)*

- **Nome oficial:** Cliente
- **Objetivo:** parte com quem a Indústria mantém relação comercial.
- **Responsabilidade:** destinatário das ações comerciais.
- **Quem cria:** **Indústria** (a partir de Solicitação aprovada).
- **Quem edita:** Indústria; Hub autorizado conforme operação.
- **Quem exclui:** Administrador (inativação preferencial).
- **Quem visualiza:** Indústria; Hub autorizado, conforme o modo da Carteira.
- **Quando nasce:** quando uma Solicitação de Novo Cliente é aprovada pela Indústria.
- **Quando deixa de existir:** inativação (histórico preservado).
- **Relacionamentos:** **pertence à Indústria**; integra uma Carteira; origina Atendimentos/Orçamentos/Pedidos.
- **Ciclo de vida:** Solicitação aprovada → Cliente → histórico comercial.
- **Observações:** referência técnica = "Contato"/`contacts` (D1). **Cliente é da Indústria**, operado pelo Hub. Situação: Implementada.

## Solicitação de Novo Cliente  ·  *Núcleo (DEC-006)*

- **Nome oficial:** Solicitação de Novo Cliente
- **Objetivo:** ponto de entrada do funil.
- **Responsabilidade:** capturar interesse antes de virar Cliente.
- **Quem cria:** operação (Hub) ou Indústria.
- **Quem aprova:** **Indústria**.
- **Quem exclui:** Administrador (ou descarte lógico).
- **Quem visualiza:** Indústria; Hub que captou.
- **Quando nasce:** ao registrar novo interesse.
- **Quando deixa de existir:** aprovada (vira Cliente) ou descartada.
- **Relacionamentos:** origina o Cliente (da Indústria); antecede o Atendimento Comercial.
- **Ciclo de vida:** Recebida → Em análise → Aprovada/Descartada.
- **Observações:** substitui o legado **Lead** (DEC-001); `leads` compat até Contract. Situação: Planejada.

## Atendimento Comercial  ·  *Núcleo (DEC-006)*

- **Nome oficial:** Atendimento Comercial
- **Objetivo:** negociação/relacionamento comercial em andamento.
- **Responsabilidade:** evoluir o negócio pelas etapas do Pipeline.
- **Quem cria:** Assistente de Venda (operação do Hub).
- **Quem edita:** Assistente responsável; Proprietário do Hub.
- **Quem exclui:** encerramento lógico (ganho/perdido).
- **Quem visualiza:** conforme modo da Carteira e concessões; Proprietário do Hub vê todos.
- **Quando nasce:** após Cliente disponível na Carteira operada.
- **Quando deixa de existir:** fechado (ganho) ou perdido.
- **Relacionamentos:** vinculado a Cliente; estruturado por Pipeline; gera Orçamentos/Pedidos.
- **Ciclo de vida:** Aberto → etapas → Fechado/Perdido.
- **Observações:** substitui o legado **Deal** (DEC-002); `deals` compat até Contract. Situação: Planejada.

## Pipeline  ·  *Núcleo (DEC-006)*

- **Nome oficial:** Pipeline
- **Objetivo:** definir as etapas do Atendimento Comercial.
- **Responsabilidade:** padronizar o fluxo (etapas/ordem).
- **Quem cria:** Indústria/Gestor.
- **Quem edita:** Gestor.
- **Quem exclui:** Administrador.
- **Quem visualiza:** Indústria e Hubs.
- **Quando nasce:** na configuração comercial.
- **Quando deixa de existir:** substituição/inativação.
- **Relacionamentos:** estrutura Atendimentos Comerciais.
- **Ciclo de vida:** configurado → ajustado/reordenado.
- **Observações:** inclui etapas especiais (fechado/perdido). Situação: Implementada.

## Orçamento  ·  *Núcleo (DEC-006)*

- **Nome oficial:** Orçamento
- **Objetivo:** proposta comercial de Produtos/valores.
- **Responsabilidade:** formalizar a oferta antes do Pedido.
- **Quem cria:** Assistente de Venda.
- **Quem edita:** Assistente (próprios); Proprietário do Hub (todos, ou por concessão).
- **Quem exclui:** Administrador (rascunhos).
- **Quem visualiza:** conforme modo/concessões; Proprietário do Hub e Indústria.
- **Quando nasce:** dentro de um Atendimento Comercial.
- **Quando deixa de existir:** recusado, expirado ou convertido em Pré-pedido.
- **Relacionamentos:** vinculado a Cliente/Atendimento; composto por Produtos; gera Pré-pedido.
- **Ciclo de vida:** Rascunho → aprovação interna → enviado → aprovado/recusado pelo Cliente.
- **Observações:** Situação: Implementada.

## Pré-pedido  ·  *Núcleo (DEC-006)*

- **Nome oficial:** Pré-pedido
- **Objetivo:** etapa entre Orçamento aprovado e Pedido.
- **Responsabilidade:** consolidar/validar itens antes do Pedido.
- **Quem cria:** operação do Hub (a partir do Orçamento aprovado).
- **Quem edita / aprova:** Gestor (Indústria) aprova.
- **Quem exclui:** Administrador (ou cancelamento).
- **Quem visualiza:** Hub operador, Gestor, Financeiro.
- **Quando nasce:** quando o Orçamento é aprovado pelo Cliente.
- **Quando deixa de existir:** convertido em Pedido ou cancelado.
- **Relacionamentos:** deriva de Orçamento; antecede Pedido.
- **Ciclo de vida:** Gerado → Validado → Convertido/Cancelado.
- **Observações:** Situação: Planejada.

## Pedido  ·  *Núcleo (DEC-006)*

- **Nome oficial:** Pedido
- **Objetivo:** compromisso de compra formalizado.
- **Responsabilidade:** registrar a venda e conduzir a execução até a entrega.
- **Quem cria:** operação do Hub (a partir do Pré-pedido).
- **Quem edita:** Gestor (comercial), Financeiro (etapa financeira), logística (execução).
- **Quem exclui:** Administrador (cancelamento).
- **Quem visualiza:** Hub operador, Gestor, Financeiro.
- **Quando nasce:** na conversão do Pré-pedido.
- **Quando deixa de existir:** concluído ou cancelado (histórico mantido).
- **Relacionamentos:** vinculado a Cliente; composto por Produtos; envolve Transportadora; passa pelo Financeiro.
- **Ciclo de vida:** Pendente → Em produção → Pronto → Enviado → Entregue → Concluído/Cancelado.
- **Observações:** Situação: Implementada.

## Produto  ·  *Núcleo (DEC-006)*

- **Nome oficial:** Produto
- **Objetivo:** item comercializável, **propriedade da Indústria**.
- **Responsabilidade:** unidade de oferta em Orçamentos/Pedidos.
- **Quem cria:** **Indústria** (cadastro).
- **Quem edita / ativa-desativa:** Indústria.
- **Quem exclui:** Administrador (inativação preferencial).
- **Quem visualiza:** Indústria e Hubs (catálogo).
- **Quando nasce:** no cadastro de catálogo.
- **Quando deixa de existir:** inativação.
- **Relacionamentos:** classificado por Categoria → Subcategoria; pode ter Fornecedor.
- **Ciclo de vida:** cadastrado → ativo/inativo.
- **Observações:** **pertence à Indústria** (DEC-011); árvore Indústria → Categorias → Subcategorias → Produtos (DEC-003). Situação: Implementada.

## Categoria  ·  *Núcleo (DEC-006)*

- **Nome oficial:** Categoria
- **Objetivo:** 1º nível de classificação do catálogo.
- **Responsabilidade:** agrupar Produtos.
- **Quem cria:** **Indústria** (cadastro).
- **Quem edita:** Indústria.
- **Quem exclui:** Administrador.
- **Quem visualiza:** Indústria e Hubs.
- **Quando nasce:** na organização do catálogo.
- **Quando deixa de existir:** inativação sem Produtos.
- **Relacionamentos:** pertence à Indústria; contém Subcategorias.
- **Ciclo de vida:** criada/ajustada pela Indústria.
- **Observações:** **pertence à Indústria** (DEC-011); não confundir com `supplier_categories`. Situação: Planejada.

## Subcategoria  ·  *Núcleo (DEC-006)*

- **Nome oficial:** Subcategoria
- **Objetivo:** 2º nível de classificação, dentro de uma Categoria.
- **Responsabilidade:** detalhar o agrupamento de Produtos.
- **Quem cria:** **Indústria** (cadastro).
- **Quem edita:** Indústria.
- **Quem exclui:** Administrador.
- **Quem visualiza:** Indústria e Hubs.
- **Quando nasce:** na organização do catálogo.
- **Quando deixa de existir:** inativação sem Produtos.
- **Relacionamentos:** pertence a uma Categoria; agrupa Produtos.
- **Ciclo de vida:** criada/ajustada pela Indústria.
- **Observações:** **pertence à Indústria** (DEC-011). Situação: Planejada.

## Fornecedor  ·  *Apoio*

- **Nome oficial:** Fornecedor
- **Objetivo:** parte que fornece Produtos/insumos à Indústria.
- **Responsabilidade:** prover Produtos e condições de fornecimento.
- **Quem cria:** Indústria (cadastro).
- **Quem edita:** Indústria.
- **Quem exclui:** Administrador.
- **Quem visualiza:** Indústria.
- **Quando nasce:** no cadastro de fornecimento.
- **Quando deixa de existir:** inativação.
- **Relacionamentos:** associado a Produtos; pode ter Transportadoras.
- **Ciclo de vida:** cadastrado → ativo.
- **Observações:** apoio; técnico `suppliers`. Situação: Implementada.

## Transportadora  ·  *Apoio*

- **Nome oficial:** Transportadora
- **Objetivo:** responsável pelo transporte/entrega de Pedidos.
- **Responsabilidade:** executar frete e logística.
- **Quem cria:** Indústria (cadastro).
- **Quem edita:** Indústria.
- **Quem exclui:** Administrador.
- **Quem visualiza:** Indústria, logística, Financeiro.
- **Quando nasce:** no cadastro logístico.
- **Quando deixa de existir:** inativação.
- **Relacionamentos:** vinculada a Fornecedor/Pedido; regiões/valores de frete.
- **Ciclo de vida:** cadastrada → ativa.
- **Observações:** apoio; técnico `freight_carriers`. Situação: Implementada.

---

## Diagrama textual de relacionamentos

```
Indústria  (dona dos dados; implementação técnica: Organização)
├── Representante (empresa parceira)
│   └── Hub  (estados: ATIVO/INATIVO/SUSPENSO/BLOQUEADO)
│       ├── Proprietário do Hub
│       │   └── Assistente de Venda
│       │       └── Equipe (agrupamento interno opcional)
│       └── opera → Carteiras autorizadas
├── Carteira  (propriedade da Indústria; autorizada a um Hub; modo OPEN/DISTRIBUTED; Responsável = usuário do Hub)
│   └── Cliente  (propriedade da Indústria; técnico: Contato)
│       ├── Solicitação de Novo Cliente   (aprovada pela Indústria — substitui Lead)
│       └── Atendimento Comercial          (substitui Deal; estruturado pelo Pipeline)
│           └── Orçamento
│               └── Pré-pedido
│                   └── Pedido             (entrega via Transportadora)
├── Catálogo de Produtos (da Indústria)
│   └── Categoria
│       └── Subcategoria
│           └── Produto
├── Pipeline  (define as etapas do Atendimento Comercial)
└── Suprimentos
    └── Fornecedor
        ├── Produto (fornecimento)
        └── Transportadora (frete/entrega)
```

> Propriedade × operação (DEC-011): **Indústria possui** Clientes, Produtos, Categorias, Subcategorias e Carteiras; **cria e governa** Hubs e Carteiras. O **Hub opera** as Carteiras autorizadas (modo OPEN/DISTRIBUTED) — **não é proprietário**. Entidades *Planejadas* ainda não têm estrutura própria implementada.

---

## Documentos relacionados

- [`ARQUITETURA_OFICIAL.md`](ARQUITETURA_OFICIAL.md) — Constituição (entidades §5, isolamento §8).
- [`DECISIONS.md`](DECISIONS.md) — DEC-001, DEC-002, DEC-003, DEC-006, DEC-008, **DEC-011**.
- [`FUNCIONAL.md`](FUNCIONAL.md) — papéis, permissões, estados e fluxo operacional.
