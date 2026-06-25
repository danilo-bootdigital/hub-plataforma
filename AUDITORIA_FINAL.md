# AUDITORIA FINAL — Parte 1: Download de PDF do Orçamento (formato novo)

**Branch:** `feature/pdf-html-template-pr1`
**Data:** 2026-06-15
**Escopo executado:** Parte 1 apenas (aprovação parcial). Parte 2 (remoção de arquivos mortos) **NÃO** executada.

---

## 1. Objetivo da alteração

Corrigir o botão **"Baixar PDF"** da tela de Preview (`/orcamentos/[id]/preview-pdf`), que usava
`window.print()` (não baixava arquivo), para baixar o PDF **do formato novo** via a rota Puppeteer
**já existente** `/api/orcamentos/[id]/pdf` — reutilizando o mesmo padrão do `ExportarPdfButton`.

---

## 2. Arquivos alterados

| Arquivo | Tipo | Linhas (≈) | Mudança |
|---|---|---|---|
| `lib/pdf/download-pdf.ts` | **NOVO** (util, não-componente) | +29 | Função única `baixarOrcamentoPdf()` (fetch→blob→download) |
| `components/orcamentos/botao-baixar-pdf.tsx` | Alterado | +30 / −34 | Remove `window.print()`; usa o util; estado de loading + tratamento de erro |
| `components/orcamentos/exportar-pdf-button.tsx` | Alterado | +1 / −18 | Substitui lógica inline pelo util (DRY); comportamento idêntico |

**Total:** 1 arquivo novo (29 linhas) + 2 arquivos alterados (≈31 inserções / 52 remoções).
Saldo líquido: **−21 linhas** no código de componentes (lógica consolidada no util).

---

## 3. Dependências impactadas

- **Rota reutilizada (sem alteração):** `GET /api/orcamentos/[id]/pdf` (Puppeteer). **Nenhuma rota nova.**
- **Grafo (graphify):** `baixarOrcamentoPdf()` — grau 3, importado por `botao-baixar-pdf.tsx` e
  `exportar-pdf-button.tsx`. Fonte única confirmada.
- **Libs npm:** nenhuma adicionada/removida. `jspdf`/`html2canvas` intactos (uso em relatórios/WhatsApp preservado).
- **Componente `Button`** e ícones `lucide-react` (`Printer`, `Loader2`, `FileDown`): já existentes.

---

## 4. Checklist de auditoria

| Item | Resultado | Evidência |
|---|---|---|
| **Código morto criado?** | ❌ Não | O util é consumido por 2 componentes (graphify grau 3). |
| **Código duplicado criado?** | ❌ Não | Lógica de download unificada em `lib/pdf/download-pdf.ts`; a versão inline de `ExportarPdfButton` foi removida. |
| **Imports não utilizados?** | ❌ Não | ESLint exit 0 nos 3 arquivos. `tsc --noEmit` exit 0. |
| **Funções órfãs?** | ❌ Não | `baixarOrcamentoPdf` referenciada pelos 2 botões. |
| **Rotas quebradas?** | ❌ Não | Build lista `ƒ /api/orcamentos/[id]/pdf` e `ƒ /orcamentos/[id]/preview-pdf`. Nenhuma rota nova/removida. |
| **Queries quebradas?** | ❌ Não | Nenhuma query Supabase tocada (a alteração é client-side de UI). |
| **Policies afetadas?** | ❌ Não | Nenhuma policy alterada. |
| **RLS afetada?** | ❌ Não | A rota mantém o filtro por `organization_id` do perfil autenticado (inalterada). |
| **Build pode quebrar?** | ❌ Não | `✓ Compiled successfully in 8.1s`. |
| **`window.print()` removido?** | ✅ Sim | `grep window.print` → só aparece em comentário; chamada eliminada. |

---

## 5. Possíveis regressões (análise)

| Cenário | Risco | Mitigação |
|---|---|---|
| `ExportarPdfButton` (tela de detalhe) — comportamento alterado pela refatoração | 🟢 Baixo | Mesma rota, mesmo fetch/blob/download, mesmo `alert` de erro. Único delta: erro de `!response.ok` agora cai no `catch` (antes era `return`) — em ambos os casos o usuário vê o `alert`. Comportamento visível idêntico. |
| `BotaoBaixarPdf` sem `numero` → nome de arquivo `orcamento-0.pdf` | 🟢 Baixo | A page de preview sempre passa `numero={orcamento.numero}`. Fallback `?? 0` evita `undefined`. |
| Qualidade visual do PDF gerado (margens/A4) | 🟡 A validar | Depende da rota Puppeteer + template; **não alterado** nesta Parte 1. Ver §6 item 2. |
| Confiabilidade do Puppeteer no deploy Vercel | 🟡 A validar | `next.config.ts` já configurado (chromium@149). Validar em preview — ver §6 item 3. |

---

## 6. Evidências e validação

### ✅ Já comprovado (local)
1. **Build:** `✓ Compiled successfully in 8.1s` (Next 15 / Turbopack).
2. **TypeScript:** `tsc --noEmit` → exit 0.
3. **ESLint:** exit 0 nos 3 arquivos.
4. **Mecanismo Puppeteer→PDF (smoke test):** gerou PDF A4 válido (18.685 bytes, 1 página) usando
   `launchBrowser` (Chrome local) + `page.pdf({format:'A4'})` + seletor `[data-pdf-template="ready"]`.
5. **Dev server:** `✓ Ready in 607ms`, sem erros; rota protegida por middleware (`307 → /login` sem sessão).
6. **Graphify:** `window.print()` eliminado; util com fonte única (grau 3).

### ⏳ Validação funcional pendente (sua — itens que você listou)
Não foi possível executar E2E completo localmente por exigir **login com sessão real** (sem credenciais).
Runbook para validar:
1. **Download funcionando:** `npm run dev` → login → abrir orçamento → Preview → "Baixar PDF" → confirmar arquivo `orcamento-<n>.pdf` baixado.
2. **PDF novo abrindo corretamente:** abrir o PDF baixado e conferir layout do template novo.
3. **PDF novo na Vercel:** deploy preview → repetir o teste (valida `@sparticuz/chromium`).
4. **Sem regressões:** confirmar que "Exportar PDF" (tela de detalhe) continua baixando igual.

---

## 7. Conformidade com as restrições da aprovação parcial

- ✅ Corrigido o botão "Baixar PDF" do Preview; `window.print()` removido.
- ✅ Reutilizado o padrão do `ExportarPdfButton`; rota existente; **sem nova rota**.
- ✅ **Sem novo componente** (apenas função utilitária); **sem duplicação de lógica**.
- ✅ **Parte 2 NÃO executada** — nenhum arquivo removido:
  `orcamento-pdf-generator.ts`, `botao-exportar-pdf.tsx`, `page.backup.tsx`,
  `acoes-orcamento.tsx.bak`, `botao-baixar-pdf-placeholder.tsx` permanecem intactos.

> Próximo passo: validação funcional completa (§6). Somente após isso → 2ª auditoria para remoção dos arquivos mortos (Parte 2).
