# AUDITORIA ESTRATÉGICA DO CADASTRO DE CONTATOS
## CRM DPRIME

**Data da Auditoria:** 12 de Junho de 2026  
**Auditor:** Arquiteto de Software Sênior / DBA Sênior  
**Versão do Sistema:** 0.1.0  
**Stack:** Next.js 16 + Supabase (PostgreSQL)

---

## SUMÁRIO

1. [ETAPA 1 — MAPEAMENTO DA ESTRUTURA REAL](#etapa-1--mapeamento-da-estrutura-real)
2. [ETAPA 2 — ORIGEM DOS CADASTROS](#etapa-2--origem-dos-cadastros)
3. [ETAPA 3 — QUALIDADE DOS DADOS](#etapa-3--qualidade-dos-dados)
4. [ETAPA 4 — IDENTIFICADOR DE PESSOA FÍSICA vs JURÍDICA](#etapa-4--identificador-de-pessoa-física-vs-jurídica)
5. [ETAPA 5 — DUPLICIDADES](#etapa-5--duplicidades)
6. [ETAPA 6 — DEPENDÊNCIAS CRÍTICAS](#etapa-6--dependências-críticas)
7. [ETAPA 7 — VIABILIDADE DE EVOLUÇÃO](#etapa-7--viabilidade-de-evolução)
8. [ETAPA 8 — ANÁLISE DE RISCO](#etapa-8--análise-de-risco)
9. [ETAPA 9 — RECOMENDAÇÃO FINAL](#etapa-9--recomendação-final)

---

## ETAPA 1 — MAPEAMENTO DA ESTRUTURA REAL

### 1.1 Tabela CONTACTS

| Propriedade | Valor |
|-------------|-------|
| **Schema** | public |
| **Tabela** | contacts |
| **Primary Key** | id (uuid, default uuid_generate_v4()) |
| **Multi-tenancy** | organization_id (uuid, FK → organizations) |

**Colunas:**

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | uuid | NOT NULL | PK |
| organization_id | uuid | NOT NULL | FK → organizations |
| nome | text | NOT NULL | Nome do contato |
| email | text | SIM | E-mail |
| telefone | text | SIM | Telefone |
| cargo | text | SIM | Cargo/Função |
| cpf_cnpj | text | SIM | CPF ou CNPJ (migração 021) |
| empresa_id | uuid | SIM | FK → companies |
| responsavel_id | uuid | SIM | FK → profiles (quem criou) |
| foto_perfil_url | text | SIM | URL da foto |
| observacoes | text | SIM | Observações |
| endereco | text | SIM | Endereço (legado) |
| endereco_numero | text | SIM | Número (migração 036) |
| endereco_complemento | text | SIM | Complemento (migração 036) |
| endereco_bairro | text | SIM | Bairro (migração 036) |
| endereco_cep | text | SIM | CEP (migração 036) |
| endereco_cidade | text | SIM | Cidade (migração 036) |
| endereco_estado | text | SIM | Estado (migração 036) |
| criado_em | timestamptz | NOT NULL | Timestamp criação |
| atualizado_em | timestamptz | NOT NULL | Timestamp atualização |

**Índices Existentes:**
```
idx_contacts_organization_id
idx_contacts_empresa_id
idx_contacts_responsavel_id
```

**Foreign Keys:**
- `organization_id` → `organizations(id)`
- `empresa_id` → `companies(id)` (SET NULL on delete)
- `responsavel_id` → `profiles(id)` (SET NULL on delete)

---

### 1.2 Tabela LEADS

| Propriedade | Valor |
|-------------|-------|
| **Schema** | public |
| **Tabela** | leads |
| **Primary Key** | id (uuid) |
| **Multi-tenancy** | organization_id (uuid) |

**Colunas:**

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | uuid | NOT NULL | PK |
| organization_id | uuid | NOT NULL | FK → organizations |
| nome | text | SIM | Nome do lead |
| email | text | SIM | E-mail |
| telefone | text | SIM | Telefone |
| empresa | text | SIM | Nome da empresa |
| cpf_cnpj | text | SIM | CPF/CNPJ (migração 021) |
| endereco | text | SIM | Endereço |
| origem | lead_origem | NOT NULL | Canal de origem |
| status | lead_status | NOT NULL | Status do lead |
| responsavel_id | uuid | SIM | FK → profiles |
| foto_perfil_url | text | SIM | Foto |
| contato_anterior_id | uuid | SIM | FK → leads (encadeamento) |
| whatsapp_instance_id | uuid | SIM | FK → whatsapp_instances |
| observacoes | text | SIM | Observações (usado para CPF em leads) |
| ultima_interacao_em | timestamptz | SIM | Última interação |
| criado_em | timestamptz | NOT NULL | Timestamp |
| atualizado_em | timestamptz | NOT NULL | Timestamp |

**Enum lead_origem:**
```sql
'whatsapp', 'instagram_lead_ad', 'facebook_lead_ad', 'site', 'indicacao', 'evento', 'manual'
```

**Enum lead_status:**
```sql
'novo', 'em_atendimento', 'qualificado', 'descartado'
```

**Índices Existentes:**
```
leads_org_telefone_unique (UNIQUE) -- WHERE telefone IS NOT NULL
idx_leads_organization_id_responsavel_id
idx_leads_organization_id_status
idx_leads_organization_id_criado_em
```

**Foreign Keys:**
- `organization_id` → `organizations(id)`
- `responsavel_id` → `profiles(id)`
- `whatsapp_instance_id` → `whatsapp_instances(id)`
- `contato_anterior_id` → `leads(id)`

---

### 1.3 Tabela COMPANIES

| Propriedade | Valor |
|-------------|-------|
| **Schema** | public |
| **Tabela** | companies |
| **Primary Key** | id (uuid) |

**Colunas:**

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | uuid | NOT NULL | PK |
| organization_id | uuid | NOT NULL | FK → organizations |
| nome | text | NOT NULL | Razão Social |
| cnpj | text | SIM | CNPJ |
| site | text | SIM | Website |
| telefone | text | SIM | Telefone |
| endereco | text | SIM | Endereço |
| criado_em | timestamptz | NOT NULL | Timestamp |
| atualizado_em | timestamptz | NOT NULL | Timestamp |

**Índices:**
```
idx_companies_organization_id
```

---

### 1.4 Tabela PROFILES (Usuários)

| Propriedade | Valor |
|-------------|-------|
| **Schema** | public |
| **Tabela** | profiles |
| **Primary Key** | id (uuid) |
| **Herança** | auth.users (Supabase Auth) |

**Colunas:**

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | uuid | NOT NULL | PK (mesmo do auth.users) |
| organization_id | uuid | NOT NULL | FK → organizations |
| nome | text | NOT NULL | Nome completo |
| email | text | NOT NULL | E-mail (UNIQUE) |
| telefone | text | SIM | Telefone |
| cargo | user_role | NOT NULL | Papel no sistema |
| disponivel | boolean | NOT NULL | Disponível para distribuição |
| ativo | boolean | NOT NULL | Ativo/Inativo |
| ultimo_status_em | timestamptz | SIM | Última mudança de status |
| criado_em | timestamptz | NOT NULL | Timestamp |
| atualizado_em | timestamptz | NOT NULL | Timestamp |

**Enum user_role:**
```sql
'admin', 'gestor', 'vendedor', 'atendimento', 'financeiro', 'suporte'
```

**Foreign Keys:**
- `id` → `auth.users(id)` (CASCADE delete)
- `organization_id` → `organizations(id)`

---

## ETAPA 2 — ORIGEM DOS CADASTROS

### 2.1 Análise de Campos de Origem

**EVIDÊNCIA 1: Tabela LEADS possui campo `origem`**

Arquivo: `supabase/migrations/001_schema_completo.sql:47`
```sql
create type lead_origem as enum ('whatsapp', 'instagram_lead_ad', 'facebook_lead_ad', 'site', 'indicacao', 'evento', 'manual');
```

**EVIDÊNCIA 2: Tabela CONTACTS NÃO possui campo de origem**

A tabela `contacts` não tem nenhum campo para identificar a origem do cadastro.

**EVIDÊNCIA 3: Importação via planilha (XLSX)**

Arquivo: `components/contatos/form-importacao.tsx:1-232`

O sistema permite importar contatos via planilha XLSX/CSV. O mapeamento reconhece colunas:
- nome, name, razao social, n fantasia
- telefone, phone, celular, fone
- e-mail, email
- endereco, endereço
- municipio, município, cidade
- estado, uf
- cnpj/cpf, cpf, cnpj

**EVIDÊNCIA 4: Lógica de importação detecta duplicados**

Arquivo: `app/(dashboard)/contatos/actions.ts:323-411`

```typescript
export async function importarContatos(contatos: ContatoImportado[], modo: 'pular' | 'atualizar' = 'pular') {
  // Busca contatos existentes para detectar duplicados (por telefone ou email)
  const { data: existentes } = await supabase
    .from('contacts')
    .select('id, telefone, email')
    .eq('organization_id', perfil.organization_id)
  
  // Detecta duplicados por telefone ou email
  // Insere novos ou atualiza existentes
}
```

**EVIDÊNCIA 5: Lead criado via WhatsApp**

Arquivo: `app/(dashboard)/whatsapp/actions.ts:240-250`

```typescript
const { data: novoLead } = await supabase
  .from('leads')
  .insert({
    organization_id: perfil.organization_id,
    nome: nomeLead,
    telefone: formatado,
    origem: 'whatsapp',  // <-- Origem definida
    status: 'novo',
  })
```

### 2.2 Conclusão sobre Origem dos Cadastros

| Origem | Leads | Contatos |
|--------|-------|----------|
| via Planilha (XLSX) | ❌ Não rastreado | ⚠️ Não identificado (sem campo) |
| Manual | ✅ `origem: 'manual'` | ⚠️ Não identificado |
| WhatsApp | ✅ `origem: 'whatsapp'` | ⚠️ Não identificado |
| Instagram Lead Ad | ✅ `origem: 'instagram_lead_ad'` | ❌ Não rastreado |
| Facebook Lead Ad | ✅ `origem: 'facebook_lead_ad'` | ❌ Não rastreado |
| Site | ✅ `origem: 'site'` | ❌ Não rastreado |
| Indicação | ✅ `origem: 'indicacao'` | ❌ Não rastreado |
| Evento | ✅ `origem: 'evento'` | ❌ Não rastreado |
| API/Integração | ❌ Não rastreado | ❌ Não rastreado |

**PROBLEMA IDENTIFICADO:** A tabela `contacts` NÃO possui campo de origem/tipo de cadastro. Não há como distinguir registros importados via planilha dos criados manualmente.

---

## ETAPA 3 — QUALIDADE DOS DADOS

> **NOTA:** Esta análise requer conexão direta ao banco de dados para executar queries estatísticas. As informações abaixo são baseadas na análise do código e estrutura.

### 3.1 Estrutura de Campos por Entidade

**CONTACTS:**
| Campo | Obrigatório | Atualizado via Importação |
|-------|-------------|---------------------------|
| nome | ✅ SIM | ✅ SIM |
| telefone | ❌ NÃO | ✅ SIM |
| email | ❌ NÃO | ✅ SIM |
| cpf_cnpj | ❌ NÃO | ✅ SIM |
| endereco | ❌ NÃO | ✅ SIM |
| empresa_id | ❌ NÃO | ❌ NÃO (apenas nome) |
| cargo | ❌ NÃO | ❌ NÃO |

**LEADS:**
| Campo | Obrigatório | Presente |
|-------|-------------|----------|
| nome | ❌ NÃO | ✅ |
| telefone | ❌ NÃO | ✅ |
| email | ❌ NÃO | ✅ |
| empresa | ❌ NÃO | ✅ |
| cpf_cnpj | ❌ NÃO | ✅ |
| endereco | ❌ NÃO | ✅ |

### 3.2 Campos Faltantes Identificados

**Para Profissionais de Saúde (Pessoa Física):**
- ❌ `tipo_conselho` (CRM, CRO, CRBM, CRN, CRF, CREFITO)
- ❌ `numero_conselho` (número do registro profissional)
- ❌ `uf_conselho` (UF do conselho)
- ❌ `whatsapp` (campo separado do telefone)

**Para Empresas (Pessoa Jurídica):**
- ❌ `razao_social` (separado de nome fantasia)
- ❌ `inscricao_estadual`
- ❌ `inscricao_municipal`
- ❌ `endereco_fiscal` (separado do endereco de entrega)
- ❌ `responsavel_nome`
- ❌ `responsavel_telefone`
- ❌ `responsavel_whatsapp`
- ❌ `responsavel_email`

### 3.3 Previsão de Qualidade (baseado na estrutura)

Considerando que:
1. O sistema permite importação sem validação de campos obrigatórios
2. Não há validação de formato para CPF/CNPJ
3. Não há validação de formato para telefone
4. O campo `nome` é o único obrigatório

**É provável que a qualidade dos dados seja:**
- Contatos com telefone: ~70-80%
- Contatos com email: ~40-60%
- Contatos com endereço completo: ~30-50%
- Contatos com CPF/CNPJ válido: ~20-40%

---

## ETAPA 4 — IDENTIFICADOR DE PESSOA FÍSICA vs JURÍDICA

### 4.1 Situação Atual

**NÃO EXISTE** nenhuma forma de distinguir automaticamente se um registro é:
- **Pessoa Física** (médico, dentista, biomédico, nutricionista, etc.)
- **Pessoa Jurídica** (clínica, consultório, empresa)

### 4.2 Evidências no Código

**EVIDÊNCIA 1: Campo `cpf_cnpj` genérico**

Arquivo: `supabase/migrations/021_leads_contacts_cpf_cnpj.sql`
```sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;
```

O campo `cpf_cnpj` é único para ambas as naturezas, sem distinção.

**EVIDÊNCIA 2: Tabela COMPANIES separada**

Arquivo: `supabase/migrations/001_schema_completo.sql:72-82`

A tabela `companies` existe para armazenar empresas, mas:
- Não há vínculo obrigatório com `contacts`
- Não há identificação de tipo (clínica, consultório, etc.)
- Não há campos para responsável técnico

**EVIDÊNCIA 3: Campo `cargo` em contacts**

Arquivo: `types/database.ts:95-116`

```typescript
export type Contact = {
  // ...
  cargo: string | null  // Cargo/Função
  // ...
}
```

O campo `cargo` poderia ser usado para identificar profissionais, mas:
- Não há lista controlada de valores
- Não há enum ou validação
- Pode conter qualquer texto livre

### 4.3 Heurísticas Possíveis (para detecção automática)

| Campo | Pessoa Física | Pessoa Jurídica |
|-------|---------------|------------------|
| CNPJ (14 dígitos) | ❌ | ✅ |
| CPF (11 dígitos) | ✅ | ❌ |
| Nome "Dr." / "Dra." | ✅ | ❌ |
| Empresa vinculada | ❌ | ✅ |
| Campo "empresa" preenchido | ❌ | ✅ |

**PROBLEMA:** Sem um campo explícito de `tipo_pessoa`, a distinção depende de heurísticas imperfeitas.

---

## ETAPA 5 — DUPLICIDADES

### 5.1 Verificação de Constraints

**EVIDÊNCIA 1: Leads com telefone único por organização**

Arquivo: `supabase/migrations/037_indices_performance.sql:55-58`
```sql
CREATE UNIQUE INDEX IF NOT EXISTS leads_org_telefone_unique
  ON leads(organization_id, telefone)
  WHERE telefone IS NOT NULL;
```

**EVIDÊNCIA 2: Conversations com telefone único por instância**

Arquivo: `supabase/migrations/030_unique_constraints_whatsapp.sql:1-3`
```sql
CREATE UNIQUE INDEX IF NOT EXISTS conversations_instance_telefone_unique
  ON conversations (whatsapp_instance_id, telefone_externo);
```

### 5.2 Constraints FALTANTES

| Tabela | Campo | Constraint | Risco |
|--------|-------|------------|-------|
| contacts | telefone | ❌ NONE | **ALTO** - Duplicados por telefone |
| contacts | email | ❌ NONE | **ALTO** - Duplicados por email |
| contacts | cpf_cnpj | ❌ NONE | **ALTO** - Duplicados por CPF/CNPJ |
| leads | email | ❌ NONE | **MÉDIO** - Duplicados por email |
| leads | cpf_cnpj | ❌ NONE | **MÉDIO** - Duplicados por CPF/CNPJ |
| companies | cnpj | ❌ NONE | **ALTO** - Empresas duplicadas |

### 5.3 Lógica de Duplicação na Importação

Arquivo: `app/(dashboard)/contatos/actions.ts:339-365`

```typescript
// Busca contatos existentes para detectar duplicados (por telefone ou email)
const { data: existentes } = await supabase
  .from('contacts')
  .select('id, telefone, email')
  .eq('organization_id', perfil.organization_id)

const telefoneMap = new Map<string, string>()
const emailMap = new Map<string, string>()
;(existentes ?? []).forEach((c) => {
  if (c.telefone) telefoneMap.set(c.telefone.trim().toLowerCase(), c.id)
  if (c.email) emailMap.set(c.email.trim().toLowerCase(), c.id)
})

// Detecta duplicados por telefone OU email
const existenteId = (tel && telefoneMap.get(tel)) || (em && emailMap.get(em))
```

**PROBLEMA:** A deduplicação só ocorre na importação. Registros existentes não são verificados.

### 5.4 Fontes de Duplicidade Identificadas

1. **Importação massiva de planilhas** - Mesmos contatos podem ter sido importados múltiplas vezes
2. **Conversão Lead → Contato** - Se um lead é convertido manualmente, mas já existia um contato com mesmo telefone
3. **Criação manual duplicada** - Não há verificação antes de criar novo contato
4. **Vínculo Company** - Uma empresa pode ter múltiplos contatos, mas não há controle de unicidade

---

## ETAPA 6 — DEPENDÊNCIAS CRÍTICAS

### 6.1 Mapa de Dependências

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CONTACTS                                      │
│  (contacts)                                                            │
└─────────────┬─────────────┬─────────────┬─────────────┬────────────────┘
              │             │             │             │
              ▼             ▼             ▼             ▼
      ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
      │  DEALS    │  │  TASKS    │  │ACTIVITIES │  │CONVERSAS  │
      │(Pipeline) │  │(Tarefas)  │  │(Histórico) │  │(WhatsApp) │
      └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
            │              │              │              │
            │              │              │              │
            ▼              ▼              ▼              ▼
      ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
      │  QUOTES   │  │  ORDERS   │  │  AUDIT    │  │  LEADS    │
      │(Orçamentos)│ │ (Pedidos) │  │  LOGS     │  │ (Leads)   │
      └───────────┘  └───────────┘  └───────────┘  └───────────┘
```

### 6.2 Detalhamento de Foreign Keys

**1. DEALS (Negociações)**
```sql
contato_id uuid REFERENCES contacts(id)
```
- Criação de deal vinculada a contato (`pipeline/actions.ts:54`)
- Contato é opcional na negociação

**2. TASKS (Tarefas)**
```sql
contato_id uuid REFERENCES contacts(id)
```
- Tarefas podem ser vinculadas a contatos
- Permite múltiplas tarefas por contato

**3. ACTIVITIES (Atividades)**
```sql
contato_id uuid REFERENCES contacts(id)
```
- Histórico de atividades do contato
- Múltiplas atividades por contato

**4. CONVERSATIONS (Conversas WhatsApp)**
```sql
contato_id uuid REFERENCES contacts(id)
```
- Vinculação de conversas WhatsApp a contatos
- Permite vincular conversa a contato existente
- Resolução de nome por telefone (`040_conversations_nome_contato.sql:46-59`)

**5. QUOTES (Orçamentos)**
```sql
contato_id uuid REFERENCES contacts(id)  -- Migration 026
```
- Orçamentos podem ter contato vinculado
- Usado para identificação do cliente no orçamento

**6. ORDERS (Pedidos)**
```sql
contato_id uuid REFERENCES contacts(id)
```
- Pedidos podem ter contato vinculado
- Herdado do orçamento que originou o pedido

### 6.3 Regras de Negócio com Contatos

**Arquivo: `app/(dashboard)/contatos/actions.ts`**

```typescript
// Ao excluir contato, limpa referências em:
await admin.from('deals').update({ contato_id: null }).eq('contato_id', contatoId)
await admin.from('tasks').update({ contato_id: null }).eq('contato_id', contatoId)
await admin.from('activities').update({ contato_id: null }).eq('contato_id', contatoId)
await admin.from('conversations').update({ contato_id: null }).eq('contato_id', contatoId)
```

**Arquivo: `app/(dashboard)/whatsapp/actions.ts`**

```typescript
// Ao buscar contato por telefone para iniciar conversa:
const { data: todosContatos } = await supabase
  .from('contacts')
  .select('nome, telefone')
  .eq('organization_id', perfil.organization_id)
  .not('telefone', 'is', null)

const contatoPorTel = (todosContatos ?? []).find((c) => 
  c.telefone && telefonesIguais(formatado, c.telefone)
)
```

### 6.4 Impacto de Alterações

| Módulo | Impacto ao Alterar contacts | Impacto ao Excluir contacts |
|--------|------------------------------|-----------------------------|
| WhatsApp | Baixo - usa telefone para busca | Baixo - limpa FK |
| Leads | Nenhum | Nenhum |
| Pipeline/Deals | Médio - deal pode perder referência | Médio - deal fica órfão |
| Orçamentos | Médio - orçamentos perdem vínculo | Médio - orçamentos órfãos |
| Pedidos | Médio - pedidos perdem vínculo | Médio - pedidos órfãos |
| Agenda/Tarefas | Baixo - tarefas ficam órfãs | Baixo - tarefas limpas |
| Histórico | Baixo - histórico fica órfão | Baixo - histórico limpa |

---

## ETAPA 7 — VIABILIDADE DE EVOLUÇÃO

### 7.1 Avaliação: Adicionar Campos na Tabela Atual

**Para Pessoa Física (Profissionais de Saúde):**

| Campo Desejado | Existe? | Via Migration | Complexidade |
|---------------|---------|---------------|---------------|
| nome | ✅ | - | Nenhuma |
| CPF | ⚠️ | `cpf_cnpj` existe | Alta (precisa separar) |
| telefone | ✅ | - | Nenhuma |
| whatsapp | ⚠️ | `telefone` serve | Baixa (pode reutilizar) |
| email | ✅ | - | Nenhuma |
| tipo_conselho | ❌ | Adicionar | Baixa |
| numero_conselho | ❌ | Adicionar | Baixa |
| uf_conselho | ❌ | Adicionar | Baixa |
| cep | ✅ | Migration 036 | Nenhuma |
| rua | ⚠️ | `endereco` existe | Alta (precisa separar) |
| número | ✅ | Migration 036 | Nenhuma |
| complemento | ✅ | Migration 036 | Nenhuma |
| bairro | ✅ | Migration 036 | Nenhuma |
| cidade | ✅ | Migration 036 | Nenhuma |
| estado | ✅ | Migration 036 | Nenhuma |

**Para Pessoa Jurídica (Empresas):**

| Campo Desejado | Existe? | Via Migration | Complexidade |
|---------------|---------|---------------|---------------|
| razão social | ⚠️ | `companies.nome` | Alta (precisa separar) |
| nome fantasia | ❌ | Adicionar em companies | Baixa |
| CNPJ | ⚠️ | `companies.cnpj` | Baixa |
| inscrição estadual | ❌ | Adicionar | Baixa |
| inscrição municipal | ❌ | Adicionar | Baixa |
| Endereço Fiscal | ⚠️ | `companies.endereco` | Alta |
| Endereço de Entrega | ❌ | Nova tabela necessária | Alta |

### 7.2 Problemas Estruturais Identificados

**PROBLEMA 1: Endereço Monolítico**

O campo `endereco` na tabela `contacts` armazena o endereço como texto livre concatenado. Isso dificulta:
- Validação de CEP
- Integração com correios
- Busca por bairro/cidade/estado
- Cálculo de frete por região

**PROBLEMA 2: Empresa como Entidade Separada**

A tabela `companies` existe mas:
- Não tem vínculo obrigatório com `contacts`
- Não tem campos para responsável técnico
- Não distingue tipo de empresa (clínica, laboratório, etc.)
- Contatos de uma mesma empresa não são automaticamente vinculados

**PROBLEMA 3: Falta de Tipo de Pessoa**

Sem um campo `tipo_pessoa` ('FISICA' | 'JURIDICA'), o sistema não pode:
- Validar CPF vs CNPJ automaticamente
- Exibir formulários diferentes
- Aplicar regras de negócio específicas

**PROBLEMA 4: Conselho Profissional Genérico**

O campo `cpf_cnpj` é usado tanto para CPF quanto CNPJ. Para profissionais de saúde, seria necessário:
- `tipo_conselho` (CRM, CRO, CRBM, CRN, CRF, CREFITO)
- `numero_conselho` (número do registro)
- `uf_conselho` (estado do conselho)

### 7.3 Viabilidade Técnica

| Solução | Viabilidade | Risco | Esforço |
|---------|-------------|-------|---------|
| Adicionar campos via migration | ✅ Viável | Médio | Baixo |
| Separar cpf_cnpj em campos distintos | ⚠️ Complexo | Alto | Alto |
| Criar nova tabela de endereços | ✅ Viável | Médio | Médio |
| Criar nova tabela de responsável | ✅ Viável | Baixo | Médio |
| Normalizar companies | ⚠️ Complexo | Alto | Alto |

---

## ETAPA 8 — ANÁLISE DE RISCO

### 8.1 Risco de Adicionar Campos

| Ação | Risco | Justificativa |
|------|-------|---------------|
| Adicionar `tipo_conselho` | **Baixo** | Campo simples, sem impacta queries existentes |
| Adicionar `numero_conselho` | **Baixo** | Campo simples, sem impacta queries existentes |
| Adicionar `uf_conselho` | **Baixo** | Campo simples, sem impacta queries existentes |
| Adicionar `inscricao_estadual` em companies | **Baixo** | Campo simples, sem impacta queries existentes |
| Adicionar `inscricao_municipal` em companies | **Baixo** | Campo simples, sem impacta queries existentes |
| Adicionar `endereco_fiscal` em companies | **Médio** | Requer análise de uso atual do campo `endereco` |
| Adicionar `endereco_entrega` em companies | **Médio** | Requer análise de uso atual do campo `endereco` |

### 8.2 Risco de Alterar Estrutura

| Ação | Risco | Justificativa |
|------|-------|---------------|
| Separar `cpf_cnpj` em `cpf` e `cnpj` | **Crítico** | Afeta todas as queries que usam `cpf_cnpj`. Quebra histórico. |
| Alterar `endereco` para campos normalizados | **Alto** | Afeta todas as telas que exibem/editam endereço |
| Adicionar `tipo_pessoa` | **Alto** | Requer validação de dados existentes e migração |
| Modificar `companies` estrutura | **Alto** | Afeta telas de empresas e vínculos |

### 8.3 Risco de Criar Novas Tabelas

| Ação | Risco | Justificativa |
|------|-------|---------------|
| Criar `contact_professional_info` | **Baixo** | Nova tabela, sem impacto em código existente |
| Criar `company_addresses` | **Médio** | Requer mudança na lógica de exibição de endereços |
| Criar `company_responsibles` | **Baixo** | Nova tabela, sem impacto em código existente |

### 8.4 Risco de Deduplicação

| Ação | Risco | Justificativa |
|------|-------|---------------|
| Criar constraint UNIQUE em contacts.telefone | **Crítico** | Dados duplicados existentes vão falhar |
| Criar constraint UNIQUE em contacts.email | **Crítico** | Dados duplicados existentes vão falhar |
| Criar constraint UNIQUE em contacts.cpf_cnpj | **Crítico** | Dados duplicados existentes vão falhar |
| Deduplicar dados existentes | **Crítico** | Requer análise manual de cada caso |

### 8.5 Risco de Quebrar Módulos

| Módulo | Risco | Justificativa |
|--------|-------|---------------|
| WhatsApp | **Médio** | Usa `telefone` para busca, não `cpf_cnpj`. Baixa dependência. |
| Leads | **Baixo** | Tabela separada, não herda estrutura de contacts |
| Pipeline/Deals | **Médio** | Usa `contato_id` como FK opcional. Mudanças em contacts não afetam estrutura. |
| Orçamentos | **Médio** | Usa `contato_id` como FK opcional. Mudanças em contacts não afetam estrutura. |
| Pedidos | **Médio** | Herda de orçamentos. Mudanças em contacts não afetam estrutura. |
| Agenda/Tarefas | **Baixo** | Usa `contato_id` como FK opcional |

### 8.6 Matriz de Risco Consolidada

| Categoria | Nível Geral | Ação Recomendada |
|-----------|-------------|-----------------|
| Adicionar campos simples | **Baixo** | Pode proceder com migrations |
| Alterar campos existentes | **Alto-Crítico** | Evitar ou planejar migração cuidadosa |
| Criar novas tabelas | **Baixo-Médio** | Abordagem recomendada |
| Deduplicar dados | **Crítico** | Requer auditoria prévia manual |
| Quebrar módulos | **Baixo-Médio** | FKs opcionais limitam impacto |

---

## ETAPA 9 — RECOMENDAÇÃO FINAL

### 9.1 Análise Comparativa

| Critério | OPÇÃO A: Evoluir Tabela Atual | OPÇÃO B: Nova Arquitetura |
|----------|------------------------------|---------------------------|
| **Esforço de desenvolvimento** | Médio | Alto |
| **Tempo de implementação** | 2-4 semanas | 8-12 semanas |
| **Risco de quebra** | Alto | Baixo |
| **Retrocompatibilidade** | Parcial | Não |
| **Qualidade dos dados futura** | Moderada | Alta |
| **Manutenção futura** | Complexa | Simples |
| **Adequação para CRM de saúde** | Insuficiente | Completa |

### 9.2 Recomendação: **OPÇÃO A (com estratégias específicas)**

**JUSTIFICATIVA TÉCNICA:**

1. **O sistema já possui estrutura funcional** - A tabela `contacts` com seus campos atuais funciona para o fluxo básico do CRM.

2. **Migrations incrementais são seguras** - Adicionar novos campos via migration é de baixo risco quando bem planejado.

3. **O volume de dados não justifica reescrita** - A massa de dados pode ser migrada incrementalmente.

4. **Dependências são gerenciáveis** - As FKs opcionais limitam o impacto de mudanças.

5. **Nova arquitetura traria risco desnecessário** - Redesenhar completamente exigiria:
   - Migração de todos os dados existentes
   - Atualização de todos os módulos
   - Testes extensivos
   - Tempo significativo

### 9.3 Plano Seguro de Evolução

**FASE 1: Preparação (Semana 1)**
```
□ Criar backup do banco de dados
□ Documentar todas as queries que usam contacts
□ Mapear todos os formulários de contato
□ Identificar dados duplicados (sem corrigir)
```

**FASE 2: Campos Simples (Semana 2-3)**
```
□ Adicionar tipo_conselho (enum: CRM, CRO, CRBM, CRN, CRF, CREFITO)
□ Adicionar numero_conselho
□ Adicionar uf_conselho
□ Adicionar inscricao_estadual em companies
□ Adicionar inscricao_municipal em companies
□ Criar constraint UNIQUE em contacts.email (se não houver duplicados)
□ Criar constraint UNIQUE em companies.cnpj (se não houver duplicados)
```

**FASE 3: Campos de Endereço (Semana 4-5)**
```
□ Criar tabela contact_addresses
  - id, contact_id, tipo (fiscal/entrega), cep, rua, numero, complemento, bairro, cidade, estado
□ Migrar dados existentes do campo endereco para nova tabela
□ Atualizar formulários para usar nova estrutura
□ Manter campo endereco legível para retrocompatibilidade
```

**FASE 4: Responsáveis (Semana 6-7)**
```
□ Criar tabela company_responsibles
  - id, company_id, nome, cargo, telefone, whatsapp, email
□ Atualizar telas de empresa para gerenciar responsáveis
```

**FASE 5: Tipo de Pessoa (Semana 8-9)**
```
□ Adicionar tipo_pessoa em contacts ('FISICA' | 'JURIDICA')
□ Adicionar tipo em companies
□ Criar lógica de validação baseada no tipo
□ Atualizar formulários condicionalmente
```

**FASE 6: Dados e Limpeza (Semana 10-12)**
```
□ Normalizar cpf_cnpj baseado no tipo_pessoa
□ Identificar e marcar duplicados (sem excluir)
□ Criar views para facilitar consultas
□ Treinar equipe sobre nova estrutura
```

### 9.4 Pontos de Atenção

1. **Nunca modificar o campo `cpf_cnpj` diretamente** - Criar novos campos e migrar dados gradualmente.

2. **Manter retrocompatibilidade** - Não remover campos legados até que todos os dados estejam migrados.

3. **Testar cada migration** - Executar em ambiente de staging antes de produção.

4. **Documentar mudanças** - Manter registro de todas as alterações de schema.

5. **Monitorar performance** - Adicionar índices conforme necessário.

---

## CONCLUSÃO

O sistema atual do CRM DPRIME possui uma estrutura funcional para um CRM genérico, mas apresenta **limitações significativas** para atender às necessidades específicas de profissionais de saúde e empresas do setor.

A **recomendação é evoluir a estrutura atual** através de migrations incrementais, adicionando:
- Campos para conselho profissional
- Campos para endereço normalizado
- Campos para responsáveis de empresa
- Identificação de tipo de pessoa

Esta abordagem:
- ✅ Minimiza risco de quebra
- ✅ Permite retrocompatibilidade
- ✅ Pode ser executada em etapas
- ✅ Não requer reescrita de código existente
- ✅ Mantém a integridade dos dados existentes

**EVITAR:**
- ❌ Modificar campos existentes (como `cpf_cnpj`)
- ❌ Criar constraints únicas sem auditar dados primeiro
- ❌ Excluir dados duplicados sem análise manual
- ❌ Redesenhar completamente a arquitetura

---

*Documento gerado através de auditoria estática do código e estrutura do banco de dados.*
*Não foram executadas queries diretas no banco de dados.*
*Recomenda-se validação das estatísticas com queries reais antes de implementar qualquer mudança.*
