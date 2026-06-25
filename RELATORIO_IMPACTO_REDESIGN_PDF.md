# RELATÓRIO DE IMPACTO — Redesign Visual do PDF (HTML DPRIME)

**Branch:** `feature/pdf-html-template-pr1` · **Data:** 2026-06-15
**Natureza:** auditoria de impacto (somente leitura). **Nada implementado / sem commit / sem push.**
**Diretriz da próxima fase:** *PDF corporativo ≠ dashboard* — informação em 1º plano, ícones quase decorativos.

## Arquivos analisados
- `components/orcamentos/orcamento-pdf-template.tsx` (alvo do redesign)
- `app/(pdf)/orcamentos/[id]/preview-pdf/page.tsx` (host do template + `<link print.css>`)
- `app/api/orcamentos/[id]/pdf/route.ts` (Puppeteer)
- `app/(pdf)/orcamentos/[id]/preview-pdf/print.css`

---

## 1. Mapeamento de dependências

| Pergunta | Resposta (com evidência) |
|---|---|
| Quem **importa** `OrcamentoPdfTemplate`? | **Só** `preview-pdf/page.tsx`. (grep + graphify: degree 2) |
| Quem **usa** o HTML gerado? | A página de preview (tela) **e** o Puppeteer (`route.ts` abre `/preview-pdf?print=1`). Mesmo componente nos dois. |
| Páginas públicas (`app/public`, `app/proposta`) usam? | **Não.** |
| Quem depende da **estrutura DOM**? | **O Puppeteer depende de UM seletor:** `[data-pdf-template="ready"]` no `<article>` raiz (`route.ts:107` `waitForSelector`). Nada mais inspeciona o DOM. |

**Se eu alterar apenas HTML/CSS do template, o que é afetado?**
- ✅ Afeta a **aparência** do preview (tela) **e** do PDF — simultaneamente (é o mesmo componente). Esperado.
- ❌ **NÃO** afeta: download, rota API, query, banco, `next.config.ts`, Puppeteer (desde que o atributo `data-pdf-template="ready"` permaneça), nem qualquer outra página (só preview importa).
- **Raio de impacto: 1 componente + 1 página de preview.** Pequeno e contido.

---

## 2. Risco de regressão (por bloco)

| Bloco | Risco | Por quê |
|---|---|---|
| Header | 🟢 Baixo | Só classes/tamanhos; sem lógica. |
| Cards (Cliente/Nota/Entrega) | 🟡 Médio | Muitos campos condicionais; reescrever markup pode dropar um campo por engano. |
| Produtos (tabela) | 🟡 Médio | Mexer em colunas/larguras impacta paginação; manter `<thead>`/estrutura. |
| Resumo financeiro | 🟢 Baixo | Bloco isolado; cálculo de desconto já validado. |
| Dados comerciais | 🟢 Baixo | Já está após o resumo; só estilo + dobrar Observações. |
| Rodapé | 🟢 Baixo | Remoção de campos; trivial. |
| **Quebra de página** | 🟡 Médio | `print:break-inside-avoid` por seção; tabela longa precisa de cuidado (ver §5). |
| **Puppeteer** | 🔴 Alto **se** remover `data-pdf-template="ready"` | Sem o seletor → `waitForSelector` estoura 10s → **500**. Mitigação: manter o atributo no `<article>` raiz (regra inegociável). |
| **Print CSS** | 🟡 Médio | Já está quebrado (404 — ver §4); o redesign deve resolver as margens, não piorar. |

---

## 3. Ícones

**Problema confirmado:** todos os ícones `lucide-react` renderizam no **default 24px** (nenhum tem `size`/className de tamanho) → competem com a informação.

**Inventário (14 usos, todos no arquivo do template):**
| Ícone (alias) | Onde | Linha aprox. |
|---|---|---|
| IconeTelefone, IconeEmail, IconeGlobo | Header — contatos | 231/237/243 |
| IconeInstagram (SVG inline, **já 12px**) | Header — contatos | 40-56 |
| IconeCalendario ×2, IconeNota, IconeUsuario | Header — Data/Validade/Proposta/Vendedor | 260/265/270/274 |
| IconeCliente | Card Cliente (pílula) | 292 |
| IconeDocumento | Card Nota (pílula) | 336 |
| IconeInfo | Box info PF | 367 |
| IconeCaminhao | Card Entrega (pílula) | 377 |
| IconeCarrinho | Header Produtos | 411 |
| IconeDocTexto | Dados Comerciais (pílula) | 507 |
| IconeBalao | Observações (pílula) | 532 |
| IconePin | Rodapé | 550 |

**Recomendação (corporativa, informação > ícone):**
- Ícones **inline** (contatos/header/rodapé): **14px** (`h-3.5 w-3.5` ou `size={14}`).
- Ícones de **título de seção** (pílula): **16px** dentro de **badge circular menor** (~22–24px de diâmetro, hoje implícito grande).
- Padronizar o IconeInstagram em 14px para consistência.
- **Componentes afetados:** Cabecalho, SecaoCards (3 cards + box PF), SecaoProdutos, SecaoComercial, Rodape — **todos no mesmo arquivo**. Nenhum outro arquivo.
- Risco técnico: 🟢 **Baixo** (só tamanho).

---

## 4. print.css

| Verificação | Resultado |
|---|---|
| Está sendo carregado? | ❌ **Não.** `<link href="./print.css">` aponta p/ CSS dentro de `app/`, que o Next **não serve como estático** → **404** (confirmado nos logs da Vercel: `GET /orcamentos/.../print.css 404`). |
| Risco de margens quebradas? | ⚠️ **Já quebrado hoje:** o `@page{size:A4;margin:0}` e o `padding:12mm` do `[data-pdf-page]` **não se aplicam**. Margem real ≈ `p-4` (~4mm) do template. |
| CSS não aplicado? | **Todo o print.css** (~113 linhas) está inerte. |
| CSS duplicado? | Sim — print.css duplica comportamentos que o Tailwind `print:` já cobre (`break-inside`, `print-color-adjust`). |
| Recomendação | No redesign, **mover o controle de margem/A4 para o próprio template** (padding no `<article>` raiz) OU corrigir o carregamento do CSS. Resolver isso **junto** elimina a dívida do 404. |

---

## 5. Quebra de página (conteúdo crescente)

| Cenário | Risco | Observação |
|---|---|---|
| **Observações** longas | 🟡 Médio | Hoje a seção tem `print:break-inside-avoid` → texto grande pode forçar salto de página inteiro. Recomendo permitir quebra interna em texto longo. |
| **Endereço** longo | 🟢 Baixo | `break-words`/`whitespace-pre-wrap` já presentes. |
| **Muitos itens** (tabela) | 🔴 Alto (latente) | `SecaoProdutos` tem `print:break-inside-avoid` **na seção inteira** → com muitos itens, o bloco não cabe e pode **cortar/empurrar**. **Correção recomendada no redesign:** quebra por **linha** (`<tr>` sem quebra) + `<thead>` repetível, removendo o avoid da seção. |
| Risco de conteúdo **sumir** | 🟢 Baixo | Sem `overflow:hidden` estrutural que esconda conteúdo (cards usam `overflow-hidden` só p/ cantos; conteúdo flui). |

---

## 6. Dados Comerciais (mover p/ depois de produtos + resumo)

- **Estado atual:** já está **após** o Resumo Financeiro (ordem atual: Cabeçalho → Cards → Produtos → Totais → Dados Comerciais → Rodapé). ✅ Logo, "mover" é praticamente **confirmar o que já existe** + dobrar Forma de Pagamento/Observações dentro.
- **Risco visual:** 🟢 Baixo. **Risco técnico:** 🟢 Baixo. **Paginação:** 🟢 Baixo (bloco curto; condicional).
- Observação: a imagem de referência põe Fornecedor/Hub/Transportadora **antes** dos produtos — **rejeitado** por você; mantemos depois.

---

## 7. Observações (remover texto fixo)

- **Texto fixo a remover** (hoje em `SecaoComercial`): *"Proposta válida mediante confirmação de estoque."*, *"Valores sujeitos à alteração sem aviso prévio."*, *"Para confirmar o pedido, entre em contato com o seu representante."*
- **Regra nova:** renderizar a seção **somente se `data.observacoes` != vazio**; senão, ocultar 100%.
- **Risco técnico:** 🟢 Baixo (condicional simples). **Visual:** 🟢 Baixo. **Dependências:** nenhuma (campo já chega).
- ⚠️ Item à parte: o **box informativo de PF** (*"Para Pessoa Física, os dados da nota…"*) também é texto fixo — **aparece na imagem de referência**. Manter (default) ou remover? Preciso da sua decisão.

---

## 8. Rodapé (remover Boot Digital / endereço / redundâncias)

- **Atual:** `org.nome` (fallback "DPRIME … LTDA"), CNPJ, endereço, e-mail.
- **Novo:** manter só `telefone · e-mail · site · instagram` (de `organizacao`).
- **Risco:** 🟢 Baixo. **Dependências:** nenhuma.
- ⚠️ **Redundância:** esses 4 contatos **já estão no cabeçalho**. Sigo sua instrução, mas sugiro um rodapé fino só com eles (ou trocar por linha discreta "Proposta nº {numero} • {data}"). Decisão sua.

---

## 9. Campos vazios (ocultar / remover "—" / placeholders)

- Hoje `CampoRotulo` mostra **"—"** para vazio; vários cards ficam com traços.
- **Mudança:** renderizar o campo **só quando houver valor** (ocultar vazios), eliminando "—" e o `"PF - Médico"` hardcoded.
- **Risco:** 🟡 Médio — ocultar muitos campos pode **encolher cards** e desbalancear o grid de 3 colunas (card sem nota some etc.). Mitigação: grid adaptativo + altura mínima opcional.

---

## 10. Plano de execução em fases (proposto)

**FASE 1 — Mudanças seguras (🟢, sem risco de quebra)**
- Reduzir ícones p/ 14–18px + badge menor.
- Remover texto fixo de Observações + tornar condicional.
- Rodapé enxuto (telefone/email/site/instagram).
- Ocultar campos vazios / remover "—" e "PF - Médico".
- **Manter** `data-pdf-template="ready"` e todas as colunas/estrutura.

**FASE 2 — Mudanças visuais (🟡, revisão visual no preview)**
- Paleta: emerald-700 → emerald-600; verde só em âncoras; bordas fortes → hairline `slate-200`/sombra.
- Mais espaço negativo (padding/gaps) + tipografia padronizada.
- Margens A4 reais (resolver o print.css 404 — provavelmente padding no `<article>` raiz).
- Pílulas de seção + badge circular menor.

**FASE 3 — Opcionais (dependem de decisão/escopo)**
- Quebra de página por linha na tabela (orçamentos longos).
- Coluna **APRESENTAÇÃO** + Marca/Código → **exigem alterar a query** (join `products` / campos no item) — fora do "só template".
- Box PF: manter/remover.

---

## 11. Entrega final

### Tabela de impacto
| Área | Muda? | Afeta preview | Afeta PDF | Afeta download/API/query/banco |
|---|---|---|---|---|
| Template (HTML/CSS) | ✅ | ✅ | ✅ | ❌ |
| `data-pdf-template` (atributo) | manter | — | crítico | ❌ |
| print.css / margens | resolver na Fase 2 | ✅ | ✅ | ❌ |
| Query/API/banco/Puppeteer/next.config | ❌ | — | — | ❌ |

### Tabela de risco
| Item | Risco | Mitigação |
|---|---|---|
| Remover `data-pdf-template="ready"` | 🔴 | Não remover — regra fixa. |
| Tabela longa (paginação) | 🔴 latente | Fase 3: quebra por linha. |
| Cards condicionais / grid | 🟡 | Revisar no preview; grid adaptativo. |
| Margens (print.css 404) | 🟡 | Padding no `<article>` raiz. |
| Ícones / cores / texto fixo / rodapé | 🟢 | Diretas. |

### Arquivos afetados
- **Edição:** `components/orcamentos/orcamento-pdf-template.tsx` (único garantido).
- **Possível (Fase 2, margens):** `preview-pdf/page.tsx` (corrigir `<link print.css>`) **ou** resolver via padding no template — **eu aviso antes** se precisar tocar a page.
- **Não tocar:** route.ts, lib/pdf/*, next.config.ts, query, banco.

### Componentes afetados (todos no mesmo arquivo)
`Cabecalho`, `SecaoCards`, `SecaoProdutos`, `SecaoTotais`, `SecaoComercial`, `Rodape`, `CampoRotulo`, `OrcamentoPdfTemplate`.

### Risco geral do redesign
**🟢 Baixo-a-Médio.** Raio de impacto contido (1 componente + 1 preview); só **uma** dependência crítica (atributo do Puppeteer), facilmente preservável. Sem toque em query/API/banco/download.

### Recomendação final
Prosseguir em **3 fases**, validando no Preview da Vercel ao fim de cada uma. Começar pela **Fase 1** (ganho de "cara corporativa" com risco ~zero: ícones menores, sem texto fixo, rodapé limpo, sem "—"). **Fase 3 (Apresentação/Marca/Código)** fica condicionada à sua autorização para alterar a query.

> **Nada implementado.** Aguardando aprovação do plano/fases.
