# VALIDAÇÃO FINAL — DADOS PARA EMISSÃO DE NOTA NO PDF
## CRM DPRIME

**Data:** 12 de Junho de 2026  
**Versão:** 1.0  
**Auditor:** Arquiteto de Software Sênior / DBA Sênior / Auditor Técnico

---

## SUMÁRIO

1. [ETAPA 1 — AUDITORIA REAL DE COMPANIES](#etapa-1--auditoria-real-de-companies)
2. [ETAPA 2 — USO REAL DE empresa_id](#etapa-2--uso-real-de-empresa_id)
3. [ETAPA 3 — COMPANIES VS ORGANIZATIONS](#etapa-3--companies-vs-organizations)
4. [ETAPA 4 — CAMPOS NECESSÁRIOS PARA O PDF](#etapa-4--campos-necessários-para-o-pdf)
5. [ETAPA 5 — ESTRATÉGIA DE ENDEREÇO PARA NOTA](#etapa-5--estratégia-de-endereço-para-nota)
6. [ETAPA 6 — ARQUITETURA RECOMENDADA](#etapa-6--arquitetura-recomendada)
7. [ETAPA 7 — SNAPSHOT ADMINISTRATIVO](#etapa-7--snapshot-administrativo)
8. [ETAPA 8 — IMPACTO NO PDF](#etapa-8--impacto-no-pdf)
9. [ETAPA 9 — RISCOS OCULTOS](#etapa-9--riscos-ocultos)
10. [ETAPA 10 — RECOMENDAÇÃO FINAL](#etapa-10--recomendação-final)

---

## CONTEXTO

O CRM DPRIME **NÃO realiza venda direta**.

O CRM DPRIME **NÃO emite nota fiscal**.

O CRM DPRIME faz:
- Controle comercial da venda realizada
- Geração de orçamento/pedido
- Geração de PDF final

Esse PDF é enviado para **outro setor** que dará continuidade aos processos:
- Emissão da nota fiscal
- Conferência administrativa
- Faturamento
- Separação
- Expedição

**Objetivo:** Registrar e exibir no PDF final os "Dados para emissão da nota fiscal", indicando se a nota deverá sair no CPF do contato ou no CNPJ da empresa/clínica vinculada.

---

## ETAPA 1 — AUDITORIA REAL DE COMPANIES

### 1.1 SCHEMA COMPLETO

**Tabela:** `companies`

**Origem:** `supabase/migrations/001_schema_completo.sql`

```sql
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  nome text NOT NULL,
  cnpj text,
  site text,
  telefone text,
  endereco text,
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now()
);
```

---

### 1.2 COLUNAS ATUAIS

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | uuid | NOT NULL | PK |
| organization_id | uuid | NOT NULL | FK → organizations |
| nome | text | NOT NULL | Razão Social |
| cnpj | text | SIM | CNPJ |
| site | text | SIM | Website |
| telefone | text | SIM | Telefone |
| endereco | text | SIM | Endereço único |
| criado_em | timestamptz | DEFAULT | Data criação |
| atualizado_em | timestamptz | DEFAULT | Data atualização |

---

### 1.3 ÍNDICES

| Índice | Coluna | Arquivo |
|--------|--------|---------|
| PRIMARY KEY | id | 001_schema_completo.sql |
| idx_contacts_empresa_id | contacts.empresa_id | 037_indices_performance.sql |

**Nota:** A tabela `companies` NÃO possui índice próprio em `cnpj` ou `nome`.

---

### 1.4 CONSTRAINTS

| Constraint | Tipo |
|------------|------|
| PRIMARY KEY | id |
| NOT NULL | organization_id, nome |
| REFERENCES | organization_id → organizations(id) |

---

### 1.5 FOREIGN KEYS

| FK | De | Para | Arquivo |
|----|-----|------|---------|
| empresa_id | contacts | companies | 001_schema_completo.sql |

---

### 1.6 AVALIAÇÃO PARA PDF

| Aspecto | Status | Observação |
|---------|--------|------------|
| Estrutura básica | ✅ OK | Tem nome, cnpj, telefone, endereco |
| Campos fiscais | ❌ FALTANDO | Não tem nome_fantasia, IE, IM |
| Endereço estruturado | ❌ FALTANDO | Apenas campo texto único |
| Índice em CNPJ | ❌ FALTANDO | Recomendado para performance |

---

## ETAPA 2 — USO REAL DE empresa_id

### 2.1 EVIDÊNCIA DO VÍNCULO

**Arquivo:** `supabase/migrations/001_schema_completo.sql`
```sql
empresa_id uuid references companies(id),
```

**Arquivo:** `supabase/migrations/037_indices_performance.sql`
```sql
CREATE INDEX IF NOT EXISTS idx_contacts_empresa_id ON contacts(empresa_id);
```

**Verificação:** ✅ A FK `empresa_id` em `contacts` referencia `companies(id)` — **CONFIRMADO**.

---

### 2.2 USO NO CÓDIGO

**Arquivo:** `app/(dashboard)/contatos/actions.ts:24-44`

```typescript
async function resolverEmpresa(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organization_id: string,
  empresa_nome: string | null
): Promise<string | null> {
  if (!empresa_nome) return null

  const { data: existente } = await supabase
    .from('companies')
    .select('id')
    .eq('organization_id', organization_id)
    .ilike('nome', empresa_nome)
    .single()

  if (existente) return existente.id

  const { data: nova, error } = await supabase
    .from('companies')
    .insert({ organization_id, nome: empresa_nome })
    .select('id')
    .single()

  if (error) throw new Error(`Erro ao criar empresa: ${error.message}`)
  return nova.id
}
```

**Uso em criarContato:**
```typescript
const empresa_id = await resolverEmpresa(supabase, perfil.organization_id, empresa_nome)
// ...
.insert({ empresa_id, ... })
```

---

### 2.3 ARQUIVOS QUE UTILIZAM empresa_id

| Arquivo | Uso |
|---------|-----|
| `types/database.ts` | Tipo Contact com empresa_id |
| `app/(dashboard)/contatos/page.tsx` | JOIN com companies |
| `app/(dashboard)/contatos/actions.ts` | resolverEmpresa() |
| `app/(dashboard)/contatos/exportar/route.ts` | JOIN com companies |
| `app/(dashboard)/contatos/[id]/page.tsx` | JOIN com companies |

---

### 2.4 AVALIAÇÃO

| Aspecto | Status |
|--------|--------|
| FK existe | ✅ CONFIRMADO |
| Índice existe | ✅ CONFIRMADO |
| Código usa | ✅ CONFIRMADO |
| Empresas são criadas automaticamente | ✅ CONFIRMADO |
| Empresas são vinculadas ao criar/editar contato | ✅ CONFIRMADO |

---

## ETAPA 3 — COMPANIES VS ORGANIZATIONS

### 3.1 ORGANIZATIONS

**Propósito:** Representa a **conta do cliente** no sistema multi-tenant (empresa que usa o CRM).

```typescript
export type Organization = {
  id: string
  nome: string
  slug: string
  plano: string
  ativo: boolean
  nome_fantasia: string | null
  cnpj: string | null
  logo_url: string | null
  telefone: string | null
  email: string | null
  endereco: string | null
  criado_em: string
  atualizado_em: string
}
```

**Uso no sistema:**
- Configurações de branding (logo, nome fantasia)
- CNPJ da empresa vendedora
- Dados para o PDF do orçamento (cabeçalho)

---

### 3.2 COMPANIES

**Propósito:** Representa as **empresas dos contatos** (clientes que o usuário do CRM atende).

```typescript
export type Company = {
  id: string
  organization_id: string
  nome: string
  cnpj: string | null
  site: string | null
  telefone: string | null
  endereco: string | null
  criado_em: string
  atualizado_em: string
}
```

**Uso no sistema:**
- Empresas vinculadas aos contatos
- Clínicas, consultórios, distribuidoras
- Fonte de dados para emissão de nota

---

### 3.3 ANÁLISE DE DIFERENÇAS

| Aspecto | Organizations | Companies |
|--------|---------------|-----------|
| **Propósito** | Conta do sistema (vendedora) | Entidades dos contatos (compradoras) |
| **Dono** | Admin do CRM | Usuário que cadastra |
| **Escopo** | Todo o sistema | Contatos específicos |
| **CNPJ** | CNPJ da empresa vendedora | CNPJ da empresa compradora |
| **Logo** | Sim | Não |
| **Branding** | Sim | Não |
| **PDF** | Cabeçalho do orçamento | Dados para emissão da nota |

---

### 3.4 EXISTE SOBREPOSIÇÃO/CONFLITO?

**RESPOSTA: NÃO**

| Aspecto | Status |
|--------|--------|
| Sobreposição | ❌ NÃO |
| Conflito | ❌ NÃO |
| Duplicidade | ❌ NÃO |
| Responsabilidades claras | ✅ SIM |

**Companies é a tabela correta** para representar a empresa/clínica indicada para emissão da nota.

---

## ETAPA 4 — CAMPOS NECESSÁRIOS PARA O PDF

### 4.1 nome_fantasia

| Classificação | **RECOMENDADO** |
|--------------|-----------------|

**Justificativa:**
- Empresas B2B geralmente usam nome fantasia diferente da razão social
- Clínicas: "Clínica Vida" vs razão "Clínica Vida Ltda"
- Útil quando razão social é muito extensa
- Organizations já tem `nome_fantasia` — mesma lógica

**Tipo sugerido:** `text NULL`

---

### 4.2 cnpj

| Classificação | **OBRIGATÓRIO** |
|--------------|-----------------|

**Status:** ✅ JÁ EXISTE

**Justificativa:**
- Identificador fiscal principal para pessoa jurídica
- Essencial para qualquer documento fiscal
- Campo crítico para o setor responsável pela nota

---

### 4.3 inscricao_estadual

| Classificação | **RECOMENDADO** |
|--------------|-----------------|

**Justificativa:**
- Campo usado em notas fiscais interestaduais
- Pode ser "ISENTO" ou número real
- Importante para identificação fiscal

**Tipo sugerido:** `text NULL`

---

### 4.4 inscricao_municipal

| Classificação | **OPCIONAL** |
|--------------|---------------|

**Justificativa:**
- Necessário apenas para NFS-e (Nota Fiscal de Serviços)
- Muitos distribuidores não emitem NFS-e
- Pode ser adicionado posteriormente se necessário

**Tipo sugerido:** `text NULL`

---

### 4.5 endereco

| Classificação | **OBRIGATÓRIO** |
|--------------|-----------------|

**Status:** ✅ JÁ EXISTE (texto único)

**Justificativa:**
- Endereço da empresa para emissão da nota
- Pode ser diferente do endereço de entrega
- Essencial para o setor responsável

---

### 4.6 RESUMO DA CLASSIFICAÇÃO

| Campo | Status | Classificação para PDF |
|-------|--------|------------------------|
| nome | ✅ Existe | **Obrigatório** |
| cnpj | ✅ Existe | **Obrigatório** |
| nome_fantasia | ❌ Ausente | **Recomendado** |
| inscricao_estadual | ❌ Ausente | **Recomendado** |
| inscricao_municipal | ❌ Ausente | Opcional |
| endereco | ✅ Existe | **Obrigatório** |

---

## ETAPA 5 — ESTRATÉGIA DE ENDEREÇO PARA NOTA

### 5.1 OPÇÃO A: Usar endereço atual da empresa

**Descrição:** Usar o campo `endereco` existente (texto único) como endereço para emissão da nota.

**Vantagens:**
- Sem necessidade de novos campos
- Compatibilidade total com código existente
- Implementação mais rápida
- Funciona para a maioria dos casos

**Desvantagens:**
- Endereço não estruturado
- Não permite validação de CEP
- Pode haver diferença entre endereço cadastral e de entrega

---

### 5.2 OPÇÃO B: Criar campos separados para endereço de nota

**Descrição:** Adicionar campos estruturados específicos para endereço de emissão da nota.

**Campos:**
```sql
nota_cep text,
nota_logradouro text,
nota_numero text,
nota_complemento text,
nota_bairro text,
nota_cidade text,
nota_estado text
```

**Vantagens:**
- Endereço estruturado para documentos
- Possibilidade de separar endereço fiscal de entrega
- Validação de CEP facilitada
- Clareza para o setor responsável

**Desvantagens:**
- Mais campos para migrar
- Maior complexidade
- Impacto em formulários existentes

---

### 5.3 RECOMENDAÇÃO

**✅ OPÇÃO A: Usar endereço atual (com fallback)**

**Justificativa para o DPRIME:**

1. **Contexto do negócio**
   - Distribuidores vendem para clínicas/consultórios
   - Endereço de entrega já é registrado em campo separado (`endereco_entrega`)
   - Endereço cadastral geralmente é o mesmo usado para nota

2. **Praticidade**
   - O campo `endereco` já existe em companies
   - Adicionar campos estruturados pode ser feito gradualmente
   - Não há demanda imediata para separação

3. **Estratégia sugerida**
   - Manter `endereco` como campo único
   - Se necessário, adicionar campos estruturados depois
   - O PDF pode formatar o endereço existente

4. **Nota sobre endereço de entrega**
   - O sistema já tem `endereco_entrega` em quotes/orders
   - Este campo é separado do endereço de faturamento
   - A separação já existe no modelo atual

---

## ETAPA 6 — ARQUITETURA RECOMENDADA

### 6.1 MODELO CONCEITUAL

```
┌─────────────────────────────────────────────────────────────────┐
│ CONTACT (Pessoa de Relacionamento)                             │
│                                                                 │
│ • nome: "Dr. João Silva"                                        │
│ • telefone: "(11) 99999-9999"                                 │
│ • email: "joao@clinica.com"                                    │
│ • empresa_id: "clinica-joao-ltda"  ──────────────────────────┐  │
│ • cpf_cnpj: "123.456.789-00"                                  │  │
│ • cargo: "Diretor Clínico"                                     │  │
│ • endereco, endereco_numero, ... (endereço do contato)         │  │
└─────────────────────────────────────────────────────────│────────┘
                                                              │
┌──────────────────────────────────────────────────────────────▼─┐
│ COMPANY (Empresa/Clínica para Nota Fiscal)                    │
│                                                                 │
│ • nome: "Clínica João Silva LTDA"  (Razão Social)              │
│ • cnpj: "12.345.678/0001-90"                                  │
│ • nome_fantasia: "Clínica João Silva"  ← RECOMENDADO          │
│ • inscricao_estadual: "123.456.789"  ← RECOMENDADO            │
│ • inscricao_municipal: null  ← OPCIONAL                       │
│ • endereco: "Av. Paulista, 1000, Centro"                     │
└──────────────────────────────────────────────────────────────┘
                                                              │
                                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ QUOTE (Orçamento)                                              │
│                                                                 │
│ • contato_id: "contato-dr-joao"  (relacionamento)             │
│                                                                 │
│ • nota_tipo_pessoa: "PJ"  ← SNAPSHOT                          │
│ • nota_company_id: "clinica-joao-ltda"  ← SNAPSHOT             │
│ • nota_nome: "Clínica João Silva LTDA"  ← SNAPSHOT            │
│ • nota_documento: "12.345.678/0001-90"  ← SNAPSHOT             │
│ • nota_razao_social: "Clínica João Silva LTDA"  ← SNAPSHOT    │
│ • nota_nome_fantasia: "Clínica João Silva"  ← SNAPSHOT        │
│ • nota_endereco: "Av. Paulista, 1000, Centro"  ← SNAPSHOT      │
│ • nota_ie: "123.456.789"  ← SNAPSHOT                           │
│ • nota_im: null  ← SNAPSHOT                                    │
└─────────────────────────────────────────────────────────────────┘
                                                              │
                                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ ORDER (Pedido)                                                 │
│                                                                 │
│ • contato_id: "contato-dr-joao" (relacionamento)              │
│ • quote_id: "orcamento-123"                                   │
│                                                                 │
│ • nota_tipo_pessoa: "PJ" (copiado do quote)                    │
│ • nota_company_id: "clinica-joao-ltda" (copiado)               │
│ • nota_nome: "Clínica João Silva LTDA" (copiado)              │
│ • nota_documento: "12.345.678/0001-90" (copiado)              │
│ • nota_razao_social: "Clínica João Silva LTDA" (copiado)      │
│ • nota_nome_fantasia: "Clínica João Silva" (copiado)          │
│ • nota_endereco: "Av. Paulista, 1000, Centro" (copiado)        │
│ • nota_ie: "123.456.789" (copiado)                            │
│ • nota_im: null (copiado)                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

### 6.2 FLUXO DE DADOS

```
1. Usuário seleciona contato no orçamento
   ↓
2. Sistema identifica empresa vinculada (empresa_id)
   ↓
3. Usuário escolhe tipo de nota: PF ou PJ
   ↓
4. Se PJ: sistema pré-preenche dados da company
   Se PF: sistema pré-preenche dados do contato
   ↓
5. Snapshot é salvo no orçamento
   ↓
6. Na conversão, snapshot é copiado para o pedido
   ↓
7. PDF exibe:
   - DADOS DO COMPRADOR (contato)
   - DADOS PARA EMISSÃO DA NOTA (snapshot)
```

---

### 6.3 RAZÃO SOCIAL vs NOME FANTASIA

| Situação | Usar no PDF |
|---------|-------------|
| Nome fantasia existe | Nome Fantasia (razão social entre parênteses) |
| Nome fantasia não existe | Razão Social |
| PF | Nome completo |

**Exemplo no PDF:**
```
DADOS PARA EMISSÃO DA NOTA

Razão Social: Clínica João Silva LTDA
Nome Fantasia: Clínica João Silva
CNPJ: 12.345.678/0001-90
IE: 123.456.789
Endereço: Av. Paulista, 1000, Centro - São Paulo/SP
```

---

## ETAPA 7 — SNAPSHOT ADMINISTRATIVO

### 7.1 NOMENCLATURA: "nota_" vs "faturamento_"

**PREFERO: "nota_"**

**Justificativa:**

1. **Clareza semântica**
   - "nota" é direto: dados para a nota fiscal
   - "faturamento" pode ser confundido com processo de billing/pagamento

2. **Contexto do DPRIME**
   - O CRM não fatura, não cobra
   - O objetivo é informar dados para outro setor
   - "Nota" é mais descritivo do contexto real

3. **Padrão no código**
   - Já existe `nota_tipo` em outros contextos? Não há
   - Mas "nota" é auto-explicativo

4. **Diferenciação**
   - "nota" = dados para emissão da nota
   - "faturamento" = processo de cobrança (confuso)

---

### 7.2 CAMPOS DO SNAPSHOT

| Campo | Tipo | Descrição |
|-------|------|-----------|
| nota_tipo_pessoa | text | 'PF' ou 'PJ' |
| nota_contact_id | uuid | ID do contato (quando PF) |
| nota_company_id | uuid | ID da empresa (quando PJ) |
| nota_nome | text | Nome/Razão Social para a nota |
| nota_documento | text | CPF ou CNPJ |
| nota_tipo_documento | text | 'CPF' ou 'CNPJ' |
| nota_razao_social | text | Razão Social (para PJ) |
| nota_nome_fantasia | text | Nome Fantasia (para PJ) |
| nota_endereco | text | Endereço para a nota |
| nota_ie | text | Inscrição Estadual |
| nota_im | text | Inscrição Municipal |

---

### 7.3 PREENCHIMENTO DO SNAPSHOT

**Na criação do orçamento:**

| Tipo | Fonte dos dados |
|------|-----------------|
| PF | `contato.nome`, `contato.cpf_cnpj`, `contato.endereco` concatenado |
| PJ | `company.nome`, `company.cnpj`, `company.nome_fantasia`, `company.inscricao_estadual`, `company.endereco` |

**Na conversão para pedido:**

| Ação |
|------|
| Copiar TODOS os campos de snapshot do orçamento para o pedido |

---

### 7.4 CONSIDERAÇÕES SOBRE SNAPSHOT

| Aspecto | Avaliação |
|--------|-----------|
| Imutabilidade | ✅ Garantida — dados não mudam se empresa for editada |
| Auditoria | ✅ Facilitada — snapshot preserva estado no momento |
| Dados antigos | ⚠️ NULL — orçamentos/pedidos sem snapshot terão campos vazios |
| Impacto no banco | ✅ Mínimo — campos opcionais, não alteram estrutura |

---

## ETAPA 8 — IMPACTO NO PDF

### 8.1 ESTRUTURA ATUAL DO PDF

**Arquivo:** `components/orcamentos/orcamento-pdf-generator.ts:230-360`

**Seção atual:**
```
┌─────────────────────────────────────────────────────────────────┐
│ DADOS DO COMPRADOR                                              │
│                                                                 │
│ Cliente: Dr. João Silva                                         │
│ CNPJ/CPF: 123.456.789-00                                       │
│ Endereço: Av. Paulista, 1000, Centro - São Paulo/SP            │
│ Telefone: (11) 99999-9999                                      │
│ E-mail: joao@clinica.com                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

### 8.2 ESTRUTURA PROPOSTA

```
┌─────────────────────────────────────────────────────────────────┐
│ DADOS DO COMPRADOR                                              │
│                                                                 │
│ Nome: Dr. João Silva                                            │
│ Telefone: (11) 99999-9999                                      │
│ E-mail: joao@clinica.com                                       │
│ Cargo: Diretor Clínico                                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ DADOS PARA EMISSÃO DA NOTA                                      │
│                                                                 │
│ Tipo: Pessoa Jurídica                                           │
│                                                                 │
│ Razão Social: Clínica João Silva LTDA                           │
│ Nome Fantasia: Clínica João Silva                               │
│ CNPJ: 12.345.678/0001-90                                       │
│ IE: 123.456.789                                                │
│ Endereço: Av. Paulista, 1000, Centro - São Paulo/SP             │
└─────────────────────────────────────────────────────────────────┘
```

---

### 8.3 DIFERENÇAS CHAVE

| Aspecto | Atual | Proposto |
|--------|-------|----------|
| Seção única | ✅ | Separada em duas seções |
| Dados do comprador | Mostra CPF/CNPJ | Mostra apenas contato |
| Dados para nota | Não existe | Nova seção dedicada |
| Tipo de pessoa | Misturado | Explicito (PF/PJ) |
| Campos fiscais | Parcial | Completo (IE, IM) |

---

### 8.4 CAMPOS POR SEÇÃO

#### DADOS DO COMPRADOR

| Campo | Fonte | Obrigatório |
|-------|-------|-------------|
| Nome | `contato.nome` | ✅ SIM |
| Telefone | `contato.telefone` | NÃO |
| E-mail | `contato.email` | NÃO |
| Cargo | `contato.cargo` | NÃO |

#### DADOS PARA EMISSÃO DA NOTA

| Campo | Fonte | Obrigatório |
|-------|-------|-------------|
| Tipo | `nota_tipo_pessoa` | ✅ SIM |
| Nome/Razão Social | `nota_nome` | ✅ SIM |
| Nome Fantasia | `nota_nome_fantasia` | NÃO |
| CPF/CNPJ | `nota_documento` | ✅ SIM |
| IE | `nota_ie` | NÃO |
| IM | `nota_im` | NÃO |
| Endereço | `nota_endereco` | ✅ SIM |

---

### 8.5 LÓGICA DE EXIBIÇÃO NO PDF

```typescript
// Seção DADOS DO COMPRADOR (sempre existe)
exibir contato.nome, telefone, email, cargo

// Seção DADOS PARA EMISSÃO DA NOTA
se nota_tipo_pessoa == 'PJ':
  exibir razão social, nome fantasia, CNPJ, IE, endereço
senão se nota_tipo_pessoa == 'PF':
  exibir nome, CPF, endereço
senão:
  exibir aviso "Dados para nota não preenchidos"
```

---

### 8.6 IMPACTO NO CÓDIGO DO PDF

| Aspecto | Impacto |
|---------|---------|
| Nova seção | ✅ Adicionar bloco "DADOS PARA EMISSÃO DA NOTA" |
| Separação | ✅ Remover CPF/CNPJ da seção "COMPRADOR" |
| Condicional | ✅ Mostrar apenas se snapshot existir |
| Fallback | ✅ Se snapshot NULL, exibir aviso |

---

## ETAPA 9 — RISCOS OCULTOS

### 9.1 CONTACTS

| Risco | Nível | Descrição |
|-------|-------|-----------|
| Contatos sem empresa_id | **MÉDIO** | Cadastros antigos podem não ter vínculo |
| Contatos com empresa_id null | **BAIXO** | Sistema trata null corretamente |
| empresa_id referencing empresa deletada | **MÉDIO** | Requer validação ou soft delete |

---

### 9.2 COMPANIES

| Risco | Nível | Descrição |
|-------|-------|-----------|
| Empresas sem CNPJ | **MÉDIO** | PJ deve ter CNPJ, mas pode não ter |
| Empresas sem nome_fantasia | **BAIXO** | Pode usar `nome` como fallback |
| Empresas sem endereço | **BAIXO** | Endereço pode ser preenchido depois |
| Nome duplicado | **MÉDIO** | `resolverEmpresa` busca por ILIKE, pode haver duplicatas |

---

### 9.3 QUOTES

| Risco | Nível | Descrição |
|-------|-------|-----------|
| Orçamentos sem nota_tipo_pessoa | **MÉDIO** | Dados existentes terão NULL |
| Snapshot não preenchido | **MÉDIO** | Novos campos ficarão NULL |
| Campos novos em SELECT | **BAIXO** | SELECT * retorna automaticamente |

---

### 9.4 ORDERS

| Risco | Nível | Descrição |
|-------|-------|-----------|
| RPC não copia snapshot | **CRÍTICO** | Se não atualizar RPC, dados se perdem |
| Pedidos existentes sem snapshot | **MÉDIO** | Dados antigos terão NULL |
| Histórico quebrado | **BAIXO** | Snapshot preserva estado no momento |

---

### 9.5 PDF

| Risco | Nível | Descrição |
|-------|-------|-----------|
| PDF não encontra snapshot | **MÉDIO** | Deve fallback para dados do contato |
| Layout não comporta nova seção | **MÉDIO** | Pode precisar ajuste de layout |
| Dados desatualizados no PDF | **BAIXO** | Snapshot garante dados corretos |

---

### 9.6 CONVERSÃO ORÇAMENTO → PEDIDO

| Risco | Nível | Descrição |
|-------|-------|-----------|
| Modificar RPC sem testar | **CRÍTICO** | Pode quebrar conversão |
| Campos não copiados | **CRÍTICO** | Dados fiscais se perdem |
| Rollback difícil | **ALTO** | Alterações em banco são complexas |

---

### 9.7 DADOS ANTIGOS

| Risco | Nível | Descrição |
|-------|-------|-----------|
| Orçamentos sem snapshot | **MÉDIO** | Exibir aviso no PDF, não bloquear |
| Pedidos sem snapshot | **MÉDIO** | Exibir aviso no PDF, não bloquear |
| Contatos sem empresa | **MÉDIO** | Permitir PF, exigir empresa para PJ |

---

### 9.8 MATRIZ DE RISCOS CONSOLIDADA

| Risco | Nível | Mitigação |
|-------|-------|----------|
| RPC não copia snapshot | **CRÍTICO** | Testar exaustivamente, criar backup |
| Modificar RPC sem testar | **CRÍTICO** | Homologação obrigatória |
| Contatos sem empresa_id | **MÉDIO** | Validar antes de exigir PJ |
| Orçamentos sem nota_tipo_pessoa | **MÉDIO** | Tratar NULL no código |
| Empresas sem CNPJ | **MÉDIO** | Validar no formulário |
| Nome duplicado em companies | **MÉDIO** | Adicionar validação unique |
| empresa_id referencing deletada | **MÉDIO** | Usar soft delete ou validar |
| Layout PDF não acomoda nova seção | **MÉDIO** | Testar com dados reais |
| Rollback difícil | **ALTO** | Documentar, ter scripts prontos |
| Campos não copiados | **CRÍTICO** | Verificar SELECT no INSERT |
| Dados antigos sem snapshot | **MÉDIO** | Exibir aviso, não bloquear |

---

## ETAPA 10 — RECOMENDAÇÃO FINAL

### 10.1 PERGUNTA CENTRAL

**A arquitetura abaixo está aprovada?**

```
CONTACT
   ↓
COMPANY
   ↓
QUOTE
   ↓
ORDER
```

com snapshot administrativo dos dados para emissão da nota em quotes/orders e exibição clara no PDF final.

### 10.2 RESPOSTA

**✅ APROVADA**

---

### 10.3 JUSTIFICATIVA TÉCNICA

1. **Contexto adequado**
   - O DPRIME não emite nota, apenas fornece dados
   - A separação comprador/nota é clara
   - O setor responsável recebe informações completas

2. **Estrutura validada**
   - Companies é a tabela correta para empresas dos contatos
   - FK `empresa_id` existe e funciona
   - Código existente já usa companies

3. **Modelo de snapshot aprovado**
   - Preserva dados no momento do orçamento
   - Não é afetado por alterações futuras
   - Garante consistência entre orçamento e pedido

4. **Nomenclatura "nota_" é adequada**
   - Clareza semântica para o contexto do DPRIME
   - Diferenciação de processos de faturamento
   - Auto-explicativo para o setor responsável

5. **Impacto controlado**
   - Campos opcionais não quebram existentes
   - PDF pode ter fallback para dados antigos
   - Implementação pode ser gradual

---

### 10.4 CAMPOS A ADICIONAR EM COMPANIES

| Campo | Prioridade | Tipo |
|-------|------------|------|
| nome_fantasia | **RECOMENDADO** | text NULL |
| inscricao_estadual | **RECOMENDADO** | text NULL |
| inscricao_municipal | **OPCIONAL** | text NULL |

---

### 10.5 CAMPOS A ADICIONAR EM QUOTES/ORDERS

| Campo | Prioridade | Tipo |
|-------|------------|------|
| nota_tipo_pessoa | **ALTA** | text NULL |
| nota_contact_id | **ALTA** | uuid NULL |
| nota_company_id | **ALTA** | uuid NULL |
| nota_nome | **ALTA** | text NULL |
| nota_documento | **ALTA** | text NULL |
| nota_tipo_documento | **ALTA** | text NULL |
| nota_razao_social | **MÉDIA** | text NULL |
| nota_nome_fantasia | **MÉDIA** | text NULL |
| nota_endereco | **ALTA** | text NULL |
| nota_ie | **MÉDIA** | text NULL |
| nota_im | **BAIXA** | text NULL |

---

### 10.6 AÇÕES CRÍTICAS

| Ação | Prioridade | Observação |
|------|-----------|------------|
| Atualizar RPC de conversão | **CRÍTICA** | Copiar todos os campos de snapshot |
| Adicionar campos em companies | **ALTA** | nome_fantasia, IE, IM |
| Adicionar campos em quotes/orders | **ALTA** | nota_tipo_pessoa + snapshot |
| Testar conversão orçamento → pedido | **CRÍTICA** | Verificar que snapshot é copiado |
| Atualizar PDF do orçamento | **ALTA** | Separar comprador de nota |
| Atualizar formulário de orçamento | **ALTA** | Seletor PF/PJ, preview |

---

### 10.7 EVITAR

| Evitar | Motivo |
|--------|--------|
| Modificar RPC sem backup | Risco crítico de perda de dados |
| Criar constraints obrigatórias | Dados existentes são NULL |
| Substituir contato_id | Usado para relacionamento |
| Exigir nota_tipo_pessoa agora | Dados antigos serão NULL |
| Alterar WhatsApp | Não tem relação com nota |
| Alterar Leads | Não tem relação com nota |

---

### 10.8 CONCLUSÃO

A arquitetura proposta está **APROVADA** para implementação.

**Companies é a tabela correta** para representar a empresa/clínica indicada para emissão da nota.

**O modelo de snapshot com prefixo "nota_"** é a estratégia mais adequada para o contexto do DPRIME — clareza semântica e diferenciação de processos.

**Os principais riscos** estão na modificação da RPC de conversão e na atualização do formulário/PDF — ambos gerenciáveis com testes adequados.

**Dados antigos** não serão bloqueados — o PDF exibirá aviso quando snapshot não existir.

---

## ANEXO — CHECKLIST DE IMPLEMENTAÇÃO

### Fase A: Schema
- [ ] Adicionar campos em companies (nome_fantasia, IE, IM)
- [ ] Adicionar campos em quotes (nota_*)
- [ ] Adicionar campos em orders (nota_*)
- [ ] Atualizar RPC de conversão

### Fase B: Cadastro
- [ ] Atualizar types/database.ts
- [ ] Atualizar form-empresa.tsx (nome_fantasia, IE, IM)

### Fase C: Orçamento
- [ ] Atualizar form-orcamento.tsx (seletor PF/PJ, preview)
- [ ] Atualizar actions de orçamento (preencher snapshot)
- [ ] Atualizar página de detalhe

### Fase D: PDF
- [ ] Atualizar orcamento-pdf-generator.ts
- [ ] Separar "DADOS DO COMPRADOR" de "DADOS PARA EMISSÃO DA NOTA"
- [ ] Adicionar fallback para dados antigos

### Fase E: Conversão
- [ ] Testar RPC com snapshot
- [ ] Verificar que todos campos são copiados

### Fase F: Pedido
- [ ] Atualizar página de detalhe
- [ ] Verificar/adicionar PDF do pedido

### Fase G: Testes
- [ ] Fluxo completo PF
- [ ] Fluxo completo PJ
- [ ] Dados antigos sem snapshot
- [ ] Módulos dependentes

---

*Documento gerado através de análise estática do código.*
*Não foram executadas queries diretas no banco de dados.*
*Recomenda-se validação com dados reais antes de implementar.*
