# FUNCIONAL — Hub Plataforma

> Modelo **funcional** (de negócio) da Plataforma. Não trata de banco, código, telas, APIs ou arquitetura técnica.
> Subordinado à Constituição ([`ARQUITETURA_OFICIAL.md`](ARQUITETURA_OFICIAL.md)); usa as entidades de [`DOMINIO.md`](DOMINIO.md) e as decisões de [`DECISIONS.md`](DECISIONS.md) (em especial **DEC-011** e **DEC-012**).
> As **definições de negócio** das entidades vivem em `DOMINIO.md` (fonte única); aqui modela-se **acesso, ciclo de vida operacional, estados, permissões e eventos**.

---

## Capítulo 1 — Perfis, papéis e escopos (DEC-011)

**Conceitos:** *Perfil* (negócio) · *Papel* (token técnico) · *Escopo* (abrangência).

### Bloco Indústria (dona dos dados)
| Perfil | Papel | Escopo | Função |
|---|---|---|---|
| **Administrador** | `administrador` | `indústria` | usuários, configurações, governança e ciclo de vida do Hub |
| **Gestor** | `gestor` | `indústria` | catálogo, Clientes, Carteiras, autorização de Hub, aprova Solicitação/Pré-pedido, regras comerciais |
| **Financeiro** | `financeiro` | `indústria` | etapa financeira dos Pedidos |

### Bloco Hub (operador autorizado)
| Perfil | Papel | Escopo | Função |
|---|---|---|---|
| **Proprietário do Hub** | `proprietario_hub` | `hub` | **papel exclusivamente gerencial**: visualiza/edita qualquer Orçamento, **assume qualquer Atendimento**, redistribui Clientes/Atendimentos, concede permissões e intervém operacionalmente. **Não há aprovação hierárquica de Orçamentos do Assistente.** |
| **Assistente de Venda** | `assistente` | `próprio` (ampliável) | **operador comercial do atendimento**: cria/edita/**finaliza e envia (Emite)** os próprios Orçamentos, acompanha o retorno do Cliente, **converte** o Orçamento aceito em Pré-pedido e acompanha até o Pedido |

- **Escopos:** `plataforma` (reservado/futuro) · `indústria` · `hub` · `equipe` (opcional) · `próprio`.
- **"Atendimento" não é perfil** — é função atribuída por **permissão**. **Suporte removido** do modelo.
- **Representante** é entidade de negócio (empresa parceira) — **não é perfil de usuário** (ver `DOMINIO.md`).

---

## Capítulo 2 — Acesso e ciclo de vida por entidade

> Definição de negócio completa em `DOMINIO.md`. Aqui: quem cria/edita/exclui/visualiza + observações de acesso. Legenda de propriedade: **(I)** dado da Indústria · **(H)** dado operacional do Hub.

| Entidade | Cria | Edita | Exclui | Visualiza | Obs. |
|---|---|---|---|---|---|
| Indústria | Provisionamento | Administrador | — | Todos (escopo próprio) | tenant raiz |
| Representante (empresa) **(I)** | Indústria | Administrador/Gestor | Administrador | Indústria | contém o Hub |
| Hub **(I)** | **Indústria** | Indústria (estados) | Administrador | Indústria; usuários do Hub | estados ATIVO/INATIVO/SUSPENSO/BLOQUEADO |
| Proprietário do Hub | Administrador (Indústria) | Administrador | Administrador | Indústria; Hub | papel do Hub |
| Assistente de Venda | **Proprietário do Hub** | Proprietário do Hub | Proprietário do Hub | Proprietário do Hub; próprio | papel do Hub |
| Equipe **(H)** | Proprietário do Hub | Proprietário do Hub | Proprietário do Hub | Hub | opcional |
| Usuário | Administrador / Proprietário (Assistentes) | idem | Administrador | Administrador, Gestor | técnico `profiles` |
| Carteira **(I)** | **Indústria** | Indústria (autoriza/altera Hub) | Administrador | Indústria; Hub autorizado | modo OPEN/DISTRIBUTED; Responsável (Hub) |
| Cliente **(I)** | **Indústria** | Indústria; Hub (operação) | Administrador | Indústria; Hub conforme modo | pertence à Indústria |
| Solicitação de Novo Cliente | Hub/Indústria | criador enquanto em análise | Administrador | Indústria; Hub captador | **aprovada pela Indústria** |
| Atendimento Comercial **(H)** | Assistente | Assistente; Proprietário | encerramento lógico | conforme modo/concessões; Proprietário vê todos | substitui Deal |
| Orçamento **(H)** | Assistente | Assistente (próprio, **Emite o próprio**); Proprietário (qualquer) | Administrador (rascunho) | conforme modo/concessões | sem aprovação interna; aprovação comercial é do Cliente; **somente leitura após conversão** |
| Pré-pedido **(H)** | Assistente (**converte**) | Assistente; Proprietário (qualquer) | Administrador | Hub, Gestor, Financeiro | conversão pelo Assistente; acompanha até o Pedido |
| Pedido **(H)** | Hub | Gestor (comercial), Financeiro (financeiro) | Administrador (cancelar) | Hub, Gestor, Financeiro | — |
| Pipeline **(I)** | Indústria/Gestor | Gestor | Administrador | Indústria, Hubs | etapas |
| Portfólio **(I)** | **Indústria** | Indústria | Administrador | Indústria; Hub (autorizados) | agrupamento comercial (DEC-012) |
| Autorização Hub↔Portfólio **(I)** | **Indústria** (concede) | Indústria (revoga) | Indústria (revoga) | Indústria; Hub (efeito) | regra operacional separada; por Portfólio; Assistente herda (DEC-012) |
| Produto **(I)** | **Indústria** | Indústria | Administrador | Indústria; Hub (Portfólios autorizados) | pertence à Indústria e a um Portfólio (DEC-012); Hub só utiliza |
| Categoria / Subcategoria **(I)** | **Indústria** | Indústria | Administrador | Indústria, Hubs | classificação dentro do Portfólio (DEC-012) |
| Fornecedor / Transportadora | Indústria | Indústria | Administrador | Indústria, logística, Financeiro | **legado/compat até Contract** (DEC-012) |

---

## Capítulo 3 — Fluxo operacional completo

```
Solicitação de Novo Cliente → Cliente → Carteira → Hub autorizado → Responsável da Carteira →
Atendimento Comercial → Orçamento → Pré-pedido → Pedido → Financeiro → Concluído
```

| Etapa | Objetivo | Responsável | Entradas | Saídas | Validações | Eventos | Dependências |
|---|---|---|---|---|---|---|---|
| Solicitação | Captar interesse | Hub/Indústria | Dados de contato | Solicitação registrada | Dados mínimos | Solicitação recebida | — |
| Cliente | Oficializar (da Indústria) | **Indústria** | Solicitação aprovada | Cliente ativo | Aprovação da Indústria | Cliente criado | Solicitação aprovada |
| Carteira | Posicionar Cliente | **Indústria** | Cliente | Cliente em Carteira | Carteira ativa | Cliente vinculado à Carteira | Cliente |
| Hub autorizado | Liberar operação | **Indústria** | Carteira | Carteira autorizada a um Hub | Hub ATIVO | Carteira liberada ao Hub | Carteira; Hub |
| Responsável da Carteira | Definir responsável operacional | **Proprietário do Hub** | Carteira autorizada + modo | Responsável definido | Usuário do Hub | Responsável definido | Hub autorizado |
| Atendimento Comercial | Negociar | Assistente | Cliente + Pipeline | Atendimento em andamento | Pipeline configurado | Atendimento aberto/avançado | Cliente; Pipeline |
| Orçamento | Ofertar | Assistente | Atendimento + Produtos | Orçamento emitido/enviado | **Emissão (Finalizar e Enviar) pelo Assistente**; aprovação é do Cliente | Orçamento criado/emitido/enviado/recusado | Atendimento; Produtos |
| Pré-pedido | Consolidar | Assistente | Orçamento aceito pelo Cliente | Pré-pedido → Pedido | Conversão pelo Assistente | Pré-pedido gerado/convertido | Orçamento aceito |
| Pedido | Formalizar venda | Hub/Gestor | Pré-pedido | Pedido criado | Pré-pedido convertido | Pedido criado/aprovado | Pré-pedido |
| Financeiro | Faturar/baixar | Financeiro | Pedido | Pedido faturado/quitado | Regras financeiras | Financeiro atualizado | Pedido |
| Concluído | Encerrar | Hub/logística | Pedido entregue + financeiro ok | Pedido concluído | Entrega + financeiro | Pedido concluído | Financeiro; entrega |

---

## Capítulo 4 — Máquinas de estado

### 4.1 Hub (DEC-011)
- **Estados:** ATIVO ↔ INATIVO · ATIVO ↔ SUSPENSO · ATIVO/qualquer → BLOQUEADO
- **Gerido por:** Indústria.
- **Significado:** ATIVO (opera) · INATIVO (não opera, decisão administrativa) · SUSPENSO (interrupção temporária — contrato/inadimplência/pausa) · BLOQUEADO (segurança/decisão administrativa).
- **Proibidas:** operar com Hub não-ATIVO.
- **Auditorias:** toda mudança de estado (autor = Indústria).

### 4.2 Carteira — modo de operação (DEC-011)
- **Modos:** `OPEN` (todos os Assistentes autorizados trabalham os Clientes) · `DISTRIBUTED` (Clientes/Atendimentos distribuídos a Assistentes específicos).
- **Definido por:** Proprietário do Hub, por Carteira.
- **Estado de vida:** Ativa ↔ Inativa (pela Indústria); Hub autorizado pode ser alterado pela Indústria.
- **Auditorias:** autorização/alteração de Hub (Indústria); definição de modo, distribuição/redistribuição e Responsável (Hub).

### 4.3 Solicitação de Novo Cliente
- **Estados:** Recebida → Em análise → **Aprovada** (gera Cliente) | Descartada · **aprovação = Indústria**.
- **Proibidas:** Descartada/Aprovada → outro estado.

### 4.4 Atendimento Comercial
- **Estados:** Aberto → Primeiro Contato → Diagnóstico → Proposta Enviada → Negociação → **Fechado (ganho)** | **Perdido**.
- **Proibidas:** pular para Fechado sem Proposta; reabrir Perdido.

### 4.5 Orçamento
- **Estados:** Rascunho → **Emitido (Finalizado e Enviado ao Cliente)** → **Aceito pelo Cliente** | **Recusado pelo Cliente**.
- **Recusado:** o **mesmo** Orçamento volta à edição pelo Assistente → **Emite novamente** → novo envio (**NÃO** se cria outro Orçamento).
- **Aceito:** o **Assistente converte** em Pré-pedido.
- **Imutabilidade (regra obrigatória):** após a conversão, o Orçamento fica **SOMENTE LEITURA**. Para alterar: **cancelar o Pré-pedido → reabrir o Orçamento → editar → emitir novamente → converter novamente**.
- **Proibidas:** editar Orçamento já convertido; criar novo Orçamento na recusa (reusa o mesmo).

### 4.6 Pré-pedido
- **Estados:** Gerado (**pelo Assistente, por conversão**) → Validado → **Convertido em Pedido** | Cancelado.
- **Cancelar:** **reabre o Orçamento** de origem (volta a editável).
- **Obs.:** conversão é operação do Assistente; o Proprietário do Hub pode intervir/editar.

### 4.7 Pedido
- **Estados:** Pendente → Em produção → Pronto → Enviado → Entregue → **Concluído** | Cancelado.

### 4.8 Cadastros (Cliente / Portfólio / Produto / Categoria / Subcategoria / Pipeline / Usuário)
- **Estados:** Ativo ↔ Inativo (preferir inativar a excluir).
- **Catálogo (DEC-012):** árvore **Indústria → Portfólio → Categoria → Subcategoria → Produto**. Portfólio é **agrupamento comercial**; a **autorização Hub↔Portfólio** é regra operacional separada (Indústria concede/revoga; auditável; por Portfólio; Assistente herda do Hub). O **Hub não cria/edita/importa/exclui** Produtos — apenas visualiza/utiliza os de Portfólios autorizados. **Fornecedor** é legado/compat até Contract.

---

## Capítulo 5 — Matriz de permissões (DEC-011)

> **C**=cria · **A**=altera · **Ap**=aprova · **V**=visualiza · **E**=exclui · **Au**=audita. "próprio"=apenas seus registros. (—)=sem acesso.

| Entidade | Administrador | Gestor | Financeiro | Proprietário do Hub | Assistente |
|---|---|---|---|---|---|
| Hub (ciclo de vida/estados) | C,A,E,V,Au | V | — | V (próprio Hub) | — |
| Representante (empresa) | C,A,E,V | A,V | — | — | — |
| Carteira (criação/autorização) | C,A,E,V,Au | C,A,V | — | V (autorizadas) | V (conforme modo) |
| Modo da Carteira / distribuição | V,Au | V | — | **A** (define modo, distribui) | V |
| Responsável da Carteira | V,Au | V | — | **A** (designa) | V (se designado) |
| Cliente | A,E,V,Au | C,A,V | V | V (operação) | V (conforme modo) |
| Solicitação de Novo Cliente | E,V,Au | **Ap**,V | — | V | C,A (próprio) |
| Atendimento Comercial | V,Au | V | — | V (todos do Hub) | C,A,V (próprio) |
| Orçamento | V,Au | V | V | A,V (qualquer do Hub) | C,A,V,**Emite** (próprio; só leitura após conversão) |
| Pré-pedido | V,Au | V | V | A,V (qualquer do Hub) | C,A,V,**converte** (próprio) |
| Pedido | E,V,Au | Ap,A,V | A(financeiro),V | **A**,V (qualquer do Hub) | C,V (próprio) |
| Portfólio | E,V,Au | C,A,V | — | V (autorizados) | V (autorizados) |
| Autorização Hub↔Portfólio | C,A(revoga),V,Au | C,A(revoga),V | — | V (próprio Hub) | V (efeito) |
| Produto / Categoria / Subcategoria | E,V,Au | C,A,V | V | V (Portfólios autorizados) | V (Portfólios autorizados) |
| Pipeline | E,V,Au | C,A,V | — | V | V |
| Fornecedor / Transportadora *(legado, DEC-012)* | E,V,Au | C,A,V | V | — | — |
| Usuário (Indústria) | C,A,E,V,Au | V | — | — | — |
| Assistente (usuário do Hub) | V,Au | — | — | **C,A,E,V** | V (próprio) |

### Concessões ao Assistente (ampliam o padrão; explícitas, auditáveis, revogáveis)
Ver/editar **todos os Orçamentos** do Hub · ver/editar **todos os Pedidos** do Hub · acessar **Atendimentos de outros** Assistentes · **redistribuir** atendimentos · acessar **relatórios** do Hub. Concedidas pelo **Proprietário do Hub**, válidas apenas no **próprio Hub**.

---

## Capítulo 6 — Catálogo de eventos

| Evento | Origem | Destino | Consequências | Notificações | Integrações futuras |
|---|---|---|---|---|---|
| Hub cadastrado | Indústria | Hub | Hub disponível (ATIVO) | Proprietário do Hub | — |
| Hub ativado/inativado/suspenso/bloqueado | Indústria | Hub | Habilita/interrompe operação | Hub | — |
| Carteira criada | Indústria | Carteira | Disponível para autorização | Gestor | — |
| Carteira liberada/realocada a Hub | Indústria | Hub | Hub passa/deixa de operar | Proprietário do Hub | — |
| Modo da Carteira definido (OPEN/DISTRIBUTED) | Proprietário do Hub | Carteira/Assistentes | Define visibilidade interna | Assistentes | — |
| Cliente/Atendimento distribuído | Proprietário do Hub | Assistente | Define responsável operacional | Assistente | — |
| Responsável da Carteira definido | Proprietário do Hub | Carteira | Gestão/SLA/indicadores | Responsável | — |
| Solicitação recebida | Hub/Indústria | Análise | Inicia triagem | Indústria | Canais de entrada |
| Solicitação aprovada | **Indústria** | Cliente | **Cria Cliente (da Indústria)** | Hub | — |
| Cliente criado | Indústria | Carteira | Disponível à operação | Hub | — |
| Atendimento aberto/avançado/fechado/perdido | Assistente | Pipeline | Evolui negociação | Proprietário do Hub | — |
| Atendimento assumido | Proprietário do Hub | Atendimento | PROP assume a operação do atendimento | Assistente anterior | — |
| Orçamento criado/emitido/enviado/recusado/reaberto | Assistente | Pré-pedido/Atendimento | Aceito → **Assistente converte**; recusado → reedita e reemite | Hub | E-mail/PDF/portal |
| Orçamento congelado (somente leitura) | Conversão em Pré-pedido | Orçamento | Orçamento fica imutável | Hub | — |
| Pré-pedido cancelado → Orçamento reaberto | Assistente/Proprietário | Orçamento | Orçamento volta a editável | Hub | — |
| Pré-pedido gerado/convertido | Hub | Pedido | Aprovado **cria Pedido** | Gestor/Financeiro | — |
| Pedido criado/aprovado/produção/enviado/entregue/concluído/cancelado | Hub/Gestor/logística | Etapa seguinte | Avança execução | Cliente/Gestor | ERP/Transportadora |
| Financeiro atualizado | Financeiro | Pedido | Fatura/quita | Gestor | Gateways/ERP |
| Concessão concedida/revogada | Proprietário do Hub | Assistente | Amplia/retira acesso | Assistente | — |
| Auditoria registrada | Qualquer ação sensível | Trilha de auditoria | Registro imutável | — | SIEM |

---

## Capítulo 7 — Auditoria

- **Princípio:** toda transição de estado e ação sensível gera registro **imutável** (autor, data/hora, entidade, ação, antes→novo).
- **Cobertura DEC-011 (alta sensibilidade):** ciclo de vida do Hub (cadastro/estados); autorização/alteração de Hub de Carteira; definição de modo (OPEN/DISTRIBUTED); distribuição/redistribuição; definição de Responsável da Carteira; concessões/revogações; alterações de papel.
- **Quem audita:** Administrador (Indústria); Proprietário do Hub (no seu Hub, sobre Assistentes e concessões).
- **Imutabilidade:** correção entra como novo registro.
- **Regra imutável do Orçamento:** após a conversão em Pré-pedido, o Orçamento é **somente leitura**. Qualquer alteração exige **cancelar o Pré-pedido → reabrir → editar → emitir → converter novamente** — garantindo rastreabilidade.

---

## Capítulo 8 — Pontos resolvidos e observações

- ✅ **Perfis × papéis:** resolvido pela **DEC-011** — Indústria (`administrador/gestor/financeiro`), Hub (`proprietario_hub/assistente`); "Atendimento" vira função por permissão; **Suporte removido**; **Representante** é empresa de negócio (não perfil).
- **Entidades Planejadas** (Representante, Proprietário do Hub, Assistente de Venda, Equipe, **Portfólio**, **Autorização Hub↔Portfólio**, Categoria, Subcategoria, Pré-pedido, Atendimento Comercial, Solicitação): baseline funcional pronta; materialização em Sprints Expand (enums de modo de Carteira e estados do Hub inclusos).
- **Catálogo/Portfólio (DEC-012):** árvore Indústria → Portfólio → Categoria → Subcategoria → Produto; Portfólio = agrupamento comercial; autorização Hub↔Portfólio = regra operacional separada; Fornecedor = legado/compat até Contract. Materialização na Sprint Expand de Catálogo.
- Token `vendedor` permanece como **compatibilidade temporária até o Contract** → `assistente`.
- ✅ **Autonomia do Assistente:** o Assistente cria/edita/**Emite (Finalizar e Enviar)** os próprios Orçamentos e **converte** o Orçamento aceito em Pré-pedido (sem aprovação hierárquica). **Não existe "aprovação" interna** — a aprovação comercial é do **Cliente**. O **Proprietário do Hub** é gerencial (vê/edita qualquer Orçamento, assume Atendimento, redistribui, concede permissões, intervém). Após conversão, o Orçamento é **somente leitura** (regra de auditoria).

---

## Capítulo 9 — Critérios de aceite (rastreabilidade)

| Critério | Onde |
|---|---|
| Operação comercial modelada | Cap. 3 |
| Ciclo de vida das entidades | Cap. 2 + Cap. 4 |
| Permissões | Cap. 1 + Cap. 5 |
| Estados (incl. Hub e modo de Carteira) | Cap. 4 |
| Eventos | Cap. 6 |
| Dependências | Cap. 3 + `DOMINIO.md` |
| Pontos resolvidos | Cap. 8 |

---

## Documentos relacionados

- [`ARQUITETURA_OFICIAL.md`](ARQUITETURA_OFICIAL.md) — Constituição.
- [`DOMINIO.md`](DOMINIO.md) — definições de negócio das entidades.
- [`DECISIONS.md`](DECISIONS.md) — DEC-001/002/003/006/008/**011**.
