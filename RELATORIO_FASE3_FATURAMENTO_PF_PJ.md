# FASE 3 — PLANO DE FATURAMENTO PF/PJ NO CADASTRO, ORÇAMENTO E PEDIDO
## CRM DPRIME

**Data:** 12 de Junho de 2026  
**Versão:** 1.0  
**Auditor:** Arquiteto de Software Sênior / DBA Sênior / Product Owner

---

## SUMÁRIO

1. [ETAPA 1 — ESTRUTURA ATUAL](#etapa-1--estrutura-atual)
2. [ETAPA 2 — MELHOR MODELAGEM](#etapa-2--melhor-modelagem)
3. [ETAPA 3 — REGRAS DE NEGÓCIO](#etapa-3--regras-de-negócio)
4. [ETAPA 4 — TELAS IMPACTADAS](#etapa-4--telas-impactadas)
5. [ETAPA 5 — IMPACTO NA CONVERSÃO ORÇAMENTO → PEDIDO](#etapa-5--impacto-na-conversão-orçamento--pedido)
6. [ETAPA 6 — RISCOS](#etapa-6--riscos)
7. [ETAPA 7 — PLANO DE IMPLEMENTAÇÃO EM FASES](#etapa-7--plano-de-implementação-em-fases)
8. [ETAPA 8 — RECOMENDAÇÃO FINAL](#etapa-8--recomendação-final)

---

## ETAPA 1 — ESTRUTURA ATUAL

### 1.1 COMO QUOTES SE RELACIONA COM CONTACTS

**Foreign Key:**
```sql
contato_id uuid REFERENCES contacts(id)
```

**Query atual (detalhe do orçamento):**
```typescript
// app/(dashboard)/orcamentos/[id]/page.tsx:24
.from('quotes')
.select(`
  *,
  contato:contacts!contato_id(id, nome, telefone, email),
  lead:leads!lead_id(id, nome, telefone, email, endereco, cpf_cnpj),
  ...
`)
```

**Observações:**
- `contato_id` é FK opcional
- Se existir `contato_id`, usa dados do contato
- Se não existir, usa dados do `lead` como fallback
- **NÃO há vínculo direto com companies**

---

### 1.2 COMO QUOTES SE RELACIONA COM COMPANIES

**Situação atual: NÃO EXISTE**

```sql
-- NÃO EXISTE
-- faturamento_company_id uuid REFERENCES companies(id)
```

A tabela `quotes` NÃO possui vínculo com `companies` para fins de faturamento.

---

### 1.3 COMO ORDERS SE RELACIONA COM CONTACTS

**Foreign Key:**
```sql
contato_id uuid REFERENCES contacts(id)
```

**Query atual (detalhe do pedido):**
```typescript
// app/(dashboard)/pedidos/[id]/page.tsx:35
.from('orders')
.select(`
  id, numero, status, valor_total, ...,
  contato:contacts!contato_id(id, nome, telefone, email)
`)
```

**Observações:**
- Mesma estrutura de quotes
- `contato_id` é FK opcional
- Herda dados do orçamento na conversão

---

### 1.4 COMO ORDERS SE RELACIONA COM COMPANIES

**Situação atual: NÃO EXISTE**

```sql
-- NÃO EXISTE
-- faturamento_company_id uuid REFERENCES companies(id)
```

A tabela `orders` NÃO possui vínculo com `companies` para fins de faturamento.

---

### 1.5 COMO O PDF DO ORÇAMENTO BUSCA OS DADOS DO CLIENTE

**Arquivo:** `components/orcamentos/orcamento-pdf-generator.ts:243-272`

```typescript
// Identificar cliente (contato ou lead)
const cliente = orcamento.contato ? {
  tipo: 'contato' as const,
  nome: orcamento.contato.nome,
  cpf_cnpj: orcamento.contato.cpf_cnpj,
  telefone: orcamento.contato.telefone,
  email: orcamento.contato.email,
  // Endereço completo do contato
  logradouro: orcamento.contato.endereco,
  ...
} : orcamento.lead ? {
  tipo: 'lead' as const,
  ...
} : null
```

**Seção no PDF:** "DADOS DO COMPRADOR" (linha 239)

**Campos exibidos:**
- Cliente (nome)
- CNPJ/CPF
- Endereço
- Telefone
- E-mail

**PROBLEMA:** O PDF exibe "COMPRADOR" mas não há separação entre comprador e entidade de faturamento.

---

### 1.6 COMO O PEDIDO BUSCA OS DADOS DO CLIENTE

**Arquivo:** `app/(dashboard)/pedidos/[id]/page.tsx:84-91`

```typescript
const lead = Array.isArray(pedido.lead) ? pedido.lead[0] : pedido.lead
const contato = Array.isArray(pedido.contato) ? pedido.contato[0] : pedido.contato
const cliente = contato || lead || contatoFallback
```

**Card "Cliente" no pedido:**
```tsx
<CardTitle className="text-sm font-semibold text-slate-700">Cliente</CardTitle>
<p className="font-medium text-slate-800">{cliente.nome}</p>
{cliente.telefone && <p className="text-sm text-slate-500">{cliente.telefone}</p>}
{cliente.email && <p className="text-sm text-slate-500">{cliente.email}</p>}
```

**PROBLEMA:** O pedido exibe "Cliente" mas não há identificação de faturamento PF/PJ.

---

### 1.7 RESUMO DA ESTRUTURA ATUAL

```
┌─────────────────────────────────────────────────────────────────┐
│                         QUOTES                                 │
│  contato_id (FK → contacts)                                    │
│  lead_id (FK → leads)                                          │
│  endereco_entrega (texto)                                      │
│  ❌ SEM vínculo com companies para faturamento               │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ RPC: convert_orcamento_to_pedido
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         ORDERS                                 │
│  contato_id (copiado do quote)                                 │
│  lead_id (copiado do quote)                                     │
│  endereco_entrega (copiado do quote)                            │
│  ❌ SEM vínculo com companies para faturamento               │
└─────────────────────────────────────────────────────────────────┘
```

---

## ETAPA 2 — MELHOR MODELAGEM

### 2.1 ANÁLISE DAS OPÇÕES

#### OPÇÃO A: Apenas Referências

| Prós | Contras |
|------|---------|
| Simples de implementar | Dados podem mudar no futuro |
| Espaço mínimo no banco | Histórico pode ser alterado |
| Sempre dados atualizados | Dificulta auditoria fiscal |
| Manutenção fácil | Não serve como comprovante |

**Campos:**
```sql
tipo_faturamento TEXT,          -- 'PF' ou 'PJ'
faturamento_contact_id uuid,    -- quando PF
faturamento_company_id uuid,   -- quando PJ
```

---

#### OPÇÃO B: Snapshot Fiscal

| Prós | Contras |
|------|---------|
| Imutabilidade garantida | Mais espaço no banco |
| Auditoria fiscal facilitada | Requer sincronização manual |
| Comprovante autêntico | Pode ficar desatualizado |
| Dados congelados no momento | Mais complexidade |

**Campos:**
```sql
tipo_faturamento TEXT,
faturamento_nome TEXT,
faturamento_documento TEXT,
faturamento_tipo_documento TEXT,  -- 'CPF' ou 'CNPJ'
faturamento_razao_social TEXT,
faturamento_nome_fantasia TEXT,
faturamento_endereco TEXT,
faturamento_ie TEXT,
faturamento_im TEXT,
```

---

#### OPÇÃO C: Modelo Híbrido (RECOMENDADO)

| Prós | Contras |
|------|---------|
| Flexibilidade total | Mais complexo |
| Referência para edição | Dois pontos de dados |
| Snapshot para histórico | Mais código |
| Melhor dos dois mundos | — |

**Campos:**
```sql
tipo_faturamento TEXT,
faturamento_contact_id uuid,    -- referência (pode ser NULL)
faturamento_company_id uuid,   -- referência (pode ser NULL)
-- Snapshot (preenchido no momento da criação do orçamento)
faturamento_nome TEXT,
faturamento_documento TEXT,
faturamento_tipo_documento TEXT,
faturamento_razao_social TEXT,
faturamento_nome_fantasia TEXT,
faturamento_endereco TEXT,
faturamento_ie TEXT,
faturamento_im TEXT,
```

---

### 2.2 RECOMENDAÇÃO: OPÇÃO C (MODELO HÍBRIDO)

**JUSTIFICATIVA TÉCNICA:**

1. **Referência permite edição inteligente**
   - Se o usuário muda a empresa no contato, podemos avisar
   - A referência permite buscar dados atualizados para pré-preenchimento

2. **Snapshot garante imutabilidade fiscal**
   - Os dados fiscais ficam congelados no orçamento/pedido
   - Alterar a empresa depois não afeta documentos antigos
   - Essencial para auditoria e contabilidade

3. **Flexibilidade de uso**
   - PF: usa dados do contato como referência
   - PJ: usa dados da empresa como referência
   - Ambos podem coexistir

4. **Compatibilidade com o modelo atual**
   - Funciona com o sistema existente
   - Novos campos são opcionais
   - Não quebra funcionalidades existentes

---

### 2.3 MODELO HÍBRIDO DETALHADO

#### Campos para QUOTES e ORDERS

```sql
-- Tipo de faturamento
tipo_faturamento TEXT CHECK (tipo_faturamento IN ('PF', 'PJ')),

-- Referências (uma ou outra, conforme tipo)
faturamento_contact_id uuid REFERENCES contacts(id),
faturamento_company_id uuid REFERENCES companies(id),

-- Snapshot fiscal (preenchido na criação)
faturamento_nome TEXT,                    -- Nome/Razão Social
faturamento_documento TEXT,               -- CPF ou CNPJ
faturamento_tipo_documento TEXT,           -- 'CPF' ou 'CNPJ'
faturamento_razao_social TEXT, like        -- Razão Social (para PJ)
faturamento_nome_fantasia TEXT,           -- Nome Fantasia (para PJ)
faturamento_endereco TEXT,                -- Endereço completo
faturamento_ie TEXT,                      -- Inscrição Estadual
faturamento_im TEXT,                      -- Inscrição Municipal
```

---

## ETAPA 3 — REGRAS DE NEGÓCIO

### 3.1 REGRA 1: Se faturamento = PF

| Campo | Fonte | Obrigatório? |
|-------|-------|--------------|
| tipo_faturamento | Fixar 'PF' | ✅ SIM |
| faturamento_contact_id | ID do contato selecionado | ✅ SIM |
| faturamento_nome | `contato.nome` | ✅ SIM |
| faturamento_documento | `contato.cpf_cnpj` | ⚠️ OPCIONAL |
| faturamento_tipo_documento | Fixar 'CPF' | ✅ SIM |
| faturamento_razao_social | NULL | — |
| faturamento_nome_fantasia | NULL | — |
| faturamento_endereco | `contato.endereco` concatenado | ⚠️ OPCIONAL |
| faturamento_ie | NULL | — |
| faturamento_im | NULL | — |

---

### 3.2 REGRA 2: Se faturamento = PJ

| Campo | Fonte | Obrigatório? |
|-------|-------|--------------|
| tipo_faturamento | Fixar 'PJ' | ✅ SIM |
| faturamento_company_id | ID da empresa selecionada | ✅ SIM |
| faturamento_nome | `company.nome` (Razão Social) | ✅ SIM |
| faturamento_documento | `company.cnpj` | ⚠️ OPCIONAL |
| faturamento_tipo_documento | Fixar 'CNPJ' | ✅ SIM |
| faturamento_razao_social | `company.nome` | ✅ SIM |
| faturamento_nome_fantasia | `company.nome_fantasia` | ⚠️ OPCIONAL |
| faturamento_endereco | `company.endereco` | ⚠️ OPCIONAL |
| faturamento_ie | `company.inscricao_estadual` | ⚠️ OPCIONAL |
| faturamento_im | `company.inscricao_municipal` | ⚠️ OPCIONAL |

---

### 3.3 REGRA 3: Se o contato não tiver empresa vinculada

**PERGUNTA:** Permitir cadastrar empresa durante criação/edição do orçamento?

**OPÇÕES:**

| Opção | Descrição | Risco |
|-------|-----------|-------|
| A) Bloquear PJ | Exibir aviso: "Cadastre a empresa no contato primeiro" | Baixo |
| B) Permitir criar empresa inline | Criar empresa durante criação do orçamento | Alto |
| C) Permitir selecionar empresa existente | Mostrar dropdown de empresas | Médio |

**RECOMENDAÇÃO: OPÇÃO A (Bloquear PJ até vincular empresa)**

**Justificativa:**
1. Evita dados inconsistentes
2. Mantém integridade do cadastro
3. Força o usuário a cadastrar corretamente
4. Menos complexo de implementar
5. Evita duplicação de empresas

**Fluxo proposto:**
```
1. Usuário seleciona contato
2. Usuário escolhe tipo de faturamento: PF ou PJ
3. Se PJ:
   a. Verificar se contato.empresa_id existe
   b. Se não existir: exibir aviso "Vincule uma empresa a este contato primeiro"
   c. Oferecer link para editar contato
4. Se PF: prosseguir normalmente
```

---

### 3.4 REGRA 4: Validação de documento

| Tipo | Formato | Validação |
|------|---------|-----------|
| CPF | 11 dígitos | Algoritmo de validação |
| CNPJ | 14 dígitos | Algoritmo de validação |

**Implementação sugerida:**
- Máscara visual (formatação automática)
- Validação em tempo real
- Bloquear gravação se inválido

---

## ETAPA 4 — TELAS IMPACTADAS

### 4.1 CRIAÇÃO DE ORÇAMENTO

| Aspecto | Impacto |
|---------|---------|
| **Arquivo** | `components/orcamentos/form-orcamento.tsx` |
| **Impacto** | **ALTO** |
| **Mudanças necessárias** | Adicionar seletor tipo de faturamento (PF/PJ), seletor de empresa (se PJ), pré-preenchimento do snapshot |

**Elementos a adicionar:**
```
□ Seletor "Faturar para" (PF/PJ)
□ Se PF: usar dados do contato selecionado
□ Se PJ: dropdown de empresas vinculadas ao contato
□ Exibir preview dos dados fiscais
□ Validar documento (CPF/CNPJ)
```

---

### 4.2 EDIÇÃO DE ORÇAMENTO

| Aspecto | Impacto |
|---------|---------|
| **Arquivo** | `components/orcamentos/form-orcamento.tsx` |
| **Impacto** | **ALTO** |
| **Mudanças necessárias** | Carregar dados de faturamento existentes, permitir alteração |

**Elementos a adicionar:**
```
□ Carregar tipo_faturamento selecionado
□ Se PJ: mostrar empresa vinculada
□ Permitir alteração de empresa (com confirmação)
□ Atualizar snapshot ao alterar
```

---

### 4.3 DETALHE DE ORÇAMENTO

| Aspecto | Impacto |
|---------|---------|
| **Arquivo** | `app/(dashboard)/orcamentos/[id]/page.tsx` |
| **Impacto** | **MÉDIO** |
| **Mudanças necessárias** | Exibir seção "DADOS DE FATURAMENTO" separada de "DADOS DO COMPRADOR" |

**Elementos a adicionar:**
```
□ Nova seção "DADOS DE FATURAMENTO"
□ Exibir: Nome/Razão Social, Documento, Endereço, IE, IM
□ Diferenciar visualmente de "DADOS DO COMPRADOR"
```

---

### 4.4 PDF DO ORÇAMENTO

| Aspecto | Impacto |
|---------|---------|
| **Arquivo** | `components/orcamentos/orcamento-pdf-generator.ts` |
| **Impacto** | **ALTO** |
| **Mudanças necessárias** | Separar seção "COMPRADOR" de "FATURAMENTO", adicionar campos fiscais |

**Mudanças no PDF:**
```
□ Renomear "DADOS DO COMPRADOR" → manter se aplicável
□ Adicionar nova seção "DADOS PARA FATURAMENTO"
□ Exibir: Razão Social, CNPJ, IE, IM, Endereço Fiscal
□ Se PF: exibir nome e CPF
□ Se PJ: exibir Razão Social, CNPJ, IE, IM
```

---

### 4.5 CONVERSÃO ORÇAMENTO → PEDIDO

| Aspecto | Impacto |
|---------|---------|
| **Arquivo** | `supabase/migrations/044_fix_rpc_convert_orcamento_auth.sql` |
| **Impacto** | **ALTO** |
| **Mudanças necessárias** | Copiar campos de faturamento na RPC |

**Mudanças na RPC:**
```sql
-- Adicionar na cópia de quotes para orders
INSERT INTO orders (
  ...,
  tipo_faturamento,
  faturamento_contact_id,
  faturamento_company_id,
  faturamento_nome,
  faturamento_documento,
  faturamento_tipo_documento,
  faturamento_razao_social,
  faturamento_nome_fantasia,
  faturamento_endereco,
  faturamento_ie,
  faturamento_im
)
SELECT
  ...,
  tipo_faturamento,
  faturamento_contact_id,
  faturamento_company_id,
  faturamento_nome,
  faturamento_documento,
  faturamento_tipo_documento,
  faturamento_razao_social,
  faturamento_nome_fantasia,
  faturamento_endereco,
  faturamento_ie,
  faturamento_im
FROM quotes
WHERE id = p_quote_id
```

---

### 4.6 DETALHE DO PEDIDO

| Aspecto | Impacto |
|---------|---------|
| **Arquivo** | `app/(dashboard)/pedidos/[id]/page.tsx` |
| **Impacto** | **MÉDIO** |
| **Mudanças necessárias** | Exibir seção de faturamento, buscar dados da empresa se aplicável |

**Elementos a adicionar:**
```
□ Nova seção "DADOS DE FATURAMENTO"
□ Exibir campos fiscais
□ Se PJ: buscar dados da empresa vinculada
```

---

### 4.7 PDF/VISUALIZAÇÃO DO PEDIDO

| Aspecto | Impacto |
|---------|---------|
| **Arquivo** | `components/pedidos/pedido-pdf-generator.ts` (se existir) |
| **Impacto** | **ALTO** |
| **Mudanças necessárias** | Similar ao PDF do orçamento |

**Se não existir PDF do pedido:**
- Considerar criar para consistência
- Ou usar os dados da seção de detalhe

---

### 4.8 CADASTRO DE CONTATO

| Aspecto | Impacto |
|---------|---------|
| **Arquivo** | `components/contatos/modal-novo-contato.tsx` |
| **Impacto** | **MÉDIO** |
| **Mudanças necessárias** | Adicionar vínculo com empresa |

**Elementos a adicionar:**
```
□ Dropdown para selecionar empresa vinculada
□ Campo "Cargo/Função na empresa"
□ Se empresa tiver dados fiscais, exibir preview
```

---

### 4.9 CADASTRO/EDIÇÃO DE EMPRESA

| Aspecto | Impacto |
|---------|---------|
| **Arquivo** | `components/empresa/form-empresa.tsx` |
| **Impacto** | **MÉDIO** |
| **Mudanças necessárias** | Adicionar campos fiscais (IE, IM, Nome Fantasia) |

**Elementos a adicionar:**
```
□ Campo "Nome Fantasia"
□ Campo "Inscrição Estadual"
□ Campo "Inscrição Municipal"
```

---

### 4.10 RESUMO DE IMPACTO

| Tela | Impacto | Prioridade |
|------|---------|------------|
| Criação de orçamento | **ALTO** | 1 |
| Edição de orçamento | **ALTO** | 2 |
| PDF do orçamento | **ALTO** | 3 |
| Conversão orçamento → pedido | **ALTO** | 4 |
| Detalhe de orçamento | **MÉDIO** | 5 |
| Detalhe do pedido | **MÉDIO** | 6 |
| PDF do pedido | **ALTO** | 7 |
| Cadastro de contato | **MÉDIO** | 8 |
| Cadastro de empresa | **MÉDIO** | 9 |

---

## ETAPA 5 — IMPACTO NA CONVERSÃO ORÇAMENTO → PEDIDO

### 5.1 ANÁLISE DA RPC ATUAL

**Arquivo:** `supabase/migrations/044_fix_rpc_convert_orcamento_auth.sql`

**Campos copiados atualmente:**
```sql
INSERT INTO orders (
  organization_id, quote_id, lead_id, contato_id, deal_id,
  responsavel_id, supplier_id, carrier_id, status,
  valor_total, desconto_geral, frete, frete_regiao,
  observacoes, endereco_entrega, forma_pagamento
)
SELECT
  v_profile.organization_id,
  p_quote_id,
  lead_id,
  contato_id,
  deal_id,
  responsavel_id,
  supplier_id,
  carrier_id,
  'pendente',
  valor_total,
  desconto_geral,
  COALESCE(frete, 0),
  frete_regiao,
  observacoes,
  endereco_entrega,
  forma_pagamento
FROM quotes
WHERE id = p_quote_id
```

---

### 5.2 PERGUNTAS E RESPOSTAS

#### Os dados de faturamento devem ser copiados de quotes para orders?

**RESPOSTA: SIM**

**Justificativa:**
1. O pedido é um documento fiscal que precisa ser imutável
2. Alterar a empresa depois não pode afetar pedidos existentes
3. O snapshot garante rastreabilidade
4. Essencial para contabilidade e auditoria

---

#### O pedido deve depender da company atual ou preservar snapshot?

**RESPOSTA: PRESERVAR SNAPSHOT**

**Justificativa:**
1. **Imutabilidade fiscal** — Um pedido já emitido não pode ter seus dados alterados
2. **Auditoria** — A contabilidade precisa de dados congelados
3. **Legalidade** — A nota fiscal emitida não pode ser modificada
4. **Histórico** — O pedido precisa refletir o que foi acordado na época

---

#### Como evitar que alterar a empresa depois mude um pedido antigo?

**ESTRATÉGIA:**

1. **Snapshot no orçamento** — Ao criar/editar orçamento, copiar dados fiscais para campos de snapshot
2. **Cópia na conversão** — A RPC copia TODOS os campos de snapshot para o pedido
3. **Referência mantida** — A FK `faturamento_company_id` permite saber qual empresa, mas os dados fiscais são independentes
4. **Alertas opcionais** — Se a empresa for alterada, um alerta pode ser exibido (mas não obrigatório)

---

### 5.3 FLUXO DE CONVERSÃO PROPOSTO

```
┌─────────────────────────────────────────────────────────────────┐
│                       ORÇAMENTO                                 │
│  contato_id: "contato-do-dr-joao"                               │
│  tipo_faturamento: "PJ"                                         │
│  faturamento_company_id: "clinica-joao-ltda"                   │
│  faturamento_nome: "Clínica João Silva LTDA"                    │
│  faturamento_documento: "12.345.678/0001-90"                   │
│  faturamento_razao_social: "Clínica João Silva LTDA"            │
│  faturamento_ie: "123.456.789.012"                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ RPC: convert_orcamento_to_pedido
                              │ (copia todos os campos de snapshot)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         PEDIDO                                  │
│  contato_id: "contato-do-dr-joao" (para relacionamento)         │
│  tipo_faturamento: "PJ" (copiado)                               │
│  faturamento_company_id: "clinica-joao-ltda" (copiado)          │
│  faturamento_nome: "Clínica João Silva LTDA" (SNAPSHOT)          │
│  faturamento_documento: "12.345.678/0001-90" (SNAPSHOT)         │
│  faturamento_razao_social: "Clínica João Silva LTDA" (SNAPSHOT)  │
│  faturamento_ie: "123.456.789.012" (SNAPSHOT)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   NOTA FISCAL    │
                    │   (futura)       │
                    │   Usa snapshot   │
                    │   do PEDIDO      │
                    └─────────────────┘
```

---

## ETAPA 6 — RISCOS

### 6.1 WHATSAPP

| Risco | Nível | Justificativa |
|-------|-------|---------------|
| Quebra de funcionalidade | **BAIXO** | WhatsApp usa `telefone` para busca, não faturamento |
| Perda de dados | **NENHUM** | Não há relação entre WhatsApp e faturamento |
| Impacto em conversas | **NENHUM** | Conversas não usam campos de faturamento |

---

### 6.2 CONTATOS

| Risco | Nível | Justificativa |
|-------|-------|---------------|
| Adicionar vínculo com empresa | **MÉDIO** | Novo campo `empresa_id` pode ser NULL inicialmente |
| Validação de empresa | **MÉDIO** | Requer que empresa seja vinculada antes de PJ |
| Migração de dados | **BAIXO** | Campo opcional, dados existentes não são afetados |

---

### 6.3 COMPANIES

| Risco | Nível | Justificativa |
|-------|-------|---------------|
| Adicionar campos fiscais | **BAIXO** | Novos campos opcionais |
| Validação de CNPJ | **MÉDIO** | Requer validação de formato |
| Impacto em queries | **BAIXO** | SELECT * retorna novos campos |

---

### 6.4 ORÇAMENTOS

| Risco | Nível | Justificativa |
|-------|-------|---------------|
| Adicionar campos de faturamento | **MÉDIO** | Novos campos opcionais |
| Alterar formulário | **ALTO** | Requer redesign da UI |
| Validar PF vs PJ | **MÉDIO** | Requer lógica de validação |
| Impacto na edição | **MÉDIO** | Carregar dados existentes |

---

### 6.5 PEDIDOS

| Risco | Nível | Justificativa |
|-------|-------|---------------|
| Copiar campos na RPC | **ALTO** | Alterar função do banco requer cuidado |
| Snapshot imutável | **MÉDIO** | Garantir que dados não sejam alterados |
| Impacto em módulos dependentes | **MÉDIO** | Telas que exibem pedidos |

---

### 6.6 PDF

| Risco | Nível | Justificativa |
|-------|-------|---------------|
| Separar comprador de faturamento | **ALTO** | Requer redesign da seção |
| Adicionar novos campos | **MÉDIO** | Layout pode precisar ajuste |
| Compatibilidade com dados antigos | **BAIXO** | Novos campos serão NULL |

---

### 6.7 CONVERSÃO ORÇAMENTO → PEDIDO

| Risco | Nível | Justificativa |
|-------|-------|---------------|
| Modificar RPC | **ALTO** | Qualquer alteração em função do banco é crítico |
| Perder dados de snapshot | **CRÍTICO** | Se não copiar, dados fiscais se perdem |
| Rollback difícil | **ALTO** | Alterações em banco são mais complexas |

---

### 6.8 MATRIZ DE RISCO CONSOLIDADA

| Módulo | Risco | Prioridade |
|--------|-------|------------|
| WhatsApp | **BAIXO** | 0 — Sem impacto |
| Contatos | **MÉDIO** | 4 — Adicionar empresa_id |
| Companies | **BAIXO** | 3 — Adicionar campos fiscais |
| Orçamentos | **ALTO** | 1 — Reformular formulário |
| Pedidos | **MÉDIO** | 5 — Exibir faturamento |
| PDF | **ALTO** | 2 — Reformular layout |
| Conversão | **ALTO** | 1 — Modificar RPC |

---

## ETAPA 7 — PLANO DE IMPLEMENTAÇÃO EM FASES

### FASE A — Apenas Schema

**Objetivo:** Preparar o banco de dados sem impacto no código

```
□ Migration 1: Adicionar campos em contacts
  - empresa_id (FK → companies, SET NULL)

□ Migration 2: Adicionar campos em companies
  - nome_fantasia
  - inscricao_estadual
  - inscricao_municipal

□ Migration 3: Adicionar campos em quotes
  - tipo_faturamento TEXT
  - faturamento_contact_id uuid
  - faturamento_company_id uuid
  - faturamento_nome TEXT
  - faturamento_documento TEXT
  - faturamento_tipo_documento TEXT
  - faturamento_razao_social TEXT
  - faturamento_nome_fantasia TEXT
  - faturamento_endereco TEXT
  - faturamento_ie TEXT
  - faturamento_im TEXT

□ Migration 4: Adicionar campos em orders
  - (mesmos campos de quotes)

□ Migration 5: Atualizar RPC de conversão
  - Copiar campos de snapshot para orders
```

**Teste:** Verificar se migrations executam sem erro

---

### FASE B — Cadastro de Contato/Company

**Objetivo:** Permitir vincular empresa ao contato e adicionar campos fiscais na empresa

```
□ Atualizar types/database.ts
  - Adicionar tipo_faturamento
  - Adicionar empresa_id em Contact
  - Adicionar campos fiscais em Company

□ Atualizar modal-novo-contato.tsx
  - Adicionar campo empresa_id (dropdown)
  - Buscar empresas da organização

□ Atualizar form-empresa.tsx
  - Adicionar campo nome_fantasia
  - Adicionar campo inscricao_estadual
  - Adicionar campo inscricao_municipal

□ Atualizar actions.ts (contatos)
  - Incluir empresa_id na criação

□ Atualizar actions.ts (empresa)
  - Incluir campos fiscais na atualização
```

**Teste:** Criar contato com empresa vinculada, editar empresa com campos fiscais

---

### FASE C — Orçamento

**Objetivo:** Adicionar lógica de faturamento no formulário de orçamento

```
□ Atualizar form-orcamento.tsx
  - Adicionar seletor tipo de faturamento (PF/PJ)
  - Se PF: usar dados do contato selecionado
  - Se PJ: verificar empresa vinculada, bloquear se não existir
  - Exibir preview dos dados fiscais
  - Preencher snapshot ao selecionar

□ Atualizar actions.ts (orcamentos)
  - criarOrcamento: incluir campos de snapshot
  - editarOrcamento: atualizar snapshot se mudou

□ Atualizar página de detalhe (orcamentos/[id]/page.tsx)
  - Buscar dados de faturamento
  - Exibir seção "DADOS DE FATURAMENTO"
```

**Teste:** Criar orçamento com PF, criar orçamento com PJ, editar faturamento

---

### FASE D — PDF

**Objetivo:** Separar comprador de faturamento no PDF do orçamento

```
□ Atualizar orcamento-pdf-generator.ts
  - Renomear "DADOS DO COMPRADOR" para "DADOS DO COMPRADOR/CONTATO"
  - Adicionar seção "DADOS PARA FATURAMENTO"
  - Se PF: exibir nome e CPF
  - Se PJ: exibir Razão Social, CNPJ, IE, IM
  - Buscar dados do snapshot (não da referência)
```

**Teste:** Gerar PDF com PF, gerar PDF com PJ, verificar dados corretos

---

### FASE E — Conversão para Pedido

**Objetivo:** Garantir que campos de snapshot sejam copiados

```
□ Atualizar RPC convert_orcamento_to_pedido
  - Adicionar campos de snapshot no INSERT

□ Verificar que todos os campos são copiados
  - tipo_faturamento
  - faturamento_contact_id
  - faturamento_company_id
  - Todos os campos de snapshot
```

**Teste:** Converter orçamento PF, converter orçamento PJ, verificar dados no pedido

---

### FASE F — Pedido

**Objetivo:** Exibir dados de faturamento no pedido

```
□ Atualizar página de detalhe (pedidos/[id]/page.tsx)
  - Buscar dados de faturamento
  - Exibir seção "DADOS DE FATURAMENTO"

□ Verificar/adicionar PDF do pedido (se existir)
  - Mesma estrutura do PDF do orçamento
```

**Teste:** Visualizar pedido com PF, visualizar pedido com PJ

---

### FASE G — Testes

**Objetivo:** Validar toda a funcionalidade

```
□ Teste 1: Fluxo completo PF
  - Criar contato PF
  - Criar orçamento PF
  - Gerar PDF
  - Converter para pedido
  - Verificar dados no pedido

□ Teste 2: Fluxo completo PJ
  - Criar empresa com campos fiscais
  - Criar contato PJ vinculado à empresa
  - Criar orçamento PJ
  - Gerar PDF
  - Converter para pedido
  - Verificar dados no pedido

□ Teste 3: Edição
  - Editar orçamento PF → PJ (deve bloquear se empresa não vinculada)
  - Editar empresa (não deve afetar orçamentos existentes)

□ Teste 4: Dados existentes
  - Verificar que orçamentos sem faturamento funcionam
  - Verificar que campos NULL não quebram

□ Teste 5: Módulos dependentes
  - WhatsApp continua funcionando
  - Leads continua funcionando
  - Pipeline continua funcionando
```

---

## ETAPA 8 — RECOMENDAÇÃO FINAL

### 8.1 ESTRATÉGIA RECOMENDADA

**MODELO HÍBRIDO** com as seguintes características:

1. **Referência** para permitir edição inteligente
2. **Snapshot** para garantir imutabilidade fiscal
3. **Validação** de empresa vinculada para faturamento PJ
4. **Separação visual** entre comprador e faturamento

---

### 8.2 CAMPOS A ADICIONAR

#### contacts
```
empresa_id uuid REFERENCES companies(id)  -- vínculo com empresa
```

#### companies
```
nome_fantasia TEXT
inscricao_estadual TEXT
inscricao_municipal TEXT
```

#### quotes e orders
```
tipo_faturamento TEXT
faturamento_contact_id uuid
faturamento_company_id uuid
faturamento_nome TEXT
faturamento_documento TEXT
faturamento_tipo_documento TEXT
faturamento_razao_social TEXT
faturamento_nome_fantasia TEXT
faturamento_endereco TEXT
faturamento_ie TEXT
faturamento_im TEXT
```

---

### 8.3 REGRAS FUNDAMENTAIS

| Regra | Descrição |
|-------|-----------|
| 1 | Campos de snapshot são preenchidos na criação do orçamento |
| 2 | Snapshot é copiado para o pedido na conversão |
| 3 | Alterar empresa depois NÃO afeta pedidos/orçamentos existentes |
| 4 | Faturamento PJ requer empresa vinculada ao contato |
| 5 | CPF/CNPJ deve ser validado em tempo real |

---

### 8.4 PRIORIDADE DE IMPLEMENTAÇÃO

```
1º FASE A (Schema)      — Preparar banco
2º FASE B (Cadastro)    — Vínculo empresa-contato
3º FASE C (Orçamento)   — Lógica de faturamento
4º FASE D (PDF)         — Separação comprador/faturamento
5º FASE E (Conversão)   — Copiar snapshot
6º FASE F (Pedido)      — Exibir faturamento
7º FASE G (Testes)      — Validação completa
```

---

### 8.5 EVITAR

| Evitar | Motivo |
|--------|--------|
| Modificar campos existentes | Quebra retrocompatibilidade |
| Criar constraints obrigatórias | Dados existentes são NULL |
| Substituir contato_id | Usado para relacionamento |
| Alterar WhatsApp | Não tem relação com faturamento |
| Alterar Leads | Não tem relação com faturamento |
| Tentar deduplicar | Escopo diferente |

---

### 8.6 SUCESSO DO PROJETO

O projeto será considerado bem-sucedido se:

1. ✅ Um médico pode criar orçamento com faturamento no próprio CPF
2. ✅ Um médico pode criar orçamento com faturamento na clínica (CNPJ)
3. ✅ O PDF exibe corretamente os dados de faturamento
4. ✅ O pedido herda os dados fiscais corretamente
5. ✅ Alterar a empresa depois não afeta pedidos existentes
6. ✅ Módulos existentes (WhatsApp, Leads, Pipeline) continuam funcionando
7. ✅ Dados existentes não são afetados

---

## CONCLUSÃO

A implementação de faturamento PF/PJ é **viável e segura** seguindo o modelo híbrido proposto.

**Principais benefícios:**
- Separação clara entre pessoa de relacionamento e entidade de faturamento
- Imutabilidade dos dados fiscais para auditoria
- Flexibilidade para atender diferentes cenários (médico vs clínica)
- Compatibilidade com o sistema existente

**Riscos principais:**
- Alteração na RPC de conversão (crítico)
- Reformulação do formulário de orçamento (alto)
- Redesign do PDF (alto)

**Recomendação:** Proceder com a implementação seguindo as fases definidas, priorizando schema → cadastro → orçamento → PDF → conversão → pedido → testes.

---

*Documento gerado através de análise estática do código.*
*Não foram executadas queries diretas no banco de dados.*
*Recomenda-se validação com testes em ambiente de homologação antes de produção.*
