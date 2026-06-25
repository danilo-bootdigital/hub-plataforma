# AUDITORIA DE PERFORMANCE — CRM DPRIME

> **Data:** 2026-06-16
> **Branch auditada:** `feature/pdf-paginacao-fix`
> **Escopo:** Investigação técnica de lentidão. **Nenhum código foi alterado.** Nenhuma correção foi aplicada.
> **Método:** Leitura de código (rotas, server actions, componentes), análise do diff `main...HEAD`, mapeamento de queries Supabase via agentes de exploração + revisão sênior independente (code reviewer).
>
> Toda afirmação marcada como **CONFIRMADO** tem evidência de arquivo:linha abaixo. **HIPÓTESE** = padrão suspeito que precisa de medição em runtime para fechar.

---

## 1. Resumo executivo

A lentidão tem **duas frentes independentes**:

**A) Download/geração do PDF de orçamento** — é a frente mais sentida. O custo NÃO veio das mudanças visuais recentes (fonte/cor/margem). A arquitetura cara **já existia** antes deste branch:
- Lança e fecha um **Chromium inteiro a cada clique** (sem reuso) → segundos por download.
- Executa a **mesma query pesada de `quotes` duas vezes** por download (na rota e novamente no preview-pdf).
- Usa `waitUntil: 'networkidle0'` (a espera mais lenta do Puppeteer), **redundante** com o `waitForSelector` que já existe.
- O template embute **logos remotas (`<img src>`) de URL arbitrária** que, sob `networkidle0`, **seguram a captura do PDF** até a imagem baixar (ou dar timeout de até 30s).

A **única regressão real introduzida no branch** é a troca da fonte global Geist → **Manrope com 5 pesos** (`app/layout.tsx`), que afeta levemente o app inteiro e, dentro do Puppeteer, pode somar latência de rede ao caminho crítico do PDF (HIPÓTESE).

**B) Navegação/páginas do dashboard** — independente do PDF. Há queries sem `.limit()` em tabelas que crescem (`order_items`, `quote_items`, `leads`), um **N+1 confirmado no pipeline**, e agregações feitas em JavaScript que deveriam ser SQL. Hoje podem estar "ok" com pouco volume, mas degradam conforme os dados crescem.

**O que provavelmente está deixando lento o "Baixar PDF":** lançamento de Chromium por request + logos remotas + query dupla, amplificados por `networkidle0`.
**O que provavelmente está deixando lenta a navegação:** queries amplas sem limite + N+1 no pipeline + agregação em JS.

---

## 2. Sintomas analisados

| # | Sintoma relatado | Frente | Veredito |
|---|------------------|--------|----------|
| 1 | Geração de PDF lenta | PDF | Causas confirmadas (Cap. 4) |
| 2 | Download/salvamento do PDF lento | PDF | Mesmo pipeline do #1; botão NÃO duplica request (ver 4.7) |
| 3 | Algumas páginas carregam devagar | Dashboard | Queries amplas/sem limite (Cap. 4) |
| 4 | Navegação geral lenta em partes | Dashboard / Global | Fonte global + queries pesadas pontuais |

---

## 3. Arquivos críticos encontrados

**Subsistema PDF**
- `app/api/orcamentos/[id]/pdf/route.ts` — rota server-side (Node runtime) que orquestra o Puppeteer.
- `app/(pdf)/orcamentos/[id]/preview-pdf/page.tsx` — página HTML que o Puppeteer abre e imprime.
- `lib/pdf/launch-browser.ts` — lança o Chromium (`@sparticuz/chromium` na Vercel; `CHROME_PATH` no container).
- `lib/pdf/print-url.ts` — monta a URL do preview.
- `components/orcamentos/orcamento-pdf-template.tsx` — template (582 linhas) com `<img>` de logos remotas.
- `components/orcamentos/botao-baixar-pdf.tsx` + `lib/pdf/download-pdf.ts` — botão e download client-side.
- `app/(pdf)/orcamentos/[id]/preview-pdf/print.css` — CSS de impressão (@page, page-break).

**Dashboard / queries**
- `app/(dashboard)/pipeline/page.tsx` — N+1 em `messages`.
- `app/(dashboard)/painel/page.tsx` — `order_items` sem limite (agregação em JS).
- `app/(dashboard)/relatorios/page.tsx` — `quote_items` sem limite (agregação em JS).
- `app/(dashboard)/caixa-de-entrada/page.tsx` — `leads` sem limite.
- `app/(dashboard)/pedidos/page.tsx` e `pedidos/[id]/page.tsx` — joins profundos + fallback sequencial.
- `app/(dashboard)/leads/[id]/page.tsx` — duas queries sequenciais para o mesmo dado.

**Global**
- `app/layout.tsx` — fonte Manrope (5 pesos) global.
- `components/{fornecedores,contatos,orcamentos}/...` — `xlsx` em import estático (client bundle).

---

## 4. Possíveis causas com evidência

### 4.1 — Chromium lançado e fechado a CADA request (sem pool) — **CONFIRMADO · impacto ALTO**
`app/api/orcamentos/[id]/pdf/route.ts:97` → `const browser = await launchBrowser()` e `:117` → `await browser.close()` no `finally`. Não há singleton/reuso.
`lib/pdf/launch-browser.ts:15-57`: na Vercel extrai `al2023.tar.br` do `@sparticuz/chromium` e sobe o processo Chromium; no container usa `CHROME_PATH`.
**Impacto:** cold start serverless tipicamente 2–5s; mesmo "quente", o launch custa centenas de ms a ~1–2s. É o **maior custo isolado** do botão "Baixar PDF".

### 4.2 — Logos remotas no template seguram a captura — **CONFIRMADO · impacto ALTO e intermitente**
`components/orcamentos/orcamento-pdf-template.tsx:211-214` → `<img src={org.logo_url}>` e `:523-526` → `<img src={hub?.logo_url}>`. URL remota arbitrária, **sem dimensões fixas** (`h-12 w-auto`), sem timeout próprio.
Combinado com `route.ts:104` `waitUntil: 'networkidle0'`, o PDF **só é capturado depois que essas imagens baixarem** (ou o host delas der timeout, até `timeout: 30_000`).
**Impacto:** se `logo_url` apontar para CDN lento/instável, o download "às vezes" demora muito — explica picos intermitentes de lentidão.

### 4.3 — Query pesada de `quotes` executada DUAS vezes por download — **CONFIRMADO · impacto MÉDIO-ALTO**
`route.ts:59-87`: SELECT em `quotes` com **~10 joins** (`responsavel, lead, contato→empresa, deal, aprovador, fornecedor→health_hubs, carrier, organizacao, itens`).
`preview-pdf/page.tsx:37-63`: **exatamente a mesma query** (o comentário na linha 35 admite ser idêntica).
Cada download = 2× a query pesada + 2× `auth.getUser()` + 2× lookup de `profiles`. A query da rota só serve para validar 404 e pegar `orcamento.numero` para o nome do arquivo — **todo o payload é descartado**, pois quem renderiza é a page.
**Impacto:** dobra a carga no Postgres por download.

### 4.4 — `waitUntil: 'networkidle0'` redundante — **CONFIRMADO · impacto MÉDIO**
`route.ts:104` usa `networkidle0` (espera 500ms sem **nenhuma** conexão de rede). É a estratégia mais lenta. Logo abaixo, `route.ts:107` já faz `waitForSelector('[data-pdf-template="ready"]')`, que **garante** que o template montou (o `<article>` raiz emite esse atributo — `orcamento-pdf-template.tsx:571`).
**Impacto:** `networkidle0` adiciona piso de +500ms e fica refém de qualquer fetch pendente (fonte/logos), enquanto o seletor já resolve o "pronto".

### 4.5 — Fonte Manrope remota dentro do PDF — **HIPÓTESE PROVÁVEL · impacto MÉDIO (no PDF)**
Regressão do branch: `app/layout.tsx:6-13` troca Geist por `Manrope({ weight: ["400","500","600","700","800"], display: "swap" })`; o template passou a usar `font-sans` (`orcamento-pdf-template.tsx:572`, diff confirmado).
Dentro do Puppeteer, a resolução da fonte é uma requisição de rede que **conta para o `networkidle0`**. Se no container EasyPanel o `next/font` não estiver servindo a fonte localmente (e cair em `fonts.gstatic.com`), soma latência ao caminho crítico do PDF.
**Precisa de:** trace de rede do `page.goto` para confirmar de onde a fonte é buscada.

### 4.6 — N+1 em `messages` no Pipeline — **CONFIRMADO · impacto ALTO (cresce com volume)**
`app/(dashboard)/pipeline/page.tsx:100-107`: `conversaIds.map((cId) => supabase.from('messages')...eq('conversation_id', cId).limit(3))` seguido de `Promise.all`. **Uma query por conversa.** Com N deals/conversas, N queries paralelas só para buscar as últimas 3 mensagens.
**Correção segura (não aplicar agora):** uma única query `.in('conversation_id', conversaIds)` e agrupar as 3 últimas por conversa no client.

### 4.7 — Botão de download NÃO duplica request — **CONFIRMADO (ponto SADIO)**
`components/orcamentos/botao-baixar-pdf.tsx:22-23` tem guard `if (loading) return` + `disabled={loading}`. `lib/pdf/download-pdf.ts` faz **um único** `fetch`. O clique não dispara renderização nem request duplicado. A "duplicação" real está no **servidor** (4.3), não no clique.

### 4.8 — Diferença preview × impressão — **sem problema de performance**
`print.css` trata `@page` (margem só da 2ª página via `@page :first`), `page-break-inside`, `thead` repetido. `route.ts:114` usa `preferCSSPageSize: true` (mudança do branch, custo de perf zero). Diferenças preview/print são de layout, não de velocidade.

### 4.9 — Queries sem `.limit()` em tabelas que crescem — **CONFIRMADO · impacto cresce com dados**
- `painel/page.tsx:187-193` — `order_items` via `.in('order_id', ...)` **sem `.limit()`**; agregação do gráfico mensal feita em JS.
- `relatorios/page.tsx:250-256` — `quote_items` do período **sem `.limit()`**; soma/agrupamento em JS (deveria ser `SUM`/`GROUP BY` no SQL).
- `caixa-de-entrada/page.tsx:58-62` — `leads` (`select('id')`) do vendedor **sem `.limit()`**, carregando todos os IDs para montar um `Set` client-side.

### 4.10 — Joins profundos e fallback sequencial — **CONFIRMADO · impacto MÉDIO**
- `pedidos/page.tsx:23-28` — join aninhado 3 níveis (`quote→lead→contato`); há `.limit(100)`, mas o payload por linha é grande.
- `pedidos/[id]/page.tsx:48-70` — cascata sequencial `ordem → quote → contato/lead` (2–3 queries extras) quando o dado não vem normalizado.
- `leads/[id]/page.tsx:46-65` — duas queries sequenciais buscando o **mesmo** dado (`cpf_cnpj, endereco`) por telefone e depois por nome; poderia ser um `.or(...).limit(1)`.

### 4.11 — `xlsx` em import estático no client bundle — **CONFIRMADO · impacto MÉDIO (rotas de importação)**
Import **estático** em 3 client components:
- `components/fornecedores/form-importacao-produtos.tsx:5`
- `components/contatos/form-importacao.tsx:5`
- `components/orcamentos/importar-itens-planilha.tsx:4`
`xlsx` (SheetJS) é grande (~400–900 KB). Já existe o padrão certo (lazy) em `components/relatorios/botoes-exportar.tsx:188` (`await import('xlsx')`). `jspdf`/`html2canvas` **já** usam import dinâmico (sadio). `puppeteer-core`/`@sparticuz/chromium` ficam só no server (não vazam para o client — sadio).

### 4.12 — Fonte global Manrope (5 pesos) — **HIPÓTESE · impacto BAIXO (global)**
`app/layout.tsx`: 5 arquivos de fonte solicitados em **todo** o app. `display: "swap"` evita bloqueio de render; total estimado 100–180 KB latin. Não é a causa principal da lentidão geral, mas é a única mudança de branch que toca o app inteiro.

---

## 5. Causas confirmadas

1. **Chromium sem reuso** a cada download (4.1) — ALTO.
2. **Logos remotas** seguram a captura sob `networkidle0` (4.2) — ALTO/intermitente.
3. **Query de `quotes` duplicada** por download (4.3) — MÉDIO-ALTO.
4. **`networkidle0` redundante** com `waitForSelector` (4.4) — MÉDIO.
5. **N+1 em `messages`** no pipeline (4.6) — ALTO com volume.
6. **Queries sem `.limit()`** em `order_items`/`quote_items`/`leads` (4.9) — cresce com dados.
7. **`xlsx` no client bundle** estático (4.11) — MÉDIO nas rotas de importação.

## 6. Hipóteses prováveis

1. **Fonte Manrope buscada remotamente** dentro do Puppeteer somando ao `networkidle0` (4.5). Confirmar com trace de rede.
2. **Fonte global** afetando levemente a navegação do app inteiro (4.12). Confirmar com Lighthouse antes/depois.
3. Joins profundos de pedidos (4.10) pesando conforme catálogo cresce.

---

## 7. Riscos de mexer sem cuidado

- **Reuso de browser (pool):** se fechar `page` mas vazar contexto/abas, há risco de memory leak no processo Node. Em serverless o singleton deve viver só na instância quente. Testar com vários downloads seguidos.
- **Trocar `networkidle0`:** se trocar para `domcontentloaded` sem garantir o decode das imagens/fontes, o PDF pode sair **sem logo** ou com fonte fallback. A troca precisa vir junto com espera explícita de `img.decode()` e/ou logos em base64.
- **Logos em base64:** aumenta o tamanho do HTML; precisa de cache para não rebaixar imagem grande a cada download.
- **Remover a query da rota (4.3):** a rota ainda precisa validar 404, RLS por `organization_id` e pegar `orcamento.numero` para o filename — **não remover totalmente**, apenas reduzir o SELECT.
- **Adicionar `.limit()` em relatórios/painel:** se cortar dados, os totais dos gráficos mudam. A correção certa é **agregar no SQL**, não simplesmente truncar.
- **N+1 do pipeline:** ao trocar por `.in()`, garantir o "3 últimas por conversa" no client para não mudar o que aparece na tela.
- **Lazy-load do `xlsx`:** garantir que o handler aguarde o `await import` antes de usar `read/utils`.

---

## 8. Plano de correção seguro em fases

**Fase 0 — Medir (sem alterar comportamento):** instrumentar tempos (Cap. 6 do briefing) antes de qualquer mudança, para ter baseline.

**Fase 1 — PDF, ganhos grandes e seguros:**
1. Reduzir o SELECT da rota para `select('numero')` (4.3).
2. Trocar `networkidle0` → `domcontentloaded` + `waitForSelector` (já existe) + `img.decode()` (4.4).
3. Pré-resolver logos para base64 server-side (4.2).

**Fase 2 — PDF, ganho maior e mais sensível:**
4. Reuso de browser (singleton/pool), fechando só a `page` (4.1). Requer teste de estabilidade.
5. Confirmar/garantir fonte local (não-gstatic) no PDF (4.5).

**Fase 3 — Dashboard:**
6. N+1 do pipeline → `.in()` (4.6).
7. Agregar `order_items`/`quote_items` no SQL; `.limit()`/range em `leads` da caixa de entrada (4.9).
8. Lazy-load `xlsx` (4.11).

**Fase 4 — Refinos:** joins de pedidos, fallback sequencial (4.10), avaliar pesos da fonte global (4.12).

---

## 9. Correções rápidas de baixo risco

- **Reduzir SELECT da rota** para `select('numero')` (4.3) — elimina ~50% do custo de DB por download, sem mexer no que é renderizado.
- **Lazy-load do `xlsx`** nos 3 client components (4.11) — padrão já existente no projeto.
- **N+1 do pipeline → `.in()`** (4.6) — mesma saída de tela, menos queries.

## 10. Correções médias

- **Trocar `networkidle0` + esperar decode de imagens** (4.4) — exige validar que logo/fonte aparecem no PDF.
- **Logos em base64 server-side** (4.2) — remove dependência de host externo.
- **Agregar relatórios/painel no SQL** (4.9) — muda a forma de calcular totais (validar números).

## 11. Correções que exigem cuidado

- **Reuso de browser / pool de Chromium** (4.1) — maior ganho, maior risco (leaks/estabilidade em serverless). Só após Fases 1.
- **Auto-hospedar/embutir fonte no PDF** (4.5) — precisa de trace para confirmar a causa antes.

---

## 12. O que NÃO deve ser feito agora

- ❌ Não reescrever o subsistema de PDF do zero.
- ❌ Não trocar Puppeteer por outra abordagem (window.print / html2canvas) — o histórico mostra que já houve idas e vindas (commits `1e1fd91`, `4d14294`, `034bff1`); manter o caminho atual.
- ❌ Não remover a query da rota inteira (perde validação 404/RLS e o número do arquivo).
- ❌ Não truncar dados de relatório com `.limit()` cego — agregar no SQL.
- ❌ Não criar migrations/índices "no escuro" sem antes medir as queries reais (`EXPLAIN ANALYZE`).
- ❌ Não reverter a fonte Manrope sem medir — o impacto global é provavelmente baixo.

---

## 13. Checklist antes de qualquer alteração

- [ ] Baseline medido (tempo de `launchBrowser`, `page.goto`, query, tamanho do PDF) — Cap. 6.
- [ ] Branch dedicada a partir de `main` (lembrete: o auto-deploy do EasyPanel **sempre builda `main`** — validar em preview antes de mergear).
- [ ] Um orçamento de teste **com logo** e um **sem logo** (cobrir o caminho de imagem remota).
- [ ] Um orçamento com **muitos itens** (`quote_items`) para medir a query pesada.
- [ ] Verificar que o PDF gerado mantém logo, fonte, paginação e margens **idênticos** ao atual.
- [ ] Rodar `graphify update .` após qualquer mudança de código.
- [ ] Testar download repetido (2–3 seguidos) se mexer em reuso de browser.

---

## 14. Ordem recomendada de execução

1. **Medir baseline** (Fase 0).
2. **Reduzir SELECT da rota** (4.3) — rápido, seguro, ~50% menos DB por download.
3. **N+1 pipeline → `.in()`** (4.6) — rápido, seguro.
4. **Lazy-load `xlsx`** (4.11) — rápido, seguro.
5. **`networkidle0` → `domcontentloaded` + decode** (4.4) — médio.
6. **Logos em base64** (4.2) — médio.
7. **Agregação SQL em relatórios/painel** (4.9) — médio, validar números.
8. **Reuso de browser** (4.1) — alto ganho, maior risco; por último, com testes.
9. **Fonte do PDF / trace** (4.5) e refinos (4.10, 4.12).

---

## Respostas diretas

**O que provavelmente está deixando o CRM lento**
- **Download de PDF:** Chromium lançado a cada clique + logos remotas presas no `networkidle0` + query de `quotes` duplicada. (Não foram as mudanças visuais do branch.)
- **Navegação:** queries amplas sem `.limit()`, N+1 no pipeline e agregações em JS.
- **Possível efeito leve global:** fonte Manrope (5 pesos) — hipótese de impacto baixo.

**O que deve ser corrigido primeiro**
Reduzir o SELECT da rota (4.3), N+1 do pipeline (4.6) e lazy-load do `xlsx` (4.11) — baixo risco, ganho imediato. Em seguida `networkidle0`/decode (4.4) e logos base64 (4.2).

**O que NÃO deve ser mexido agora**
Arquitetura do PDF (não reescrever), abordagem Puppeteer (não trocar), índices/migrations sem medição, e a fonte global (sem trace).

**Quais correções são seguras**
SELECT reduzido na rota, N+1 → `.in()`, lazy-load `xlsx`. São mudanças locais, sem alterar o que o usuário vê.

**Quais correções podem quebrar o CRM se feitas errado**
- Reuso de browser (4.1): leak/estabilidade em serverless.
- Trocar `networkidle0` sem esperar imagens (4.2/4.4): PDF sem logo ou com fonte errada.
- `.limit()` cego em relatórios (4.9): totais de gráfico incorretos.

---

*Auditoria de leitura/medição. Nenhum arquivo de código foi modificado. Para aplicar qualquer item, aprovar fase a fase conforme Cap. 8.*
