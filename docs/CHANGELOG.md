# CHANGELOG — Hub Plataforma

> Registro cronológico **exclusivamente de implementações efetivamente realizadas** (código, infraestrutura, banco). Datas efetivas (DEC-004).
> **Não constam aqui:** decisões arquiteturais (ver [`DECISIONS.md`](DECISIONS.md)) nem Sprints de documentação/governança (ver [`SPRINTS.md`](SPRINTS.md)).
> Formato por entrada: data · objetivo · alterações · estruturas criadas · estruturas preservadas · observações.

---

## 2026-07-05 — Cadastro de Clientes: correção de segurança (vazamento cross-Hub) + integridade (DEC-020)

- **Objetivo:** corrigir 3 defeitos do módulo DEC-020 achados em code review — 1 crítico de segurança (vazamento de PII entre Hubs) e 2 de integridade de dados. Emenda a `064`.
- **Banco (`supabase/migrations/065_hub_onboarding_security_fixes.sql`, idempotente/aditiva):**
  - **#1 CRÍTICO — vazamento cross-Hub:** `onboarding_detalhe` e as policies RLS autorizavam o Hub por `industry_id = get_organization_id()`; como o usuário do Hub carrega o `organization_id` da Indústria, isso liberava **todos** os pré-cadastros da Indústria (CPF, endereço, documentos assinados) via URL direta. Agora o ramo da Indústria é restrito a admin/gestor (novo helper `fn_hco_is_industria()`) e o Hub só acessa `hub_id = get_hub_id()` (mesma regra de `onboarding_listar`). Fecha também as URLs assinadas (o server action `urlAssinadaDocumento` autoriza via `onboarding_detalhe`).
  - **#2 nome de PJ:** `industria_onboarding_converter` passa a usar razão social (fallback fantasia) como `contacts.nome`; o responsável (PF) vai para a nova coluna aditiva **`contacts.contato_responsavel`**.
  - **#3 data de nascimento:** `hub_onboarding_salvar` usa `CASE WHEN p_dados ? 'data_nascimento'` — chave presente sobrescreve (vazio ⇒ NULL), ausente preserva. Antes, `COALESCE(NULLIF(...))` impedia limpar uma data salva.
- **Aplicação:** aplicada no HUB DEV (SQL Editor) e **validada ao vivo** (9/9 comportamentais via usuários QA descartáveis + cleanup): Hub B negado / Hub A dono acessa / Indústria acessa; URL assinada de outro Hub bloqueada; conversão PJ com razão social + responsável em campo próprio; data define/preserva/limpa.
- **Sem deploy:** correção 100% de banco; nenhum código da Aplicação Web alterado. Fecha `R-SEC-03`.

## 2026-07-03 — Cadastro de Clientes: pré-cadastro Hub → aprovação Indústria (DEC-020)

- **Objetivo:** novo módulo em que o Hub pré-cadastra clientes (dados + documentos) e envia para a Indústria decidir (aprovar/reprovar/solicitar correção), com conversão em Cliente ativo (`contacts`) após aprovação. Fluxo interno completo; envio por e-mail à Indústria fica para a Fase 2.
- **Banco (`supabase/migrations/064_hub_client_onboarding.sql`):** helper `get_hub_id()`; tabelas `hub_client_onboarding`, `hub_client_onboarding_files`, `hub_client_onboarding_events` (append-only via trigger), `notifications` (central genérica); trigger `updated_at`; RLS (Hub por `get_hub_id()`, Indústria por `get_organization_id()`); bucket **privado** `client-onboarding-docs` (sem policy pública). RPCs `SECURITY DEFINER`: `hub_onboarding_criar/salvar/anexar/remover_arquivo/enviar`, `industria_onboarding_decidir/converter`, `onboarding_listar/detalhe/filtros`, `notificacoes_listar/marcar_lida` (authz por cargo no banco; decisão exclusiva de admin/gestor). **A APLICAR via SQL Editor no HUB DEV** (CLI linkado a projeto incorreto).
- **Aplicação Web:** `app/(dashboard)/hub/cadastro-clientes/` (`page.tsx` lista, `novo/`, `[id]/`, `actions.ts` com upload/signed URL via service role) e `app/(dashboard)/configuracoes/cadastro-clientes/` (lista + `[id]` de análise + `actions.ts`). Componentes em `components/cadastro-clientes/` (formulário PF/PJ com abas + barra de progresso, área de documentos com upload/visualizar/substituir/remover, tabela com filtros, linha do tempo, painel de análise da Indústria, badge de status). `lib/cadastro-clientes/` (constantes de documentos/status, actions de notificação). Central de notificações in-app: `components/layout/sino-notificacoes.tsx` no `header.tsx`.
- **Menu/RBAC:** `lib/navegacao.ts` — "Cadastro de Clientes" para Hub (`proprietario_hub`+`assistente`, `modulo:'cadastro_clientes'`) e Indústria (`admin`+`gestor`). `middleware.ts` — guard `cadastro_clientes` para Assistente. Módulo RBAC `cadastro_clientes` (visualizar/criar/editar) reusa `funcao_permissoes.chk_acao` (sem migration de enum).
- **Tipos (`types/database.ts`):** `HubClientOnboarding`, `HubClientOnboardingFile`, `OnboardingStatus`, `TipoDocumentoOnboarding`, `Notification`.
- **Build:** `npm run build` **OK** (compiled successfully; 0 erros de tipo/lint; rotas Hub e Indústria geradas).
- **Fronteira/nomenclatura:** Hub cria/envia/corrige; Indústria decide (RPCs restritas). Documentos só por signed URL (nada público). Nenhuma tela exibe "Stin Pharma" — termos neutros.
- **Pendente:** aplicar migration `064` no HUB DEV (SQL Editor) e verificação runtime end-to-end (fluxo Hub→Indústria→conversão) com sessão autenticada. Sem deploy. E-mail à Indústria = Fase 2 (sem provedor no projeto).

## 2026-07-03 — Validação de Receita: UI operacional única + comparação de posologia + Emitente/Paciente (MVP-6 — DEC-019)

- **Objetivo:** transformar a estrutura da Conferência em **módulo utilizável** — tela operacional única na Área do Hub, comparação opcional de posologia, campos de Emitente/Paciente e catálogo de metadados por produto. Sem deploy.
- **Aplicação Web (`app/(dashboard)/hub/validacao-receita/`):** módulo STANDALONE (independente do orçamento) — `page.tsx` (lista/fila), `nova/tela-validacao.tsx` (tela única: produto → receita → posologia esperada opcional → Executar; resultado **in-place**, sem navegação), `[id]/page.tsx` (mesma tela para reabrir), `painel-resultado.tsx` (resultado 🟢/🟡 + checklist ✅/❌ + resumo/orientação + decisão + dados agrupados Documento/Paciente/Medicamento + Detalhes técnicos recolhíveis), `preview-receita.tsx`, `acoes-decisao.tsx`, `bloco-comparar-posologia.tsx`, `ui.ts`, `actions.ts`. `lib/navegacao.ts` — item **"Validação de Receita"** (`/hub/validacao-receita`; perfis `proprietario_hub`+`assistente`; `modulo:'receita'`).
- **Comparação de posologia (consultiva):** `actions.compararPosologiaConferencia(conferenciaId, posologiaEsperada)` compara a posologia esperada com a **já extraída** (não refaz extração/motor); grava `posologia_esperada`+`posologia_comparacao` no `extracao_json`. IA: `lib/ia/comparar-posologia.ts` (schema/prompt/parse puros) + `provedores/comparador-claude.ts` + `criarComparador`. **Não altera** resultado/checklist/score/decisão.
- **Extração (`lib/ia/schema-extracao.ts`):** `CAMPOS_EXTRACAO` += Emitente (`emitente_cpf/endereco/cidade_uf/telefone`) e Paciente (`paciente_documento/data_nascimento/endereco/cidade_uf`); prompt orienta os 2 blocos de identificação.
- **Metadados por produto (catálogo keyed):** helper puro `lib/conferencia/hidratar-checklist.ts` (`hidratarChecklistComMetadadosProduto`) injeta `config.valores`/`config.limiteMaximo` a partir de `product_validation_metadata` nas regras `origemValores` — **motor intacto**. `types/database.ts` (`ProductValidationMetadata`). Persistência standalone `lib/conferencia/persistencia-standalone.ts`; diagnóstico `documentalOnly`; motor com regra `limite_maximo` (fatia anterior).
- **Banco (HUB DEV via SQL Editor):** `060_conferencia_receita_standalone.sql` (`conferencias_receita` + `conferencia_receita_pendencias` + `historico_decisoes_conferencia_receita` append-only) — **aplicada, smoke OK**. `061_product_validation_metadata.sql` (catálogo keyed; CHECKs de chave/tipo; UNIQUE(product_id,chave); RLS). Seeds: checklists standalone (Genérico **17** / Tirzepatida **18**) + **incremental idempotente** (reconcilia itens; remove `cpf_paciente`→`paciente_documento`; sem duplicatas) — **verificação aprovada**; seed de `product_validation_metadata` da Tirzepatida (aliases/concentrações/vias/limite). Comparação de posologia no `extracao_json` (sem migration).
- **Testes:** `node:test` **47/47** (motor `limite_maximo` + diagnóstico documental-only + hidratação por metadados + `parseComparacao`/prompt). `tsc --noEmit` **0 erros**. `eslint` do módulo limpo. `build:hubdev` **OK**.
- **Fronteira:** IA **extrai e compara** (comparação consultiva); **motor documental decide**; **decisão sempre humana**. RBAC `receita:conferir`/`receita:aprovar` (Proprietário `total`; Assistente sem `aprovar` → decisão oculta). Banco estrutural/motor/RBAC/Storage não alterados pela UI.
- **Sem deploy:** validação runtime online (sessão autenticada + IA real, `ANTHROPIC_API_KEY`) pendente.

## 2026-07-02 — Conferência de Receita: Integração + decisão humana + RBAC (MVP-5 — DEC-019)

- **Objetivo:** ligar o pipeline (receita → extração IA → motor → Diagnóstico → persistência) + decisões humanas + RBAC. Sem UI/deploy/preview.
- **Aplicação Web:** `app/(dashboard)/orcamentos/actions-conferencia.ts` — `rodarPreAnalise` (RBAC `receita:conferir`; download do arquivo no bucket privado via service role; extração pelo provider de IA; `conferir()` + `montarDiagnostico()`; INSERT em `receita_conferencias` (append-only) + `receita_conferencia_pendencias`; UPDATE `quote_receitas.status_analise_ia`/`score_ultima_conferencia`/`status_fluxo='em_conferencia'`; auditoria) e `aprovarReceitaOperacionalmente`/`devolverParaCorrecao`/`rejeitarReceita` (RBAC `receita:aprovar`; grava `validada_por`; auditoria). `lib/conferencia/persistencia.ts` + `mapear-orcamento.ts` (`mapOrcamentoContexto`, mappers puros). `lib/rbac.ts` (`AcaoRbac` += conferir/aprovar).
- **Separação de eixos:** decisão humana usa `status_fluxo='devolvida_para_correcao'`; `necessita_correcao` fica só como rótulo do Diagnóstico (sistema) — separa pré-análise de decisão humana.
- **Banco (migration `059`, a aplicar via SQL Editor):** `quote_receitas.status_fluxo += 'devolvida_para_correcao'`; `funcao_permissoes.chk_acao += 'conferir','aprovar'` (aditivo/idempotente; não concede permissões — só habilita o vocabulário). Artefatos em `hubdev/bootstrap/`.
- **Testes:** `node:test` **28/28** (mappers de persistência + `mapOrcamentoContexto`). Build `build:hubdev` OK. Commits `1f0d5cc`/ajustes.
- **Em andamento:** cobertura documental por quantidade (múltiplas receitas por orçamento/produto) em revisão arquitetural antes de finalizar a MVP-5.
- **Fronteira:** IA só extrai (`campos`/`itens`/`confianca`); motor decide; aprovação humana obrigatória. Sem deploy (UI/e2e é a MVP-6). RBAC fail-open (convenção do projeto) — avaliar fail-closed no hardening.

## 2026-07-02 — Conferência de Receita: Camada de IA (MVP-4 — DEC-019)

- **Objetivo:** camada de **extração provider-agnostic** + **Provider Claude**; a IA passa a **alimentar** o motor — **sem alterar nenhuma regra**. Sem UI/action/persistência/RBAC/integração runtime.
- **Aplicação Web (`lib/ia/`):** `tipos.ts` (`ExtratorReceita`; saída = `ExtracaoReceita`, entrada do motor). `schema-extracao.ts` (`SCHEMA_EXTRACAO` **sem score/status/aprovação**; `parseExtracao()` validação pura; `construirPromptExtracao()`). `provedores/claude.ts` (`ClaudeExtrator` — `claude-opus-4-8`, PDF/imagem, saída estruturada via tool forçada, validada por `parseExtracao`). `provedores/mock.ts` + `index.ts` (factory; openai/gemini/azure/local futuros).
- **Dependência:** `@anthropic-ai/sdk@^0.109.1` (adicionada).
- **Testes:** `node:test` **24/24** (schema sem decisão; parse; prompt; **pipeline IA(mock)→motor→Diagnóstico**). Build `build:hubdev` OK. Commit `00358ba`.
- **Fronteira IA/decisão:** IA só extrai (`campos`/`itens`/`confianca`); pendências/score/status/Diagnóstico continuam no **motor (S2)**. Sem deploy (integração é a MVP-5).

## 2026-07-02 — Conferência de Receita: Diagnóstico + checklists no banco (MVP-3 — DEC-019)

- **Objetivo:** entregar regras + orientação + **Diagnóstico da Receita** funcionando com **JSON simulado** (sem IA), com os checklists vindo do **banco** (seed), não do código.
- **Aplicação Web (`lib/conferencia/`):** `diagnostico.ts` — `montarDiagnostico()` produz o **objeto estruturado** (resultado/score/conferenciaDocumental/conferenciaComercial/orientacaoOperacional); separa documental × comercial; frases de ação por `motivo`; termos MVP (apta para conferência humana / necessita correção / …), nunca "validada". `mapear-checklist.ts` — `mapChecklistRows()` (linhas do BD → `Checklist`). Motor da S2 **intocado**.
- **Banco (seed `058_seed_checklists_receita.sql`, aplicada via SQL Editor):** **Checklist Genérico** (escopo `organizacao`, 10 itens) — verificado. **Checklist Tirzepatida** (escopo `produto`) só é semeado quando existir o produto "tirzepatida" (seed idempotente); ainda não presente no HUB DEV. Artefatos: `hubdev/bootstrap/seed_checklists_receita.sql` (+ `rollback_`).
- **Testes:** `node:test` **16/16** (motor + diagnóstico + mapeamento). Build `build:hubdev` OK. Commit `295db48` (código).
- **Estruturas preservadas:** sem IA/UI/RBAC; checklists no banco (sem CRUD ainda); DEC-018/019 intactas. Sem deploy (integração é a MVP-5).

- **Objetivo:** implementar o motor de regras determinístico da Conferência — **sem IA, sem persistência, sem UI**.
- **Aplicação Web (`lib/conferencia/`):** `tipos.ts` (contrato puro entrada/saída); `resolver-checklist.ts` (resolução hierárquica Produto>Portfólio>Organização); `motor-regras.ts` (`conferir()`: pendências com `motivo` normalizado, `score` 0..100, `status_analise`; precedência ilegivel>precisa_de_revisao_humana>divergente_do_orcamento>pendencias_encontradas>sem_pendencias_aparentes; `hoje` injetado — sem `Date.now`; **nunca aprova**).
- **Testes:** `node:test` **11/11** (fixtures do checklist de Tirzepatida). Runner sem dependência nova: `tsc -p tsconfig.conferencia.json` → `.tmp-conferencia/` (gitignored) + `node --test`; script `npm run test:conferencia`.
- **Estruturas preservadas:** nenhuma mudança de banco/RBAC/UI; DEC-018/019 intactas; `package.json` só ganhou o script de teste.
- **Validação:** testes 11/11 + build `build:hubdev` OK. Commit `6f59f52`. Sem deploy (lib sem superfície de runtime na app ainda — integração é a Sprint 6).

## 2026-07-02 — Conferência de Receita: infraestrutura (Sprint 1 — DEC-019)

- **Objetivo:** entregar a base persistente do módulo de Conferência Operacional de Receita (Expand), sem IA/motor de regras/UI/permissões.
- **Banco (migration `057_receita_conferencia.sql`, aplicada no HUB DEV via SQL Editor):** tabelas `receita_checklists`, `receita_checklist_itens`, `receita_modelos`, `receita_conferencias` (append-only), `receita_conferencia_pendencias`; extensão aditiva de `quote_receitas` (`checklist_id`, `status_analise_ia`, `score_ultima_conferencia`; `status_fluxo` += `em_conferencia`/`aprovada_operacionalmente`/`precisa_revisao_humana`); índices; RLS `get_organization_id()`; constraint `chk_receita_aprovacao_humana` (aprovação exige `validada_por` — IA não aprova); trigger append-only. TEXT+CHECK; reuso do bucket privado `orcamento-receitas`.
- **Aplicação Web:** apenas tipos em `types/database.ts` (`ReceitaStatusFluxo` estendido; `QuoteReceita` + colunas; `ReceitaStatusAnalise`/`ReceitaMotivo`/`ReceitaChecklist(+Item)`/`ReceitaModelo`/`ReceitaConferencia(+Pendencia)`). Sem UI/actions/IA nesta fatia.
- **Artefatos:** `hubdev/bootstrap/expand_receita_conferencia.sql` (+ `rollback_` + `smoke_`).
- **Estruturas preservadas:** DEC-018 intocada (aditivo puro); `chk_acao` do RBAC intocado.
- **Validação:** build `build:hubdev` OK; **smoke SQL (transação/ROLLBACK) — todos os testes passaram** (catálogo/RLS/constraints/trigger/policies; coerência de escopo; append-only; CHECKs; constraint de aprovação humana). Commit `8fb0c2c`.
- **Observações:** CLI segue no projeto legado (relink adiado); rotação da `service_role` exposta pendente — ambos para depois da Sprint 1. Sem deploy (mudança de banco + tipos).

## 2026-07-01 — PDF: centralização + limpeza do debug

- **Centralização:** o bloco do PDF ficava puxado à direita por conflito de `@page` (globals `16mm` × inline sides `0`) com `[data-pdf-page]` de largura fixa `210mm` (maior que a área imprimível). Correção: em print, `[data-pdf-page]` usa `width:100%` da área imprimível + `padding: 0 12mm` simétrico e `@page { margin: 10mm 0 }` — centraliza independentemente de qual `@page` vença.
- **Limpeza/performance:** removido o modo debug temporário (`?debug=…`) e a medição extra por requisição (`emulateMediaType`+bodyText em print); `waitForNetworkIdle` reduzido para 2,5s. Guardas mantidas (sem PDF branco/erro claro).
- **Nota de performance:** o tempo para *iniciar* a exportação é dominado pelo cold start do Chromium no serverless (inerente); a lentidão de *rolagem com o PDF aberto* é do visualizador de PDF do navegador (client-side), não do backend.

## 2026-07-01 — Fix (causa raiz): PDF em branco por regra global `@media print`

- **Causa raiz confirmada por diagnóstico:** `?debug=info` retornou `navStatus:200`, `markerExists:true`, `bodyTextLen:2055` (tela) mas **`bodyTextPrint:0`** (print). Em `app/globals.css` há um `@media print { body * { visibility: hidden } }` (do print nativo `window.print`, que revela só `.area-impressao`). A página `preview-pdf` do Puppeteer não usa `.area-impressao`, então **todo o conteúdo ficava invisível na mídia print** → PDF ~1KB em branco.
- **Correção:** no CSS inline da `preview-pdf`, dentro de `@media print`, `body * { visibility: visible !important }` (revela o conteúdo do PDF sem quebrar o print nativo legado; `.print-hidden`/`.no-print` seguem ocultos).
- **Validação:** teste local reproduz o bug (sem fix: textoPrint=0, PDF 876 bytes) e confirma a correção (com fix: textoPrint=108, PDF ~18KB). Guardas da rota mantidas.
- **Debug temporário:** `?debug=info|html|screenshot` na rota do PDF permanece por ora para validação em produção (remover depois).

## 2026-07-01 — Fix: PDF do orçamento em branco em produção

- **Objetivo:** corrigir o PDF gerado em branco (Puppeteer) e blindar o pipeline contra entrega silenciosa de PDF vazio.
- **Causa raiz:** `preview-pdf` carregava o print CSS via `<link href="./print.css">`, mas o middleware não serve `.css` como estático (só `_next`/favicon/imagens) — o arquivo retornava 307/404 e as regras `@page`/A4 nunca se aplicavam; somado a `page.goto(..., networkidle0)`, que trava/atrapalha com imagens externas de logo.
- **Correção:**
  - `app/(pdf)/orcamentos/[id]/preview-pdf/page.tsx` — print CSS **inline** (`<style>`), removendo o `<link>` quebrado.
  - `app/api/orcamentos/[id]/pdf/route.ts` — navegação por `domcontentloaded` (não `networkidle0`); espera explícita de `[data-pdf-template="ready"]` (15s) + `document.fonts.ready` + `waitForNetworkIdle` best-effort; **guardas**: sem marcador → 500 claro, corpo vazio (bodyText < 40) → 500, PDF < 1200 bytes → 500 (nunca entrega branco); logs `[pdf-diag]` (printUrl, navStatus, htmlLength, bodyTextLen, marcador, console/pageerror/requestfailed/respostas ≥400).
- **Validação:** build OK; smoke test local do pipeline de impressão (Puppeteer + print CSS inline) gera PDF de ~30KB com conteúdo e a guarda aborta quando não há marcador. Diagnóstico em produção via logs `[pdf-diag]`.
- **Estruturas preservadas:** tela de detalhe do orçamento intocada; template e query da preview-pdf inalterados (só CSS/print e robustez da rota).

## 2026-07-01 — Detalhe do Orçamento: layout operacional (foco nos itens)

- **Objetivo:** tornar o detalhe do orçamento (`/orcamentos/[id]`) mais compacto e operacional, com a **tabela de itens como bloco principal** e o **valor total exibido uma única vez** (no resumo). Sem mudar sidebar, autenticação ou permissões; aba Receita preservada.
- **Aplicação Web:**
  - `app/(dashboard)/orcamentos/[id]/page.tsx` — cabeçalho compacto (mantém Voltar, título #, cliente, status e botões Enviar ao Cliente/Exportar PDF/Pré-visualizar/Editar); removida a linha de 4 cards (Valor Total, Responsável, Fornecedor) e o valor total do topo; no lugar, faixa fina **Criado em + Status**. Sub-select de itens ganhou `produto:products!product_id(apresentacao)` (aditivo, sem `select('*')`).
  - `components/orcamentos/orcamento-detalhe.tsx` — reescrito: itens como bloco principal com **descrição completa sem truncamento** (`whitespace-pre-wrap`, coluna larga) e coluna **Apresentação** condicional (só quando há dado no cadastro); cards grandes de endereços/transportadora movidos para seção colapsável **"Dados adicionais"** (com Observações), discreta quando vazia; **Resumo Financeiro** compacto no rodapé (Subtotal/Frete/Desconto/Valor Total único). Padding vertical reduzido.
- **Estruturas preservadas:** query pesada (só join aditivo de apresentação), PDF só por clique, legado `leads`/`suppliers`, schema; nenhuma mudança de dados.
- **Observações:** build `build:hubdev` OK; graphify atualizado. Nota: em orçamentos do Hub a apresentação já vem concatenada na `descricao` na criação do item — a nova coluna Apresentação pode repetir esse texto (não sobrescrevemos a descrição, conforme requisito).

## 2026-07-01 — Receita no Orçamento: aba sob demanda + Storage (DEC-018)

- **Objetivo:** adicionar a **Receita** ao detalhe do Orçamento como **aba com carregamento sob demanda**, sem refatorar a tela inteira nem o legado `leads`/`suppliers`. A Receita reúne o **modelo/rascunho** (gerado a partir dos itens) e a **receita assinada** anexada.
- **Banco (migration `056_orcamento_receitas.sql` — PENDENTE de aplicação no SQL Editor do HUB DEV):** tabela `quote_receitas` 1:N com `quotes` (`texto_modelo`, `status_fluxo` = rascunho/modelo_gerado/enviada/recebida/validada/rejeitada, `arquivo_path`/`arquivo_nome`/`arquivo_tipo`/`arquivo_tamanho`/`enviado_em`, validação); índices `quote_id`/`status_fluxo`/`criado_em`/`organization_id`; RLS `get_organization_id()`; bucket **privado** `orcamento-receitas`; índices auxiliares `quotes(status)` e `quotes(criado_em)`.
- **Aplicação Web (arquivos):**
  - **Criados:** `app/(dashboard)/orcamentos/actions-receita.ts` (ações separadas, sem `select('*')`); `components/orcamentos/receita-tab.tsx` (aba lazy: gerar modelo / editar / salvar rascunho / anexar assinada / validar / rejeitar); `components/orcamentos/orcamento-tabs.tsx` (wrapper de abas; Receita só monta ao abrir); `supabase/migrations/056_orcamento_receitas.sql`.
  - **Alterados:** `app/(dashboard)/orcamentos/[id]/page.tsx` (troca mínima `OrcamentoDetalhe` → `OrcamentoTabs`; query e legado intocados); `types/database.ts` (`QuoteReceita`, `ReceitaStatusFluxo`).
- **Estruturas preservadas:** query pesada do detalhe, geração de PDF **só por clique**, `leads`/`suppliers`, `quotes`/`quote_items`; sem WhatsApp automático; sem `select('*')` novo.
- **Observações:** build `build:hubdev` OK; graphify atualizado. **Não aplicado no banco ainda** (aguarda SQL Editor). Sem deploy nesta fatia. Testes manuais e ajustes visuais **após** aplicar a migration no HUB DEV.

## 2026-07-01 — Orçamento do Hub por Portfólio (substitui fluxo Fornecedor) — DEC-013/014/016/017

- **Objetivo:** a criação de orçamento passa a ser **fluxo do Hub, por Portfólio autorizado**, substituindo o fluxo antigo baseado em Fornecedor (DEC-014). Acesso restrito a **`proprietario_hub` e `assistente`** (Indústria e Cliente não criam).
- **Expand (`hubdev/bootstrap/expand_orcamento_hub.sql`, aditivo/idempotente):** `quotes.portfolio_id` (→ `portfolios`), `quotes.hub_id` (→ `hubs`), `quotes.prazo_entrega`, `quotes.observacoes_cliente`, `quotes.transportadora` (texto livre); `quotes.supplier_id` vira **nullable/legado**; índices em `portfolio_id`/`hub_id`.
- **Backend (`app/(dashboard)/orcamentos/actions-hub.ts` — `criarOrcamentoHub`):** valida **tudo no server** — cargo/hub do usuário, Cliente pertence a uma Carteira operada pelo Hub, Portfólio ativo **e** autorizado (`hub_portfolios` status `ativo`), produtos pertencem ao Portfólio (`product_portfolios` ativo). **Preço vem do vínculo `product_portfolios`** (ignora preço do front — não confia em IDs/valores enviados). Insere em `quotes` (+`quote_items` com rollback); status `rascunho` ou `aguardando_aprovacao_interna` conforme "Salvar rascunho"/"Gerar orçamento"; auditoria `CRIACAO_ORCAMENTO_HUB`/`RASCUNHO_ORCAMENTO_HUB`.
- **Frontend (`components/orcamentos/form-orcamento-hub.tsx`, `/orcamentos/novo` gated ao Hub):** 5 blocos — **Cliente** (busca por nome/telefone/CPF-CNPJ/carteira, só Clientes do Hub), **Portfólio** (só autorizados/ativos; 1 orçamento = 1 Portfólio), **Produtos** (do Portfólio; preço read-only do vínculo), **Dados comerciais**, **Resumo**; largura ~65% (`max-w-4xl`). Envia só `product_id/quantidade/desconto_item` — o servidor recalcula. Ações: Cancelar, Salvar rascunho, Gerar orçamento.
- **Observações:** fluxo legado (Fornecedor) mantido em paralelo; sem Contract (nada removido). Nome "Stin Pharma" não aparece na UI do Hub. Build OK. Commit em `main`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-07-01 — Renomeação Contatos → Clientes (rota + código) — DEC-017

- **Objetivo:** coerência total com "a plataforma só trabalha com Clientes" — não só o rótulo do menu, mas a **rota e o código**.
- **Alterações:** pasta de rota `app/(dashboard)/contatos` → `app/(dashboard)/clientes` (URL `/clientes`, `/clientes/[id]`, `/clientes/importar`, `/clientes/exportar`); pasta `components/contatos` → `components/clientes`; ~19 referências `/contatos` → `/clientes` (redirects, `router.push`, `revalidatePath`, links, imports) em leads/tarefas/whatsapp/clientes. **Redirect** em `next.config.ts`: `/contatos` e `/contatos/:path*` → `/clientes` (mantém links/bookmarks antigos).
- **Observações:** menu já exibia "Clientes"; agora a URL e o código também. Nomes internos de variáveis (`contato`/`contatos`) mantidos por ora (sem impacto de rota). Build OK; sem SQL. Commit `b6ba083`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-07-01 — Consolidação do módulo Clientes e Carteiras (DEC-017)

- **Objetivo:** tornar a cadeia Cliente → Carteira → Hub autorizado → Responsável Operacional visível e operacional nas telas da Indústria (sem Contract — modelagem validada; enforcement segue na aplicação).
- **Clientes (`/contatos`):** lista ganha coluna **Carteira** (badge; "Sem carteira" em âmbar quando ausente) — query com join `carteiras`. Chain visível por cliente.
- **Carteiras (`/configuracoes/carteiras`):** lista ganha coluna **Clientes** (contagem por Carteira) + subtítulo atualizado ("aqui você autoriza qual Hub opera cada Carteira"). A coluna **Hub autorizado** já existia (`autorizarCarteiraHub`).
- **Modelagem validada (sem alterações de schema):** `contacts.carteira_id` (Carteira, obrigatória na app), `carteiras.hub_id` (Hub autorizado — 1 Hub por Carteira), `contacts.responsavel_operacional_id` (Responsável Operacional, por Cliente).
- **Observações:** sem novo SQL; sem Contract (NOT NULL/enum/drops adiados para a estabilização). Build OK. Commit `6d2ff9a`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-07-01 — Cliente com Carteira obrigatória; plataforma só Clientes (DEC-017)

- **Decisão:** a plataforma trabalha apenas com **Clientes** (sem entidade "Contatos" separada — `contacts` é o Cliente). **Carteira passa a ser obrigatória** no Cliente, desde o cadastro/importação. Não existirão Clientes sem Carteira.
- **Cadastro manual:** `criarContato` exige `carteira_id`; `modal-novo-contato` ganha seletor **Carteira \*** (obrigatório). Rótulos "Contato"→"Cliente".
- **Importação (Cenário 1):** `importarContatos(contatos, carteiraId, modo)` exige **Carteira destino** (valida org+ativa); grava `carteira_id` em todos os importados (novos e, no modo atualizar, duplicados). `form-importacao` ganha "Carteira destino \*" (botões bloqueados sem seleção). **Cenário 2** (coluna Carteira na planilha) deixado preparado, não implementado.
- **Edição:** `editarContato` exige `carteira_id`; o form de edição ganha o seletor; **auditoria `ALTERACAO_CARTEIRA_CLIENTE`** quando a Carteira muda.
- **Menu/labels:** item de menu "Contatos" → **"Clientes"**; títulos das telas de Clientes/Importar atualizados. Tipo `Contact` ganha `carteira_id`/`responsavel_operacional_id`.
- **Observações:** enforcement em nível de aplicação (colunas já existem; `carteira_id` continua nullable no banco — `NOT NULL` fica para o Contract, após backfill dos legados). Área do Hub inalterada (não cadastra/importa/troca Carteira). Build OK; sem novo SQL. Commit `5b4e250`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-07-01 — Responsável operacional no Hub: distribuição de clientes (DEC-017, Fatia 3)

- **Objetivo:** o Proprietário distribui clientes entre Assistentes (define responsável operacional) **sem** alterar a Carteira oficial da Indústria — separando os dois conceitos.
- **Banco (SQL Editor, HUB DEV):** coluna nova `contacts.responsavel_operacional_id` (FK profiles) + índice; RPC `SECURITY DEFINER` `hub_clientes_listar` (Proprietário; clientes das Carteiras operadas pelo Hub — `carteiras.hub_id`; retorna Carteira × responsável operacional). `hubdev/bootstrap/expand_responsavel_operacional.sql`.
- **Aplicação Web:** `/hub/clientes` passa a listar os clientes do Hub e distribuir o **responsável operacional** (seletor de Assistentes do Hub) — `components/hub-clientes/distribuir-clientes.tsx`; action `definirResponsavelOperacional` (gate Proprietário; valida cliente em Carteira do Hub e responsável Assistente do Hub; auditoria `DEFINICAO_RESPONSAVEL_OPERACIONAL`). Não toca `carteira_id`.
- **Observações:** smoke **8/8** no HUB DEV (escopo por Hub; Carteira preservada; gravação/leitura do responsável; negação a não-Proprietário), dados `ZZ_SMOKE_RO_*` limpos. Fatia 2 (consolidação Indústria: mover cliente de Carteira/ver Hub operante) pode vir depois. Commit `784ab6b`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-07-01 — Clientes: import/cadastro exclusivos da Indústria (DEC-017, Fatia 1)

- **Objetivo:** fechar a brecha em que o Hub podia importar/cadastrar clientes; a base é governança da Indústria.
- **Aplicação Web:** `criarContato` e `importarContatos` passam a exigir **admin/gestor** (server-side); a página `/contatos/importar` redireciona quem não for Indústria. Auditoria `CRIACAO_CLIENTE` e `IMPORTACAO_CLIENTES` em `audit_logs`. Confirmado: nada fora de `/contatos` usa essas actions (Hub opera na própria área). Sem novo SQL.
- **Observações:** troca de Carteira do cliente já é Indústria-side (editar contato em `/contatos`, inacessível ao Hub). Próximas fatias: consolidar visão Indústria "Clientes e Carteiras" (mover cliente/ver Hub operante) e **responsável operacional por cliente no Hub** (distribuição). Commit `20f9af3`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-07-01 — Criar Hub: selecionar Proprietário existente ou criar novo (DEC-016, Ajuste 1)

- **Objetivo:** no fluxo de criação de Hub, permitir **selecionar um Proprietário existente** (sem Hub) além de **criar novo** — mantendo o invariante "Hub sempre com Proprietário".
- **Aplicação Web:** `modal-novo-hub` ganha alternância **Criar novo | Usar existente** (existente lista Proprietários sem Hub, vindos da página); `criarHub` ramifica: com `proprietario_existente_id` valida o Proprietário (proprietario_hub ativo, mesma org, sem Hub) e o vincula ao novo Hub (sem criar usuário/senha; rollback do Hub em falha de vínculo); sem id, mantém o caminho de criar novo usuário. Auditoria `CRIACAO_HUB` + `VINCULO_PROPRIETARIO_HUB`.
- **Observações:** completa os ajustes da DEC-016. Sem novo SQL; build OK. Commit `380e01c`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-07-01 — Governança Indústria×Hub: separação de gestão (DEC-016)

- **Objetivo:** a Indústria **governa** o Hub; o Proprietário **opera** o Hub. A Indústria não gerencia a equipe interna do Hub.
- **Indústria (Usuários):** a lista mostra **apenas** usuários da Indústria e Proprietários — **Assistentes excluídos** (`neq cargo assistente`); criação restrita a **Administrador/Gestor da Indústria** (`modal-novo-usuario` + whitelist em `criarUsuario`). Proprietário é criado pelo fluxo de Hub; Assistente pelo Proprietário.
- **Hub (equipe — Proprietário):** nova action `atribuirFuncaoAssistente` (gate Proprietário; Função e Assistente do próprio Hub; auditoria `ATRIBUICAO_FUNCAO_ASSISTENTE`); `tabela-assistentes` ganha **seletor de Função** por Assistente; a página carrega as Funções do Hub via `funcoes_listar`. Criar/editar/ativar-desativar Assistente já existiam (Proprietário).
- **Gates:** `/hub/assistentes` continua exclusivo do Proprietário (actions gate `proprietario_hub`; página redireciona). A Indústria não opera equipe do Hub.
- **Auditoria:** criação de Hub, definição/alteração de Proprietário, criação/edição/status de Assistente e atribuição de Função já registram em `audit_logs`.
- **Adiado (Ajuste 1 — enhancement):** "selecionar Proprietário existente" na criação de Hub (hoje cria novo; o invariante Proprietário-obrigatório já é atendido). Próxima fatia.
- **Observações:** DEC-016 (emenda DEC-015). Sem novo SQL; build OK. Commit `10d6f6e`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-07-01 — DEV: exclusão definitiva de usuário (limpeza de ambiente)

- **Objetivo:** ação administrativa para excluir usuários em DEV/organização inicial. **Exceção** — em produção o padrão é **Desativar** (mantido).
- **Banco (SQL Editor, HUB DEV):** RPC `SECURITY DEFINER` `contar_vinculos_usuario` (só admin) — varre **dinamicamente todos os FKs que referenciam `profiles(id)`** (leads, clientes, orçamentos, pedidos, conversas/mensagens, carteiras e quaisquer outros; exclui `audit_logs`) e sinaliza se é Proprietário de Hub. `hubdev/bootstrap/dev_excluir_usuario.sql`.
- **Aplicação Web:** action `excluirUsuarioDefinitivo` (só admin; confirmação forte **"EXCLUIR USUÁRIO"**; sem auto-exclusão; bloqueia se houver vínculo ou for Proprietário de Hub; remove do Auth com cascade do profile; registra `audit_logs`). Seção **"Zona de perigo"** no drawer de Usuários. Desativar/Reativar mantido.
- **Observações:** smoke **8/8** no HUB DEV (usuário limpo total 0; flag de Proprietário; negação a não-admin; deleção com cascade do profile e remoção do Auth), dado `zz_smoke_del` removido. Commit `9d85827`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-07-01 — RBAC Contract (parte segura): criação de usuário só com perfis oficiais (DEC-015)

- **Objetivo:** impedir a criação de novos usuários com perfis legados, sem o risco de reescrever a lógica de negócio legada.
- **Aplicação Web:** `modal-novo-usuario` oferece apenas **Administrador da Indústria / Gestor da Indústria / Assistente** (Proprietário é criado pelo fluxo de Hub); `criarUsuario` valida o cargo por whitelist. Sem novo SQL.
- **Adiado (Contract completo — risco alto):** remoção física dos valores do enum `user_role` (`vendedor/atendimento/financeiro/suporte`) exige recriar o tipo + reescrever `profiles.cargo`; e há ~40 pontos de código com lógica de negócio ramificando nesses perfis (leads/pipeline/orçamentos/tarefas/whatsapp/relatórios). Como há **0 usuários** legados, são ramos/valores mortos e inofensivos; a remoção fica para um esforço dedicado e testado.
- **Observações:** com isso, nenhum novo usuário legado é criado. Commit `81eb211`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-06-30 — RBAC Migrate-B (resto): guard de rota (middleware) + flip vendedor→assistente (DEC-015)

- **Objetivo:** aplicar permissões também nas rotas (middleware) e concluir a migração de perfis legados operacionais.
- **Aplicação Web:** `middleware.ts` ganha guard por permissão **só para Assistente** — rotas mapeadas (`/assistente/clientes|orcamentos|prepedidos`, `/hub/produtos`) exigem `visualizar` no módulo da Função; sem permissão → redireciona a `/assistente`. Fail-open (erro/sem dado não bloqueia); rotas não mapeadas e demais perfis passam.
- **Banco (dados):** `vendedor → assistente` (1 usuário, `mo@pharma1.com.br`); distribuição final `admin 1 / proprietario_hub 3 / assistente 5`; 0 vendedores. O usuário migrado está sem Hub/Função (admin deve atribuir na tela de Usuários para operar).
- **Estruturas preservadas:** enum `user_role` ainda contém os legados (removidos só no Contract); RLS por Perfil+Hub inalterada.
- **Observações:** com isso o RBAC (DEC-015) está aplicado em **menu + middleware + (server actions via RLS/gates existentes)**. Falta o Contract (limpeza do enum). Commit `ca2b07d`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-06-30 — Remoção da UI do Hub legado (Hubs de Saúde / health_hubs)

- **Objetivo:** remover o "hub legado" (Hubs de Saúde) da plataforma — telas, menu (card) e código.
- **Aplicação Web:** removidos o card em `configuracoes/page.tsx`, a rota `app/(dashboard)/configuracoes/hubs-de-saude/**` e os componentes `components/hubs-de-saude/**`. Confirmado: nada externo importava esses componentes/actions.
- **Preservado (Contract):** a tabela `health_hubs` **não** foi removida — é referenciada por `suppliers.hub_id` e Fornecedor ainda tem o bloqueador do Orçamento (DEC-014). Remoção física da tabela fica para o Contract, após o desacoplamento de Fornecedor.
- **Observações:** o Hub oficial é `hubs` (`/configuracoes/hubs`), intocado. Commit `b66113f`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-06-30 — RBAC Migrate-C: Hub sempre com Proprietário (invariante DEC-015)

- **Objetivo:** garantir que um Hub nunca fique sem Proprietário. Criação já exigia/criava o Proprietário (`criarHub`); faltava fechar a brecha de **remoção**.
- **Aplicação Web:** `definirProprietarioHub` passa a **rejeitar remoção** (`proprietarioId` vazio) — só permite **substituir**; `components/hubs/tabela-hubs.tsx` remove a opção "— Nenhum —" (placeholder desabilitado "Selecionar proprietário…"). Sem novo SQL.
- **Observações:** criação de Hub já cobre "Proprietário obrigatório"; a troca cobre "selecionar Proprietário existente". Commit `64d6ec8`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-06-30 — RBAC Migrate-C: tela de Usuários (drawer + atribuição de Função) — DEC-015

- **Objetivo:** refatorar `/configuracoes/usuarios` para o modelo DEC-015 — drawer com Dados/Perfil/Permissões/Status e atribuição de **Função** ao Assistente.
- **Aplicação Web:** tabela com colunas Nome/E-mail/Telefone/Perfil/Hub/Status/Último acesso/Criado em/Ações; linha abre **drawer** (Esc/click-fora). Assistente → seletor de **Função** (do próprio Hub); Admin/Proprietário/Gestor sem edição (nota de acesso). `page.tsx` enriquece com Hub (join), Função e último acesso (`auth.admin.listUsers` via admin client). Action `atribuirFuncao` (admin; valida org + Hub da Função). `badge-perfil` relabelado (DEC-015; `assistente` = "Assistente"). Sem novo SQL.
- **Estruturas preservadas:** criação de usuário/senha/status inalteradas; perfis legados ainda exibidos (Contract remove).
- **Observações:** build OK. Validação visual (clicar/atribuir) pelo admin. Commit `642b5db`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-06-30 — RBAC Migrate-C: tela de Funções (Proprietário) — DEC-015

- **Objetivo:** dar ao Proprietário do Hub a UI para criar/editar Funções e marcar permissões por módulo/ação.
- **Banco (SQL Editor, HUB DEV):** RPCs `SECURITY DEFINER` `funcoes_listar` / `funcao_salvar` (upsert + substitui permissões, atômico) / `funcao_excluir` (bloqueia se houver usuários). Só `proprietario_hub`, escopo do próprio Hub. `hubdev/bootstrap/migrate_rbac_funcoes_crud.sql`.
- **Aplicação Web:** rota `/hub/funcoes` (gate Proprietário) + item de menu **Funções**; `components/hub/funcoes-gerenciar.tsx` (lista + editor com **matriz módulos × ações** Ver/Criar/Editar/Excluir); actions `listarFuncoes`/`salvarFuncao`/`excluirFuncao`.
- **Observações:** smoke **12/12** no HUB DEV (criar/listar/editar/excluir, bloqueio de exclusão com usuários, negação a não-Proprietário), dados `ZZ_SMOKE_E9_*` limpos. Commit `3d2021e`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-06-30 — RBAC Migrate (parcial): Função padrão + menu por permissões (DEC-015)

- **Objetivo:** iniciar a aplicação do RBAC (DEC-015) sem quebrar nada — migração de dados e primeira aplicação (menu), confinada ao Assistente.
- **Banco (SQL Editor, HUB DEV — Migrate-A):** Função padrão **"Comercial"** por Hub + baseline de permissões (dashboard/leads/clientes/produtos/pedidos/orçamentos/whatsapp/agenda) + atribuição aos assistentes existentes. `hubdev/bootstrap/migrate_rbac_funcao_padrao.sql`. Verificado: 2 funções, 2/3 assistentes com função (o 3º sem Hub fica sem função), acesso preservado.
- **Aplicação Web (Migrate-B — menu):** `lib/rbac.ts` (`resolverPermissoes`/`podeVer`/`podeAcao` via `minhas_permissoes()`); `lib/navegacao.ts` ganha `modulo` por item e filtra o menu do **Assistente** pelas permissões da Função (fail-open; demais perfis inalterados); layout/sidebar/sidebar-mobile/header passam as permissões resolvidas.
- **Estruturas preservadas:** admin/gestor/proprietário com menu idêntico; RLS por Perfil+Hub inalterada; enum intocado.
- **Observações:** primeira aplicação do RBAC no menu. Próximas fatias: middleware/rotas + server actions (guard por permissão) + flip `vendedor→assistente`; telas Usuários (drawer)/Funções; Criar Hub com Proprietário. Commit `12369d2`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-06-30 — RBAC: fundação de Funções e Permissões (Sprint Expand E8, DEC-015)

- **Objetivo:** iniciar o novo RBAC (DEC-015) — separar Perfil de Permissões via camada de Função (Role), de forma aditiva, sem quebrar auth/permissões atuais.
- **Banco (SQL Editor, HUB DEV):** tabelas `funcoes` (escopo Hub) e `funcao_permissoes` (módulo×ação, `chk_acao`); coluna `profiles.funcao_id`; índices; RLS habilitada sem policies (acesso via RPC). RPC `SECURITY DEFINER` `minhas_permissoes()` (admin/proprietário=total; gestor=fixo; assistente=Função). Artefatos `hubdev/bootstrap/expand_rbac_funcoes.sql` (+ rollback).
- **Aplicação Web:** nenhuma mudança de comportamento nesta fatia (fundação). Wiring de menu/middleware/server-actions e telas ficam para o Migrate.
- **Estruturas preservadas:** enum `user_role`, RLS existente e dados intocados; perfis atuais preservados.
- **Observações:** smoke funcional **9/9** no HUB DEV (resolvedor por perfil/Função, constraint de ação, teardown com restauração do usuário de teste). Sem deploy (app inalterado nesta fatia). Commit `5276589`.

## 2026-06-30 — Página HUB "Produtos" (consulta operacional — Sprint Expand E7, DEC-013/014)

- **Objetivo:** tela `/hub/produtos` para Proprietário e Assistentes consultarem os produtos autorizados pelos Portfólios liberados. Sem CRUD; o Hub apenas consome.
- **Banco (SQL Editor, HUB DEV):** colunas `products.metadata` e `product_portfolios.metadata` (jsonb, flexível por Portfólio); RPCs `SECURITY DEFINER` `hub_produtos_listar` (busca/filtros/ordenação/paginação server-side), `hub_produto_detalhe`, `hub_produtos_filtros` + helper `_hub_ctx`. Autorização por Hub via `hub_portfolios` ativos (Indústria vê tudo da org). Artefatos `hubdev/bootstrap/expand_hub_produtos.sql` (+ rollback).
- **Aplicação Web:** rota `app/(dashboard)/hub/produtos` (gate proprietario_hub/assistente; admin/gestor/financeiro pré-visualizam) + `components/hub/produtos-consulta.tsx` (DataTable ordenável, paginação, contagem, busca instantânea, filtros Categoria/Portfólio/Status, drawer 500px dinâmico com Esc/click-fora, responsivo → lista no mobile); item de menu "Produtos" para Hub/Assistente. Sem imagens/cards; drawer exibe só campos preenchidos + `metadata`.
- **Estruturas preservadas:** Fornecedor intocado (DEC-014); sem CRUD de produtos no Hub.
- **Observações:** smoke funcional **16/16** no HUB DEV (listar/filtros/paginação/ordenação/detalhe+metadata/filtros), dados `ZZ_SMOKE_E7_*` com teardown e ambiente limpo. Orçamento/pré-pedido fora desta etapa. Commit `d24c485`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-06-30 — Fix: coluna/filtro de Portfólio na lista de Produtos lê o vínculo N:N (DEC-013/014)

- **Objetivo:** a lista de Produtos mostrava "—" no Portfólio (e filtrava errado) porque lia `products.portfolio_id` (legado, não mais preenchido).
- **Aplicação Web:** `configuracoes/produtos/page.tsx` lê `product_portfolios` (join `portfolios`) via **admin client** com escopo na organização (RLS sem policies p/ app) e monta `vinculosPorProduto`; `tabela-produtos.tsx` passa a exibir e filtrar pelos Portfólios do vínculo N:N (um produto pode aparecer em vários). Sem novo SQL.
- **Observações:** corrige o sintoma reportado; alinhado à DEC-014 (não usar `products.portfolio_id`). Commit `8d46862`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-06-30 — Vínculo em massa Produto↔Portfólio (Sprint Expand E6 — DEC-013/DEC-014)

- **Objetivo:** vincular **produtos já existentes** a um Portfólio **em massa** (sem ser um a um), além da importação por planilha.
- **Banco (SQL Editor, HUB DEV):** RPC `vincular_produtos_portfolio(portfolio, product_ids[], categoria?, subcategoria?)` (`security definer`, atômica, **idempotente** — `on conflict do nothing`, preço **herdado** do produto) + helper `produtos_vinculados_portfolio(portfolio) → uuid[]`. Artefatos `hubdev/bootstrap/expand_rpc_vincular_produtos_portfolio.sql` (+ rollback). Sem novas policies.
- **Aplicação Web:** seção "Produtos do portfólio" na página do Portfólio com **modal de multi-seleção** (busca, classificação opcional, lista de já vinculados) — `components/portfolios/vincular-produtos.tsx`; ação em lote **"Vincular ao portfólio"** na lista de Produtos (`components/produtos/tabela-produtos.tsx`); action `vincularProdutosAoPortfolio`.
- **Estruturas preservadas:** Fornecedor intocado (DEC-014); `products.portfolio_id` não utilizado.
- **Regras:** preço do vínculo herda do produto; classificação opcional aplicada ao lote; idempotente (já vinculado é ignorado).
- **Observações:** smoke funcional **13/13** no HUB DEV (vínculo em massa, idempotência, N:N, classificação, atomicidade do erro), dados `ZZ_SMOKE_E6_*` com teardown e ambiente limpo. Commit `350c0f7`; deploy em `https://hub-plataforma-dev.vercel.app`.

## 2026-06-30 — Importação para Portfólio (Sprint Expand E5 — DEC-013/DEC-014)

- **Objetivo:** importar Produtos por planilha (XLSX/CSV) **para um Portfólio**, materializando o vínculo N:N `product_portfolios` (preço/classificação por Portfólio).
- **Banco (SQL Editor, HUB DEV):** RPC `importar_produtos_portfolio` (`security definer`, **atômica** — 100% ou 0%, valida autorização internamente) + índice `idx_products_org_nome_norm` (apoio ao dedup por nome). Artefatos `hubdev/bootstrap/expand_rpc_importar_produtos_portfolio.sql` (+ rollback). Sem novas policies (acesso ao vínculo só via RPC nesta fase).
- **Aplicação Web:** rota `configuracoes/portfolios/[id]/importar`; `components/portfolios/form-importacao-portfolio.tsx` (upload, detecção/normalização de colunas, preview classificado, **painel de pendências** de Categoria/Subcategoria, "Baixar modelo"); server actions `previewImportacaoPortfolio`/`importarProdutosParaPortfolio`; botão "Importar produtos" na página do Portfólio. Build `build:hubdev` OK.
- **Estruturas preservadas:** Fornecedor intocado (DEC-014); `products.portfolio_id` **não** utilizado (vínculo só em `product_portfolios`).
- **Regras:** atômica (sem importação parcial); Produtos criados por **dedup de nome normalizado** (nome repetido na planilha = erro); **Categorias/Subcategorias não são criadas automaticamente** (citação inexistente vira pendência que bloqueia); **preço obrigatório** (lar do preço é o vínculo).
- **Observações:** smoke funcional **44/44** (30 RPC autenticada end-to-end no HUB DEV + 14 modelo/parser); dados `ZZ_SMOKE_*` com teardown e ambiente limpo. Commit `0170912`; deploy de produção alinhado em `https://hub-plataforma-dev.vercel.app`.

## 2026-06-30 — RLS de products + remoção do legado no cadastro (DEC-012, Frente 4 final)

- **Objetivo:** isolar produtos por Portfólio autorizado (Hub) e remover a "origem legada" (Fornecedor) da tela de Produtos.
- **Banco (SQL Editor, HUB DEV):** substituída a policy `p_products` (FOR ALL por organização) por `products_sel/ins/upd/del`. Hub (`proprietario_hub`/`assistente`) só lê produtos de Portfólios autorizados (via `get_hub_id()`); Indústria e papéis legados leem/escrevem tudo; Hub não escreve. Artefatos `hubdev/bootstrap/rls_products.sql` (+ rollback que recria `p_products`).
- **Aplicação Web:** modal de Produto sem a seção "Origem (legado)" (Fornecedor/Categoria de fornecedor); selects de Catálogo (Portfólio→Categoria→Subcategoria) empilhados e encadeados; Preço/Unidade/MG/ML em 2×2. Listagem com filtro e coluna por Portfólio (substitui filtros legados). Commit `cbf4c05`, deploy em `hub-plataforma-dev.vercel.app`.
- **Observações:** estratégia por `get_user_role()` (não `hub_id is null`), pois há 1 `assistente` sem hub — que corretamente não vê produtos. Validado em produção.

## 2026-06-30 — RLS do Catálogo (correção do 500 ao criar Portfólio — DEC-012)

- **Objetivo:** corrigir falha em produção ("An error occurred in the Server Components render") ao criar Portfólio e antecipar a RLS por Hub do catálogo.
- **Causa raiz (diagnóstico):** tabela `portfolios` (e `categorias`/`subcategorias`/`hub_portfolios`) estava com **RLS habilitado e 0 policies** → `new row violates row-level security policy for table "portfolios"` no `insert` da Server Action `criarPortfolio`. SELECT retornava vazio; INSERT era negado.
- **Alterações:** aplicadas via SQL Editor no HUB DEV (`pnkgwfgjhijksfmofiot`).
- **Estruturas criadas:**
  - função `get_hub_id()` (`security definer`, padrão das helpers de RLS)
  - 4 policies por tabela (select/insert/update/delete) em `portfolios`, `categorias`, `subcategorias`, `hub_portfolios`
  - artefatos `hubdev/bootstrap/rls_catalogo.sql` (+ rollback)
- **Regra aplicada:** Indústria (admin/gestor/financeiro) vê tudo; admin/gestor escrevem; Hub/Assistente leem apenas Portfólios autorizados (`hub_portfolios.status='ativo'` via `get_hub_id()`).
- **Observações:** `products` (legado) não alterado. RLS por Hub do catálogo (era Frente 4 do Migrate) antecipada para as 4 tabelas novas. Validado: criação de Portfólio OK em produção.

## 2026-06-29 — Catálogo / Portfólio na Aplicação Web (Sprint Expand E4-app — DEC-012)

- **Objetivo:** materializar o catálogo da DEC-012 na Aplicação Web (telas restritas à Indústria), em 3 fatias aditivas.
- **Alterações:** código Next.js; build via `build:hubdev`; deploy de produção no Vercel.
- **Estruturas criadas:**
  - tipos `Portfolio`, `Categoria`, `Subcategoria`, `HubPortfolio` (`types/database.ts`)
  - rota `configuracoes/portfolios` (lista/CRUD) + `components/portfolios/{tabela,modal}-…`
  - rota `configuracoes/portfolios/[id]` (Categoria/Subcategoria + Hubs autorizados) + `gerenciar-categorias`, `autorizacao-portfolios`
  - rota `configuracoes/hubs/[id]` (Portfólios autorizados do Hub)
  - server actions de Portfólio, Categoria, Subcategoria e Autorização Hub↔Portfólio
  - item de menu e card em Configurações
- **Estruturas preservadas:** fluxo legado de produtos/fornecedores intocado.
- **Observações:** gating admin/gestor; sem RLS por Hub (Migrate). Commits `9efefc5`/`7cbd9ea`/`203d991`. Deploy alinhado ao local em `https://hub-plataforma-dev.vercel.app`.

## 2026-06-29 — Sprint Expand E4 (Catálogo / Portfólio — DEC-012)

- **Objetivo:** materializar, de forma aditiva, o catálogo oficial da DEC-012 (Portfólio → Categoria → Subcategoria → Produto) e a autorização operacional Hub↔Portfólio no HUB DEV (`pnkgwfgjhijksfmofiot`).
- **Alterações:** DDL aditivo aplicado via SQL Editor do HUB DEV.
- **Estruturas criadas:**
  - tabela `portfolios` (`id, organization_id, nome, descricao, ativo, criado_em, atualizado_em`; unique `organization_id+nome`)
  - tabela `categorias` (`id, organization_id, portfolio_id→portfolios, nome, ativo, criado_em`)
  - tabela `subcategorias` (`id, organization_id, categoria_id→categorias, nome, ativo, criado_em`)
  - tabela `hub_portfolios` (`id, organization_id, hub_id→hubs, portfolio_id→portfolios, status, criado_em, atualizado_em`; unique `hub_id+portfolio_id`)
  - colunas `products.portfolio_id`, `products.categoria_id`, `products.subcategoria_id` (uuid, nullable)
  - índices `idx_portfolios_org`, `idx_categorias_portfolio`, `idx_subcategorias_categ`, `idx_hubport_hub`, `idx_hubport_portfolio`, `idx_products_portfolio/categoria/subcategoria`
  - artefatos `hubdev/bootstrap/expand_catalogo.sql`, `hubdev/bootstrap/expand_catalogo_rollback.sql`
- **Estruturas preservadas:** `suppliers`, `supplier_categories`, `supplier_freight`, `freight_carriers`, `health_hubs` e demais — intocadas (legado/compat até Contract).
- **Observações:** aditivo puro; sem migração de dados; sem alteração de código/RLS. `hub_portfolios` referencia a tabela oficial `hubs` (nunca `health_hubs`). RLS por Hub e backfill ficam para Migrate.

## 2026-06-26 — Sprint Expand E1 (núcleo Hub + Carteiras)

- **Objetivo:** introduzir, de forma aditiva, o núcleo de domínio Hub + Carteira no HUB DEV (`pnkgwfgjhijksfmofiot`).
- **Alterações:** DDL aditivo aplicado via SQL Editor do HUB DEV.
- **Estruturas criadas:**
  - tabela `hubs` (`id, organization_id, nome, codigo, descricao, cnpj, email, telefone, logo_url, ativo, criado_em, atualizado_em`)
  - tabela `carteiras` (`id, organization_id, hub_id→hubs, nome, descricao, ordem, observacoes, ativo, criado_em, atualizado_em`)
  - coluna `contacts.carteira_id` (uuid, nullable, FK→`carteiras`)
  - índices `idx_hubs_org`, `idx_carteiras_hub`, `idx_carteiras_org`, `idx_contacts_carteira`
  - artefatos `hubdev/bootstrap/expand_e1.sql`, `hubdev/bootstrap/expand_e1_rollback.sql`
- **Estruturas preservadas:** `leads`, `deals`, `companies`, `quotes`, `orders`, `tasks` e demais — intocadas.
- **Observações:** aditivo puro; sem migração de dados; sem alteração de código/RLS.

## 2026-06-26 — Sprint E1 (conexão Aplicação Web ↔ HUB DEV)

- **Objetivo:** conectar a Aplicação Web ao HUB DEV e validar login, dashboard e seed.
- **Alterações:** `dotenv-cli`; scripts `dev:hubdev`/`build:hubdev`; chaves do HUB DEV em `.env.local.hubdev` (gitignored).
- **Estruturas criadas:** schema de compatibilidade (`hubdev/bootstrap/schema_compat.sql`) e seeds (`dev_fixtures.sql`) no HUB DEV; usuário de teste `dev@bootdigital.com.br` (org "Indústria DEV").
- **Estruturas preservadas:** todas.
- **Observações:** validado build + start (nunca `next dev`); login → `/painel` → dashboard → seed OK.

## 2026-06-25 — Fundação / Identidade

- **Objetivo:** bootstrap inicial e padronização de identidade para "Hub Plataforma".
- **Alterações:** commit inicial (`cb5ad3d`); refactor de identidade Fase 4 (`0d29c2b`) e Fase 5 (`01dba06`).
- **Estruturas criadas:** repositório, estrutura base da Aplicação Web, migrations legadas (referência).
- **Estruturas preservadas:** —
- **Observações:** as 55 migrations em `supabase/migrations/` são legado/referência e **não** são aplicadas no HUB DEV.
