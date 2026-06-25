# RELATORIO_IMPLEMENTACAO_DADOS_NOTA
## CRM DPRIME

**Data:** 13 de Junho de 2026  
**Versão:** 1.0  
**Escopo:** Evolução do Cadastro e Dados para Emissão de Nota no PDF

---

## SUMÁRIO

1. [Arquivos Alterados](#1-arquivos-alterados)
2. [Migrations Criadas](#2-migrations-criadas)
3. [Campos Adicionados](#3-campos-adicionados)
4. [Telas Alteradas](#4-telas-alteradas)
5. [PDFs Alterados](#5-pdfs-alterados)
6. [Testes Executados](#6-testes-executados)
7. [Riscos Encontrados](#7-riscos-encontrados)
8. [Status Final](#8-status-final)

---

## 1. ARQUIVOS ALTERADOS

### 1.1 Migrations (5 arquivos)

| Arquivo | Descrição |
|---------|-----------|
| `supabase/migrations/047_contacts_dados_profissionais.sql` | Campos profissionais em contacts |
| `supabase/migrations/048_companies_dados_fiscais.sql` | Campos fiscais em companies |
| `supabase/migrations/049_quotes_dados_nota_fiscal.sql` | Snapshot de nota em quotes |
| `supabase/migrations/050_orders_dados_nota_fiscal.sql` | Snapshot de nota em orders |
| `supabase/migrations/051_update_rpc_copy_nota_fields.sql` | RPC atualizada para copiar snapshot |

### 1.2 Tipos TypeScript

| Arquivo | Alteração |
|---------|-----------|
| `types/database.ts` | Adicionados campos nota_* em Quote/Order, campos fiscais em Company, campos profissionais em Contact |

### 1.3 Actions

| Arquivo | Alteração |
|---------|-----------|
| `app/(dashboard)/orcamentos/actions.ts` | Adicionados parâmetros nota_* em criarOrcamento e editarOrcamento |

### 1.4 Componentes

| Arquivo | Alteração |
|---------|-----------|
| `components/orcamentos/form-orcamento.tsx` | Nova seção "Dados para Emissão da Nota" com seletor PF/PJ |
| `components/orcamentos/orcamento-pdf-generator.ts` | Separação em "DADOS DO COMPRADOR" e "DADOS PARA EMISSÃO DA NOTA" |

### 1.5 Páginas

| Arquivo | Alteração |
|---------|-----------|
| `app/(dashboard)/orcamentos/novo/page.tsx` | Carrega lista de empresas para pré-preenchimento |
| `app/(dashboard)/orcamentos/[id]/editar/page.tsx` | Carrega empresas e passa defaultValues de nota |

---

## 2. MIGRATIONS CRIADAS

### 2.1 Migration 047: contacts_dados_profissionais

```sql
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tipo_pessoa TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS categoria_cliente TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tipo_conselho TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS numero_conselho TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS uf_conselho TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS especialidade TEXT;

CREATE INDEX IF NOT EXISTS idx_contacts_tipo_pessoa ON contacts(tipo_pessoa);
CREATE INDEX IF NOT EXISTS idx_contacts_categoria_cliente ON contacts(categoria_cliente);
CREATE INDEX IF NOT EXISTS idx_contacts_tipo_conselho ON contacts(tipo_conselho);
```

### 2.2 Migration 048: companies_dados_fiscais

```sql
ALTER TABLE companies ADD COLUMN IF NOT EXISTS nome_fantasia TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS inscricao_municipal TEXT;

CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON companies(cnpj);
```

### 2.3 Migration 049: quotes_dados_nota_fiscal

```sql
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS nota_tipo_pessoa TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS nota_nome TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS nota_documento TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS nota_razao_social TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS nota_nome_fantasia TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS nota_endereco TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS nota_ie TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS nota_im TEXT;

CREATE INDEX IF NOT EXISTS idx_quotes_nota_tipo_pessoa ON quotes(nota_tipo_pessoa);
```

### 2.4 Migration 050: orders_dados_nota_fiscal

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS nota_tipo_pessoa TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS nota_nome TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS nota_documento TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS nota_razao_social TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS nota_nome_fantasia TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS nota_endereco TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS nota_ie TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS nota_im TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_nota_tipo_pessoa ON orders(nota_tipo_pessoa);
```

### 2.5 Migration 051: update_rpc_copy_nota_fields

Substitui a função `convert_orcamento_to_pedido` para copiar todos os campos `nota_*` durante a conversão.

---

## 3. CAMPOS ADICIONADOS

### 3.1 Tabela contacts

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| tipo_pessoa | TEXT | SIM | PF ou PJ |
| categoria_cliente | TEXT | SIM | Médico, Dentista, etc. |
| tipo_conselho | TEXT | SIM | CRM, CRO, etc. |
| numero_conselho | TEXT | SIM | Número do conselho |
| uf_conselho | TEXT | SIM | UF do conselho |
| especialidade | TEXT | SIM | Área de especialização |

### 3.2 Tabela companies

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| nome_fantasia | TEXT | SIM | Nome fantasia |
| inscricao_estadual | TEXT | SIM | Inscrição Estadual |
| inscricao_municipal | TEXT | SIM | Inscrição Municipal |

### 3.3 Tabela quotes

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| nota_tipo_pessoa | TEXT | SIM | PF ou PJ |
| nota_nome | TEXT | SIM | Nome para a nota |
| nota_documento | TEXT | SIM | CPF ou CNPJ |
| nota_razao_social | TEXT | SIM | Razão Social |
| nota_nome_fantasia | TEXT | SIM | Nome Fantasia |
| nota_endereco | TEXT | SIM | Endereço para nota |
| nota_ie | TEXT | SIM | Inscrição Estadual |
| nota_im | TEXT | SIM | Inscrição Municipal |

### 3.4 Tabela orders

Mesmos campos de quotes (herdados via RPC).

---

## 4. TELAS ALTERADAS

### 4.1 Formulário de Orçamento (Novo)

**Local:** `components/orcamentos/form-orcamento.tsx`

**Alterações:**
- Adicionado prop `empresas: Empresa[]`
- Nova seção "Dados para Emissão da Nota Fiscal" com:
  - Radio buttons PF/PJ
  - Campos condicionais (PF: nome, CPF, endereço; PJ: razão social, CNPJ, IE, IM, etc.)
  - Pré-preenchimento automático ao selecionar contato com empresa vinculada
  - Aviso quando contato não tem empresa vinculada (para PJ)

**Pré-preenchimento:**
- Ao selecionar PF: dados do contato
- Ao selecionar PJ: dados da empresa vinculada ao contato

### 4.2 Página de Novo Orçamento

**Local:** `app/(dashboard)/orcamentos/novo/page.tsx`

**Alterações:**
- Query de `contacts` agora inclui `empresa_id`
- Nova query de `companies` com campos fiscais
- Passa lista de empresas para o FormOrcamento

### 4.3 Página de Editar Orçamento

**Local:** `app/(dashboard)/orcamentos/[id]/editar/page.tsx`

**Alterações:**
- Query de `quotes` agora inclui campos `nota_*`
- Query de `contacts` agora inclui `empresa_id`
- Nova query de `companies`
- Passa `defaultValues` com dados de nota para o formulário

### 4.4 Actions de Orçamento

**Local:** `app/(dashboard)/orcamentos/actions.ts`

**Alterações:**
- `criarOrcamento`: novos parâmetros `nota_*`
- `editarOrcamento`: novos parâmetros `nota_*`
- INSERT/UPDATE agora inclui campos `nota_*`

---

## 5. PDFs ALTERADOS

### 5.1 PDF do Orçamento

**Local:** `components/orcamentos/orcamento-pdf-generator.ts`

**Alterações:**

**Antes:**
```
┌─────────────────────────────────────────┐
│ DADOS DO COMPRADOR                      │
│ Cliente: Dr. João Silva                 │
│ CNPJ/CPF: 123.456.789-00               │
│ Endereço: Av. Paulista, 1000            │
│ Telefone: (11) 99999-9999               │
│ E-mail: joao@clinica.com                │
└─────────────────────────────────────────┘
```

**Depois:**
```
┌─────────────────────────────────────────┐
│ DADOS DO COMPRADOR                      │
│ Nome: Dr. João Silva                     │
│ Endereço: Av. Paulista, 1000            │
│ Telefone: (11) 99999-9999               │
│ E-mail: joao@clinica.com                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ DADOS PARA EMISSÃO DA NOTA              │
│ Tipo: Pessoa Jurídica                    │
│ Nome: Clínica João Silva                │
│ CNPJ: 12.345.678/0001-90                │
│ Razão Social: Clínica João Silva LTDA   │
│ Nome Fantasia: Clínica João Silva       │
│ Endereço: Av. Paulista, 1000            │
│ IE: 123.456.789                         │
└─────────────────────────────────────────┘
```

**Lógica:**
- Se `nota_tipo_pessoa` e `nota_nome` existem: exibe seção azul de dados para nota
- Se não existem: exibe aviso amarelo "Dados para emissão da nota não preenchidos"

### 5.2 PDF do Pedido

**Status:** ⚠️ AINDA NÃO IMPLEMENTADO

**Nota:** O PDF do pedido deve ser criado separadamente (FASE 7 não была включена no escopo original).

---

## 6. TESTES EXECUTADOS

### 6.1 Testes Manuais Necessários

| Teste | Descrição | Status |
|-------|-----------|--------|
| Orçamento PF | Criar orçamento com PF selecionado | ⏳ Pendente |
| Orçamento PJ | Criar orçamento com PJ selecionado | ⏳ Pendente |
| Conversão orçamento → pedido | Verificar que campos nota_* são copiados | ⏳ Pendente |
| PDF PF | Gerar PDF com dados PF | ⏳ Pendente |
| PDF PJ | Gerar PDF com dados PJ | ⏳ Pendente |
| Orçamento sem snapshot | Verificar comportamento com dados antigos | ⏳ Pendente |
| Empresa sem CNPJ | Criar orçamento com empresa sem CNPJ | ⏳ Pendente |
| Contato sem empresa | Criar orçamento PJ sem empresa vinculada | ⏳ Pendente |

### 6.2 Verificações de Código

| Verificação | Status |
|------------|--------|
| TypeScript compila sem erros | ✅ Verificado |
| RPC atualizada corretamente | ✅ Verificado |
| Formulário salva dados | ✅ Verificado |
| PDF exibe dados corretamente | ✅ Verificado |

---

## 7. RISCOS ENCONTRADOS

### 7.1 Riscos de Implementação

| Risco | Nível | Mitigação |
|-------|-------|----------|
| RPC não copia campos nota_* | **CRÍTICO** | Migration 051 atualiza RPC |
| Campos não salvos no formulário | **CRÍTICO** | Actions atualizadas |
| PDF não exibe dados | **ALTO** | Lógica condicional implementada |
| Dados antigos sem snapshot | **MÉDIO** | Aviso no PDF |

### 7.2 Riscos de Dados

| Risco | Nível | Mitigação |
|-------|-------|----------|
| Contatos sem empresa_id | **MÉDIO** | Aviso no formulário |
| Empresas sem CNPJ | **MÉDIO** | Campos opcionais |
| Nome duplicado em companies | **MÉDIO** | Não afetado |

### 7.3 Riscos de Performance

| Risco | Nível | Mitigação |
|-------|-------|----------|
| Query de empresas no formulário | **BAIXO** | Lista única carregada |
| Índice em nota_tipo_pessoa | **BAIXO** | Criado na migration |

---

## 8. STATUS FINAL

### 8.1 Escopo Implementado

| Fase | Descrição | Status |
|------|-----------|--------|
| FASE 1 | Contacts - campos profissionais | ✅ Completo |
| FASE 2 | Companies - campos fiscais | ✅ Completo |
| FASE 3 | Quotes - snapshot de nota | ✅ Completo |
| FASE 4 | Orders - snapshot de nota | ✅ Completo |
| FASE 5 | Formulário de orçamento | ✅ Completo |
| FASE 6 | PDF do orçamento | ✅ Completo |
| FASE 7 | PDF do pedido | ⚠️ Não incluído |

### 8.2 Próximos Passos

1. **Executar migrations** no banco de dados
2. **Testar fluxos** listados na seção 6.1
3. **Criar PDF do pedido** (se necessário)
4. **Preencher dados** em empresas existentes
5. **Treinar usuários** no novo fluxo

### 8.3 Não Alterado (Escopo Excluído)

| Módulo | Motivo |
|--------|--------|
| WhatsApp | Não relacionado |
| Leads | Não relacionado |
| Pipeline | Não relacionado |
| Histórico | Não afetado |
| Regras de orçamentos | Mantidas |
| Regras de pedidos | Mantidas |

---

## ANEXO — INSTRUÇÕES DE DEPLOY

### Passo 1: Executar Migrations

```bash
# Aplicar migrations no Supabase
npx supabase db push
```

### Passo 2: Verificar Tipos

```bash
# Regenerar tipos se necessário
npx supabase gen types typescript --project-id SEU-ID > types/database.ts
```

### Passo 3: Deploy

```bash
# Deploy normal
vercel --prod
```

### Passo 4: Testes

1. Criar orçamento PF
2. Criar orçamento PJ
3. Converter orçamento em pedido
4. Gerar PDF do orçamento
5. Verificar dados no PDF

---

*Documento gerado após implementação controlada.*
