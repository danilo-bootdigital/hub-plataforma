# MAPEAMENTO COMPLETO DOS DADOS — PDF do Orçamento (template HTML)

**Branch:** `feature/pdf-html-template-pr1` · **Data:** 2026-06-15
**Natureza:** mapeamento de dados (somente leitura). **Nada implementado/alterado.**

## Arquivos analisados
- Rota preview: `app/(pdf)/orcamentos/[id]/preview-pdf/page.tsx` (query inline, l.37-63)
- API/Puppeteer: `app/api/orcamentos/[id]/pdf/route.ts` (query inline, l.59-87 — **idêntica** à do preview)
- Template HTML: `components/orcamentos/orcamento-pdf-template.tsx` (tipos l.58-146; render l.202-533)
- Schema: `supabase/migrations/001…055_*.sql`

**Fato estrutural:** a query busca `quotes` com **`select('*')`** + relações com colunas **explícitas**.
→ Logo, **todas as colunas escalares de `quotes` chegam no objeto**; nas relações, só chega o que está listado.

---

## 1. DADOS DA PROPOSTA / ORÇAMENTO  (tabela `quotes`, via `*`)
| Campo | Existe (DB) | Chega ao objeto | Usado no PDF |
|---|---|---|---|
| `id` | ✅ | ✅ | não |
| `numero` (serial) | ✅ | ✅ | ✅ (Cabecalho l.264) |
| `criado_em` | ✅ | ✅ | ✅ (l.260) |
| `status` (enum quote_status) | ✅ | ✅ | ❌ |
| `responsavel` → `profiles.nome` | ✅ | ✅ | ✅ (l.268) |
| `organization_id`/`organizacao` | ✅ | ✅ | ✅ (header/rodapé) |
| `observacoes` | ✅ | ✅ | ✅ (l.498) |
| `validade_em` (DATE, mig.038) | ✅ | ✅ (via `*`) | ❌ (template usa "30 dias" fixo) |
| `aprovacao_interna_em/_por/_comentario` | ✅ | ✅ (`*`/aprovador) | ❌ |
| `aprovado_cliente_em/_por` | ✅ | ✅ (`*`) | ❌ |
| `cliente_aprovado_em` / `cliente_recusado_em` / `vendedor_confirmado_em` / `ultima_alteracao_validada_em` (mig.038) | ✅ | ✅ (`*`) | ❌ |
| `atualizado_em` | ✅ | ✅ | ❌ |

## 2. EMPRESA / ORGANIZAÇÃO (DPRIME)  (`organizations`, colunas explícitas)
Selecionadas: `nome, nome_fantasia, cnpj, telefone, email, endereco, logo_url, site, instagram`.
| Campo | Existe | Selecionado | Usado |
|---|---|---|---|
| `nome` (razão) | ✅ | ✅ | ✅ |
| `nome_fantasia` | ✅ | ✅ | ✅ (header) |
| `cnpj` | ✅ | ✅ | ✅ (rodapé) |
| `telefone`,`email`,`site`,`instagram`,`endereco`,`logo_url` | ✅ | ✅ | ✅ (header/rodapé) |
| **`inscricao_estadual`** | ❌ **não existe** | — | — |
| **`inscricao_municipal`** | ❌ **não existe** | — | — |
| `slug`,`plano`,`ativo` | ✅ | ❌ | — |
> IE/IM da própria DPRIME **não existem** no banco (só existem `nota_ie`/`nota_im`, que são do **cliente**).

## 3. CLIENTE / CONTATO / LEAD  (estruturas distintas; template usa `contato || lead`)
**`contacts` (selecionado):** `id, nome, telefone, email, cpf_cnpj, cargo, tipo_pessoa, categoria_cliente, especialidade, tipo_conselho, numero_conselho, uf_conselho, observacoes, empresa_id, empresa(id,nome), endereco, endereco_numero, endereco_complemento, endereco_bairro, endereco_cidade, endereco_estado, endereco_cep`
**`leads` (selecionado):** `id, nome, telefone, email, endereco, cpf_cnpj`
| Campo | contacts | leads | Usado no PDF |
|---|---|---|---|
| nome, telefone, email, cpf_cnpj | ✅ | ✅ | ✅ (card cliente) |
| cargo, especialidade, tipo_pessoa, conselho(tipo/nº/uf) | ✅ | — | ✅ |
| endereço completo (+numero/compl/bairro/cidade/estado/cep) | ✅ | só `endereco` | ✅ (parcial) |
| `categoria_cliente` | ✅ (sel.) | — | ❌ |
| `observacoes` (contato) | ✅ (sel.) | — | ❌ |
| `empresa` vinculada (companies id,nome) | ✅ (sel.) | — | ❌ |
| `endereco_complemento` | ✅ (sel.) | — | ❌ (não renderizado) |
> `lead` não tem campos de endereço estruturado (só `endereco` texto) nem cargo/conselho.

## 4. DADOS PARA NOTA FISCAL  (colunas em `quotes`, via `*` — mig.049)
| Campo | Existe | Chega | Usado |
|---|---|---|---|
| `nota_tipo_pessoa` | ✅ | ✅ | ✅ |
| `nota_nome` | ✅ | ✅ | ✅ |
| `nota_documento` (CPF/CNPJ) | ✅ | ✅ | ✅ |
| `nota_endereco` | ✅ | ✅ | ✅ |
| `nota_razao_social` | ✅ | ✅ | ❌ |
| `nota_nome_fantasia` | ✅ | ✅ | ❌ |
| `nota_ie` (inscr. estadual) | ✅ | ✅ | ❌ |
| `nota_im` (inscr. municipal) | ✅ | ✅ | ❌ |
> **Independência:** os dados da nota são **colunas próprias de `quotes`** (snapshot no orçamento), **não derivados em tempo real do cadastro**. O template card "Nota" reusa `contato.email`/`telefone` para e-mail/telefone (l.336-337), mas nome/doc/endereço/IE/IM são os `nota_*`.

## 5. ENDEREÇO DE ENTREGA
| Campo | Origem | Existe | Usado |
|---|---|---|---|
| `endereco_entrega` (texto livre) | `quotes` (mig.012) | ✅ | ✅ (card entrega) |
| destinatário | — | ❌ separado; template usa `cliente.nome` (l.358) | — |
| telefone de entrega | — | ❌ separado; template usa `contato.telefone` (l.359) | — |
| bairro/cidade/uf/cep | `contacts.endereco_*` | ✅ | ✅ (reusa do contato l.370-377) |
| complemento | `contacts.endereco_complemento` | ✅ | ❌ |
> **Regra atual (l.363-367):** se `endereco_entrega` preenchido → usa; senão se `contato.endereco` → "Mesmo endereço do cliente"; senão → "Não informado".

## 6. FORNECEDOR / LABORATÓRIO  (`suppliers`, selecionado: `id, nome, hub_id, health_hubs(...)`)
| Campo | Existe (DB) | Selecionado | Usado |
|---|---|---|---|
| `id`, `nome` | ✅ | ✅ | `nome` ✅ (só como "Laboratório" do item, l.410) |
| `hub_id` | ✅ | ✅ | ❌ |
| `cnpj` | ✅ | ❌ | ❌ |
| `telefone`, `email`, `observacoes` | ✅ | ❌ | ❌ |
| logo do fornecedor | ❌ **não existe** | — | — |
> **Sim, "fornecedor" = laboratório fornecedor** (o orçamento é travado por fornecedor — mig.008). O nome dele só aparece como "Laboratório: X" em cada linha de produto.

## 7. HUB DE SAÚDE  (`health_hubs` via `fornecedor.health_hubs`)
Selecionado: `id, nome, logo_url`.
| Campo | Existe | Selecionado/chega | Usado no PDF |
|---|---|---|---|
| `id`, `nome`, `logo_url` | ✅ | ✅ **chega ao template** | ❌ **não renderizado** |
| `status` | ✅ | ❌ | ❌ |
| descrição | ❌ não existe | — | — |
**Confirmações:**
- Fornecedor pertence a **um único hub** (`suppliers.hub_id` → FK única, mig.053). ✅
- O hub vem **via `fornecedor.health_hubs`**. ✅
- **O logo do hub JÁ CHEGA no template** (`fornecedor.health_hubs.logo_url`) mas **não é exibido**. ⬅️ oportunidade sem custo de query.

## 8. TRANSPORTADORA / FRETE
| Campo | Origem | Existe | Chega | Usado |
|---|---|---|---|---|
| transportadora `carrier.nome` | `freight_carriers` | ✅ | ✅ | ❌ **não renderizado** |
| `frete` (valor) | `quotes` | ✅ | ✅ | ✅ (Totais l.450) |
| `frete_regiao` | `quotes` | ✅ | ✅ | ❌ |
| prazo / modalidade / rastreamento | — | ❌ **não existem** | — | — |
> `freight_carriers` só tem `nome`. Custos por região ficam em `supplier_freight` (não consultado).

## 9. FORMA DE PAGAMENTO / CONDIÇÕES
| Campo | Origem | Existe | Usado |
|---|---|---|---|
| `forma_pagamento` | `quotes` (mig.015) | ✅ | ✅ (l.464) |
| `desconto_geral` | `quotes` | ✅ | ⚠️ **ignorado** (Totais hardcoda `formatBRL(0)` l.446) |
| `desconto_item` | `quote_items` | ✅ | ✅ (l.422) |
| `observacoes` (comercial) | `quotes` | ✅ | ✅ (l.498) |
| parcelas / prazo pagamento | — | ❌ não existem | — |
| obs. internas (separadas) | `aprovacao_interna_comentario` | ✅ (não buscado p/ uso) | ❌ |
> Condições "Prazo de produção / entrega / Validade / Impostos / Frete" são **texto fixo no template** (l.463-471), não dados.

## 10. PRODUTOS / ITENS  (`quote_items`, selecionado: `id, descricao, quantidade, preco_unitario, desconto_item, subtotal, product_id`)
| Campo | Existe em `quote_items` | Selecionado | Usado |
|---|---|---|---|
| id, descricao, quantidade, preco_unitario, desconto_item, subtotal, product_id | ✅ | ✅ | ✅ |
| `marca` | ❌ **não existe** | — | tipo declara opcional → sempre `undefined` |
| `unidade` (coluna "APRESENTAÇÃO") | ❌ **não existe** | — | sempre `undefined` → "—" (l.413) |
| `codigo` | ❌ **não existe** | — | não usado |
| observação do item | ❌ **não existe** | — | — |
| apresentação/composição reais | em `products` (mig.010) | ❌ **products não é joinado** | — |
> "Laboratório" do item (l.410) usa `item.marca` (sempre vazio) → cai em `fornecedor.nome`. A coluna **APRESENTAÇÃO mostra `unidade`, que nunca existe** → sempre "—".

## 11. VALORES FINANCEIROS  (`quotes`)
| Campo | Existe | Usado |
|---|---|---|
| `valor_subtotal` | ✅ | ✅ |
| `desconto_geral` | ✅ | ⚠️ não usado (hardcoded 0) |
| `frete` | ✅ | ✅ |
| `valor_total` | ✅ | ✅ |
| impostos / taxa / comissão | ❌ não existem | — |

## 12. EXISTEM NO BANCO/QUERY MAS NÃO CHEGAM/NÃO SÃO USADOS NO TEMPLATE
**a) No objeto (via `*` ou relação selecionada) porém NÃO renderizados:** `status`, `validade_em`, `desconto_geral`, `frete_regiao`, `nota_razao_social`, `nota_nome_fantasia`, `nota_ie`, `nota_im`, `aprovador.nome`, datas de aprovação (cliente/interna), `deal.titulo`, `carrier.nome`, `fornecedor.health_hubs.{nome,logo_url}`, `contato.{categoria_cliente, observacoes, empresa.nome, endereco_complemento}`.
**b) Existem no banco mas NÃO são buscados pela query:** `suppliers.{cnpj,telefone,email,observacoes}`, `companies` dados fiscais (mig.048 — só `id,nome` buscado), `products.{apresentacao,composicao,via_administracao,embalagem,grupo,modo_uso}` (mig.010 — products não joinado), `quote_tokens` (validade/link público, mig.038), `health_hubs.status`.

## 13. CAMPOS QUE O TEMPLATE USA HOJE
`numero, criado_em, responsavel.nome`; org `logo_url/nome/nome_fantasia/telefone/email/site/instagram/cnpj/endereco`; cliente `nome/cpf_cnpj/email/telefone/cargo/especialidade/conselho/tipo_pessoa/endereco(+numero/bairro/cidade/estado/cep)`; nota `nota_tipo_pessoa/nota_nome/nota_documento/nota_endereco`; entrega `endereco_entrega` + reuso contato; itens `descricao/quantidade/preco_unitario/desconto_item/subtotal` (+ `unidade`/`marca` que vêm vazios) + `fornecedor.nome`; `valor_subtotal/frete/valor_total`; `forma_pagamento`; `observacoes`.

## 14. CAMPOS DISPONÍVEIS MAS NÃO USADOS (prontos, sem mexer na query)
`validade_em` (→ substituir "30 dias" fixo) · `desconto_geral` (→ corrigir linha DESCONTO) · `frete_regiao` · `carrier.nome` (→ exibir transportadora) · `fornecedor.health_hubs.logo_url` + `.nome` (→ co-branding do hub) · `nota_razao_social/nome_fantasia/ie/im` · `aprovador.nome` + datas · `deal.titulo` · `contato.categoria_cliente/empresa.nome`.

## 15. CAMPOS IMPORTANTES QUE NÃO EXISTEM (precisariam schema novo)
IE/IM da **DPRIME** (org) · `apresentacao`/`unidade` no item (existe em `products`, não no item) · observação por item · prazo de produção/entrega reais (hoje fixos) · destinatário de entrega separado · telefone de entrega separado · transportadora: prazo/modalidade/rastreamento · impostos/taxa/comissão · logo do **laboratório/fornecedor** (só o **hub** tem logo).

## 16. RISCO DE ALTERAÇÃO
- **🟢 Seguro (sem tocar query/API):** todos os campos da §14 — já estão no objeto retornado (`quotes.*` + relações já selecionadas). Inclui logo/nome do hub, carrier.nome, validade_em, desconto_geral real, nota_ie/im, etc.
- **🟡 Exige alterar a query (API/preview — 2 lugares idênticos):** `suppliers.cnpj/telefone/email`; **join de `products`** para `apresentacao/composicao`; dados fiscais de `companies`.
- **🔴 Exige migração de schema:** IE/IM da org, `observacao`/`unidade`/`marca` em `quote_items`, prazos reais, destinatário/telefone de entrega próprios, campos de transportadora, impostos/comissão, logo do fornecedor.

## 17. ENTREGA FINAL

### 17.1 Exemplo de objeto (resumido) recebido pelo template
```jsonc
{
  "id": "0f8bc272-…", "numero": 52, "status": "enviado",
  "criado_em": "2026-06-10T13:00:00Z",
  "validade_em": "2026-07-10",                       // chega (via *), NÃO usado
  "valor_subtotal": 1500.00, "desconto_geral": 10.0, // desconto NÃO usado
  "frete": 80.00, "frete_regiao": "Sudeste",         // frete_regiao NÃO usado
  "endereco_entrega": "Rua X, 100 - SP",
  "forma_pagamento": "Boleto 30 dias",
  "valor_total": 1430.00, "observacoes": "…",
  "nota_tipo_pessoa": "PJ", "nota_nome": "Clínica Y LTDA",
  "nota_documento": "12345678000190",
  "nota_razao_social": "…", "nota_nome_fantasia": "…",
  "nota_ie": "…", "nota_im": "…",                    // ie/im chegam, NÃO usados
  "responsavel": { "nome": "João" },
  "aprovador": { "nome": "Maria" },                   // chega, NÃO usado
  "deal": { "id": "…", "titulo": "…" },               // chega, NÃO usado
  "organizacao": { "nome": "DPRIME…", "nome_fantasia": "DPRIME",
    "cnpj": "…", "telefone": "…", "email": "…",
    "endereco": "…", "logo_url": "…", "site": "…", "instagram": "…" },
  "contato": { "nome": "Dr. Z", "cpf_cnpj": "…", "telefone": "…",
    "email": "…", "cargo": "…", "tipo_pessoa": "PF",
    "categoria_cliente": "…",                         // chega, NÃO usado
    "especialidade": "…", "tipo_conselho": "CRM",
    "numero_conselho": "…", "uf_conselho": "SP",
    "empresa": { "id": "…", "nome": "…" },            // chega, NÃO usado
    "endereco": "…", "endereco_numero": "…",
    "endereco_bairro": "…", "endereco_cidade": "…",
    "endereco_estado": "…", "endereco_cep": "…",
    "endereco_complemento": "…" },                    // chega, NÃO usado
  "lead": null,
  "fornecedor": { "id": "…", "nome": "Lab ABC", "hub_id": "…",
    "health_hubs": { "id": "…", "nome": "Smart Health",
      "logo_url": "hubs/smart.png" } },               // nome+logo chegam, NÃO usados
  "carrier": { "nome": "Transportadora W" },          // chega, NÃO usado
  "itens": [
    { "id": "…", "descricao": "Produto 1", "quantidade": 2,
      "preco_unitario": 750, "desconto_item": 0, "subtotal": 1500,
      "product_id": "…" }                             // sem marca/unidade/codigo
  ]
}
```

### 17.2 Tabela mestra (Campo / Origem / No template? / Usado no PDF? / Seguro usar?)
| Campo | Origem | No objeto? | Usado hoje? | Seguro usar |
|---|---|---|---|---|
| numero, criado_em, valor_subtotal/total, frete, forma_pagamento, observacoes | quotes.* | ✅ | ✅ | 🟢 já usado |
| **validade_em** | quotes.* | ✅ | ❌ | 🟢 |
| **desconto_geral** | quotes.* | ✅ | ❌ (hardcoded 0) | 🟢 |
| **frete_regiao** | quotes.* | ✅ | ❌ | 🟢 |
| **nota_razao_social/nome_fantasia/ie/im** | quotes.* | ✅ | ❌ | 🟢 |
| status, datas de aprovação | quotes.* | ✅ | ❌ | 🟢 |
| **carrier.nome** | freight_carriers | ✅ | ❌ | 🟢 |
| **hub nome + logo_url** | fornecedor.health_hubs | ✅ | ❌ | 🟢 |
| aprovador.nome, deal.titulo | profiles/deals | ✅ | ❌ | 🟢 |
| contato categoria_cliente/empresa.nome/observacoes/complemento | contacts | ✅ | ❌ | 🟢 |
| fornecedor.nome | suppliers | ✅ | ✅ (parcial) | 🟢 |
| suppliers cnpj/telefone/email | suppliers | ❌ | ❌ | 🟡 (query) |
| produto apresentacao/composicao | products | ❌ | ❌ | 🟡 (join) |
| item unidade/marca/codigo/observacao | — | ❌ | (vazio) | 🔴 (schema) |
| org IE/IM | — | ❌ | ❌ | 🔴 (schema) |
| prazos reais / transportadora prazo,modalidade / impostos | — | ❌ | (fixo) | 🔴 (schema) |

### 17.3 Recomendação — o que deveria aparecer no PDF final
**Usar já (🟢, sem query):** `validade_em` (validade real), `desconto_geral` (desconto real), **transportadora** (`carrier.nome`) + `frete_regiao`, **co-branding do Hub** (`health_hubs.logo_url`+`nome`), e — quando PJ — `nota_razao_social`/`nota_ie`/`nota_im` no card da nota.
**Avaliar com query (🟡):** join de `products` para preencher **APRESENTAÇÃO** corretamente (hoje sempre vazia); `suppliers.cnpj`/contato do laboratório se quiser dar peso ao fornecedor.
**Decidir como produto (🔴):** prazos de produção/entrega reais, destinatário/telefone de entrega próprios, observação por item — exigem novas colunas; hoje são texto fixo ou reuso do contato.

> **Nada implementado.** Documento de mapeamento para embasar o redesenho do template.
