# RELATÓRIO DE IMPACTO — Download de PDF do Orçamento (Modelo Novo)

**Branch:** `feature/pdf-html-template-pr1`
**Data:** 2026-06-15
**Fase:** 1 — Entendimento da Arquitetura (NÃO IMPLEMENTADO)
**Status:** Aguardando aprovação + decisão de estratégia
**Revisão 2:** escopo ampliado após decisão do usuário — *eliminar o jsPDF (modo antigo) e
manter apenas o formato novo (HTML).*

---

## 0. Divergência resolvida (produção vs. esta branch)

O usuário relatou que "Exportar PDF usa o modo antigo". **Isso está correto — para produção.**

| Ambiente | `app/api/orcamentos/[id]/pdf/route.ts` | Formato gerado |
|---|---|---|
| **`main` (produção)** | `import { gerarPdf } from 'orcamento-pdf-generator'` (jsPDF) | 🟠 Antigo (jsPDF) |
| **`feature/pdf-html-template-pr1` (esta branch)** | Puppeteer renderizando `/preview-pdf` (template HTML) | 🟢 Novo (HTML) |

➡️ Esta branch (+1009 linhas) **já é o trabalho de substituir o jsPDF pelo formato novo.**
O objetivo passa a ser **finalizar essa substituição**: formato novo como **único** caminho de PDF
do orçamento + remover o jsPDF do orçamento.

⚠️ **Restrição importante (evita regressão):** as libs `jspdf`, `jspdf-autotable` e `html2canvas`
**também são usadas fora do orçamento** — `components/relatorios/botoes-exportar.tsx` e
`components/whatsapp/modal-exportar-conversa.tsx`. **NÃO serão removidas do `package.json`.**
A eliminação se restringe aos arquivos de PDF **do orçamento**.

---

## 1. Sintoma relatado

Na **tela de Preview do PDF** (`/orcamentos/[id]/preview-pdf`), ao clicar em **"Baixar PDF"**, o
arquivo **não é baixado** — o navegador abre a janela de impressão (ou aparenta não fazer nada),
em vez de gerar um download direto do PDF. Ocorre no **modelo novo** (template HTML), não no
modelo antigo (jsPDF).

---

## 2. Causa raiz (com evidências)

Existem **duas causas independentes**, ambas confirmadas por leitura de código + histórico git:

### Causa A — O botão do Preview não baixa: usa `window.print()` (por design temporário)

`components/orcamentos/botao-baixar-pdf.tsx:22-27`:

```tsx
function handleClick() {
  if (typeof window !== 'undefined') {
    window.print()   // abre o diálogo de impressão; NÃO baixa arquivo
  }
}
```

O próprio comentário do arquivo (linhas 9-12) declara que isto é **"solução temporária"** e que
"quando o serviço estiver pronto, este botão volta a chamar `/api/orcamentos/{id}/pdf`".

Histórico git confirma a regressão deliberada:
- `ea9f853 feat(orcamentos): PR 2 — Puppeteer + geração de PDF real`
- `1e1fd91 feat(pdf): botão Baixar PDF chama window.print() (solução temporária)`
- `4d14294 fix(pdf): reescrever print.css para window.print() gerar A4 correto`

➡️ **Comportamento atual = esperado pelo código, mas não pelo usuário.** O usuário quer download
direto; o botão entrega apenas o diálogo de impressão (passo manual "Salvar como PDF").

### Causa B — O `print.css` provavelmente não carrega (404)

`app/(pdf)/orcamentos/[id]/preview-pdf/page.tsx:69`:

```tsx
<link rel="stylesheet" href="./print.css" />
```

O `print.css` está dentro de `app/(pdf)/.../preview-pdf/`. O Next.js **não serve arquivos `.css`
da pasta `app/` como assets estáticos** (estáticos vivem em `/public`; CSS de componente é
importado via `import './x.css'`). O `<link href="./print.css">` resolve para
`/orcamentos/[id]/preview-pdf/print.css`, rota inexistente → **404**.

➡️ Consequência: mesmo quando o `window.print()` abre o diálogo, o `@page { size: A4; margin: 0 }`
e os overrides de `[data-pdf-page]` **não são aplicados** → impressão com margens/tamanho errados.
*(A confirmar em runtime na Fase 2 — ver §6 Estratégia.)*

---

## 3. Inconsistência arquitetural encontrada (BLOQUEIO p/ reportar)

Há **dois caminhos paralelos de "baixar PDF" para o mesmo dado**, com comportamentos divergentes:

| Caminho | Componente | Mecanismo | Resultado |
|---|---|---|---|
| Tela de detalhe → "Exportar PDF" | `ExportarPdfButton` (`exportar-pdf-button.tsx`) | `fetch('/api/orcamentos/{id}/pdf')` → blob → download | ✅ Download real (Puppeteer) |
| Tela de Preview → "Baixar PDF" | `BotaoBaixarPdf` (`botao-baixar-pdf.tsx`) | `window.print()` | ⚠️ Sem download (diálogo manual) |

A infraestrutura para download real **já existe e está configurada** (rota Puppeteer +
`next.config.ts`). O botão do Preview simplesmente **não a utiliza**. Isso é código com
comportamento duplicado/divergente — exatamente o que as regras do projeto pedem para evitar.

---

## 4. Módulos, dependências e fluxos afetados

### Arquivos no fluxo (mapeados via Graphify)

| Arquivo | Papel | Comunidade |
|---|---|---|
| `app/(pdf)/orcamentos/[id]/preview-pdf/page.tsx` | Renderiza preview + botão | 66 |
| `app/(pdf)/orcamentos/[id]/preview-pdf/print.css` | Estilos de impressão A4 | 66 |
| `components/orcamentos/botao-baixar-pdf.tsx` | **Alvo principal** (window.print) | 66 |
| `components/orcamentos/exportar-pdf-button.tsx` | Padrão de download a **reutilizar** | 12 |
| `app/api/orcamentos/[id]/pdf/route.ts` | Rota Puppeteer (download real) | 60 |
| `lib/pdf/launch-browser.ts` | Lança Chromium (Vercel/local) | 60 |
| `lib/pdf/print-url.ts` | Monta URL interna p/ Puppeteer | 60 |
| `lib/pdf/auth-cookie.ts` | Repassa cookie de sessão p/ Puppeteer | 60 |
| `components/orcamentos/orcamento-pdf-template.tsx` | Template HTML do PDF | 33/66 |
| `app/(dashboard)/orcamentos/[id]/page.tsx` | Monta `ExportarPdfButton` + `BotaoPreviewPdfNovo` | 12 |
| `next.config.ts` | Config chromium p/ deploy | 88 |

### Dependências diretas
- `puppeteer-core`, `@sparticuz/chromium` (rota API)
- `@/components/ui/button` (Button) — usado por todos os botões
- Supabase server client (`createClient`) — auth + query `quotes`

### Dependências indiretas
- Tabelas Supabase consultadas (read-only): `quotes`, `quote_items`, `profiles`, `leads`,
  `contacts`, `companies`, `deals`, `suppliers`, `health_hubs`, `freight_carriers`,
  `organizations`. **Nenhuma escrita** — fluxo é somente leitura.
- RLS: a rota e a page filtram por `organization_id` do perfil autenticado.

### Hooks / Providers / Rotas / APIs
- **Hooks:** nenhum customizado no fluxo de download.
- **Providers:** nenhum afetado.
- **Rota API:** `GET /api/orcamentos/[id]/pdf` (já existente).
- **Route group:** `(pdf)` — layout isolado para o preview.

---

## 5. O que será alterado / O que pode quebrar / Riscos

### O que **provavelmente** será alterado (depende da estratégia escolhida — §6)
- `components/orcamentos/botao-baixar-pdf.tsx` (trocar `window.print()` pelo download real **ou**
  corrigir o carregamento do `print.css`).
- Possivelmente `app/(pdf)/.../preview-pdf/page.tsx` (se a Causa B for corrigida).

### O que **NÃO** será alterado
- Rota `/api/orcamentos/[id]/pdf`, `lib/pdf/*`, `next.config.ts` (já corretos).
- `orcamento-pdf-template.tsx`, queries Supabase, RLS, policies, tabelas.
- Modelo antigo (`orcamento-pdf-generator.ts`, `page.backup.tsx`) — permanece intocado.

### O que pode quebrar / Riscos

| Risco | Severidade | Observação |
|---|---|---|
| **Puppeteer instável na Vercel** (Estratégia A) | 🔴 Alta | O histórico mostra ≥5 commits brigando com `@sparticuz/chromium` no Vercel Fluid Compute. O `window.print()` foi adotado *porque* o Puppeteer não estava confiável. **Precisa validar que `/api/orcamentos/[id]/pdf` retorna 200 em produção** antes de religar o botão nele. |
| Cold start / timeout (60s) na geração Puppeteer | 🟡 Média | `maxDuration = 60`; PDFs grandes podem demorar. |
| `print.css` 404 (Estratégia B) | 🟡 Média | Corrigir o carregamento do CSS sem quebrar o layout de tela. |
| Regressão visual no preview | 🟢 Baixa | Mudança isolada no botão; template não muda. |

---

## 6. Estratégia de implementação (formato novo como único caminho)

Decisão do usuário: **trabalhar somente com o formato novo (HTML) e eliminar o jsPDF.** A estratégia
tem **duas partes** — (6.1) fazer o download do formato novo funcionar e (6.2) remover o jsPDF morto
do orçamento.

### 6.1 — Fazer o download do formato novo funcionar (corrige o bug original)
- Alterar `BotaoBaixarPdf` (tela de Preview) para baixar via a **rota Puppeteer já existente**
  (`fetch('/api/orcamentos/{id}/pdf')` → blob → âncora → download), **reutilizando exatamente o
  padrão de `ExportarPdfButton`**. Isso unifica os dois caminhos num só mecanismo.
- **Alteração mínima:** ~15 linhas em `botao-baixar-pdf.tsx`. Sem duplicação (mesma rota/padrão).
- 🔴 **Pré-requisito que gateia TUDO:** confirmar que a rota Puppeteer responde **200** nesta branch
  (dev/preview). O `window.print()` foi adotado como paliativo *porque* o Puppeteer estava instável
  na Vercel. **Se o Puppeteer não funcionar, não há "download de formato novo" possível ainda** —
  e precisamos decidir (corrigir Puppeteer primeiro) antes de qualquer remoção. Sem gambiarra.

### 6.2 — Eliminar o jsPDF do orçamento (limpeza de modo antigo)
Arquivos **já desconectados nesta branch** (confirmado via `graphify affected "gerarPdf"` → *No
affected nodes found*) — candidatos a remoção:

| Arquivo | Situação | Ação proposta |
|---|---|---|
| `components/orcamentos/orcamento-pdf-generator.ts` | jsPDF; 0 importadores (só citado em comentários da route) | 🗑️ Remover |
| `components/orcamentos/botao-exportar-pdf.tsx` | `BotaoExportarPdf`; usado só por `page.backup.tsx` | 🗑️ Remover |
| `app/(dashboard)/orcamentos/[id]/page.backup.tsx` | Página antiga (backup, não é rota ativa) | 🗑️ Remover |
| `components/orcamentos/acoes-orcamento.tsx.bak` | Backup obsoleto | 🗑️ Remover |
| `components/orcamentos/botao-baixar-pdf-placeholder.tsx` | `BotaoBaixarPdfPlaceholder`; 0 importadores | 🗑️ Remover (confirmar) |
| Comentários sobre jsPDF em `route.ts` (linhas 18-21, 39) | Referenciam arquivo a ser removido | ✏️ Atualizar texto |

**NÃO remover:** `jspdf`, `jspdf-autotable`, `html2canvas` do `package.json` (usados por relatórios e
WhatsApp). **NÃO tocar:** `orcamento-pdf-template.tsx`, `lib/pdf/*`, `next.config.ts`, queries, RLS.

### Plano de execução (após aprovação)
1. `graphify query` / `explain` / `path` / `affected` (✔️ feito nesta fase).
2. **Verificar runtime da rota Puppeteer** nesta branch **antes** de editar (gate do 6.1).
3. 6.1: alteração mínima em `botao-baixar-pdf.tsx`, reutilizando o padrão de `ExportarPdfButton`.
4. 6.2: remover os arquivos mortos listados; ajustar comentários da route.
5. `npm run build` + `tsc` + ESLint para garantir ausência de imports órfãos / build quebrado.
6. `graphify update .` + `graphify query` novamente.
7. Gerar `AUDITORIA_FINAL.md` (Fase 3).

---

## 7. Decisões pendentes do aprovador

1. 🔴 **A rota Puppeteer do formato novo funciona nesta branch?** (Não confundir com o "Exportar PDF"
   de produção, que é jsPDF.) Posso **testar localmente** (`npm run dev` + chamar a rota) se você
   autorizar, OU você valida num preview. **Isso gateia o 6.1.**
2. **Confirmar escopo de remoção (6.2):** remover os 5 arquivos do modo antigo do orçamento? Mantendo
   as libs jsPDF (compartilhadas por relatórios/WhatsApp).
3. **Fazer 6.1 e 6.2 juntos** neste ciclo, ou só o 6.1 (corrigir download) agora e a limpeza depois?

---

## 8. Verificação do gate (Puppeteer local) — ✅ APROVADO

Smoke test executado replicando `launchBrowser()` (branch dev = Chrome local) +
`page.pdf({format:'A4'})` + `waitForSelector('[data-pdf-template="ready"]')`:

```
[smoke] launching: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
[smoke] OK — PDF bytes: 18685
/tmp/smoke.pdf: PDF document, version 1.4, 1 pages
```

➡️ Mecanismo Puppeteer → PDF A4 **funciona localmente**. Gate do §6.1 liberado.
⚠️ Não cobre confiabilidade do deploy Vercel (`@sparticuz/chromium`) — validar em preview antes do merge.

**Decisão de escopo (usuário):** executar **6.1 (corrigir download) + 6.2 (eliminar jsPDF) juntos.**

> **Nenhuma linha de código de implementação foi escrita.** Aguardando o "aprovado" final para FASE 2.
