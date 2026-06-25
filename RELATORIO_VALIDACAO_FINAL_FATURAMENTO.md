# VALIDAÇÃO FINAL DA ARQUITETURA DE FATURAMENTO PF/PJ
## CRM DPRIME

**Data:** 12 de Junho de 2026  
**Versão:** 1.0  
**Auditor:** Arquiteto de Software Sênior / DBA Sênior / Auditor Técnico

---

## SUMÁRIO

1. [ETAPA 1 — AUDITORIA REAL DE COMPANIES](#etapa-1--auditoria-real-de-companies)
2. [ETAPA 2 — USO REAL DE empresa_id](#etapa-2--uso-real-de-empresa_id)
3. [ETAPA 3 — COMPANIES VS ORGANIZATIONS](#etapa-3--companies-vs-organizations)
4. [ETAPA 4 — VIABILIDADE DE COMPANIES COMO ENTIDADE FISCAL](#etapa-4--viabilidade-de-companies-como-entidade-fiscal)
5. [ETAPA 5 — CAMPOS NECESSÁRIOS EM COMPANIES](#etapa-5--campos-necessários-em-companies)
6. [ETAPA 6 — ESTRATÉGIA DE ENDEREÇO FISCAL](#etapa-6--estratégia-de-endereço-fiscal)
7. [ETAPA 7 — VALIDAÇÃO DA ARQUITETURA](#etapa-7--validação-da-arquitetura)
8. [ETAPA 8 — VALIDAÇÃO DO SNAPSHOT FISCAL](#etapa-8--validação-do-snapshot-fiscal)
9. [ETAPA 9 — RISCOS OCULTOS](#etapa-9--riscos-ocultos)
10. [ETAPA 10 — RECOMENDAÇÃO FINAL](#etapa-10--recomendação-final)

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

**Índice:** `supabase/migrations/037_indices_performance.sql`
```sql
CREATE INDEX IF NOT EXISTS idx_contacts_empresa_id ON contacts(empresa_id);
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
| criado_em | timestamptz | DEFAULT now() | Data criação |
| atualizado_em | timestamptz | DEFAULT now() | Data atualização |

---

### 1.3 ÍNDICES

| Índice | Coluna | Tipo |
|--------|--------|------|
| PRIMARY KEY | id | B-tree |
| idx_contacts_empresa_id | contacts.empresa_id | B-tree (não em companies) |

**Observação:** A tabela `companies` NÃO possui índice próprio em `cnpj` ou `nome`.

---

### 1.4 CONSTRAINTS

| Constraint | Tipo |
|------------|------|
| PRIMARY KEY | id |
| NOT NULL | organization_id |
| NOT NULL | nome |
| REFERENCES | organization_id → organizations(id) |

---

### 1.5 FOREIGN KEYS

| FK | De | Para | Ação |
|----|-----|------|------|
| empresa_id | contacts | companies | REFERENCES |

---

### 1.6 DADOS (tipos/database.ts)

**Interface Company:**
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

**Nota:** Não há campos para:
- nome_fantasia
- inscricao_estadual
- inscricao_municipal
- endereço estruturado (rua, número, bairro, cidade, estado, CEP)

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
.insert({
  // ...
  empresa_id,
  // ...
})
```

**Uso em editarContato:**
```typescript
const empresa_id = await resolverEmpresa(supabase, perfil.organization_id, empresa_nome)
// ...
.update({
  // ...
  empresa_id,
  // ...
})
```

---

### 2.3 ARQUIVOS QUE UTILIZAM empresa_id

| Arquivo | Uso |
|---------|-----|
| `types/database.ts` | Tipo Contact com empresa_id |
| `app/(dashboard)/leads/actions.ts` | Não usa diretamente |
| `app/(dashboard)/contatos/page.tsx` | JOIN com companies |
| `app/(dashboard)/contatos/actions.ts` | resolverEmpresa() |
| `app/(dashboard)/contatos/exportar/route.ts` | JOIN com companies |
| `app/(dashboard)/contatos/[id]/page.tsx` | JOIN com companies |

---

### 2.4 CONSIDERAÇÕES SOBRE empresa_id

| Aspecto | Status |
|---------|--------|
| FK existe | ✅ CONFIRMADO |
| Índice existe | ✅ CONFIRMADO |
| Código usa | ✅ CONFIRMADO |
| Empresas são criadas automaticamente | ✅ CONFIRMADO |
| Empresas são vinculadas ao criar/editar contato | ✅ CONFIRMADO |

---

## ETAPA 3 — COMPANIES VS ORGANIZATIONS

### 3.1 ORGANIZATIONS (Organização/Conta do CRM)

**Propósito:** Representa a **conta do cliente** no sistema multi-tenant.

**Interface (types/database.ts):**
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

**Uso:** Configurações da empresa que usa o CRM (logo, CNPJ da empresa vendedora, branding).

---

### 3.2 COMPANIES (Empresas/Clínicas dos contatos)

**Propósito:** Representa as **empresas dos contatos** (clientes do usuário do CRM).

**Interface (types/database.ts):**
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

**Uso:** Clínicas, consultórios, distribuidoras vinculadas aos contatos.

---

### 3.3 ANÁLISE DE SOBREPOSIÇÃO

| Aspecto | Organizations | Companies |
|--------|---------------|-----------|
| **Propósito** | Conta do sistema | Entidade comercial |
| **Dono** | Admin do CRM | Usuário que cadastra |
| **Escopo** | Todo o sistema | Contatos específicos |
| **CNPJ** | CNPJ da empresa vendedora | CNPJ da empresa compradora |
| **Logo** | Sim | Não |
| **Branding** | Sim | Não |
| **Multi-tenant** | Sim (separação) | Sim (organização) |

---

### 3.4 EXISTE CONFLITO?

**RESPOSTA: NÃO**

**Justificativa:**

1. **Propósitos diferentes**
   - Organizations = empresa que usa o CRM (vendedora)
   - Companies = empresas dos contatos (compradoras)

2. **Não há duplicidade**
   - Organizations tem logo, branding, plano
   - Companies tem dados comerciais de clientes

3. **Campos distintos**
   - Organizations: `nome_fantasia`, `logo_url`, `plano`, `ativo`
   - Companies: `site`, `endereco` simples

4. **Contexto diferente**
   - Organizations aparece no PDF como "empresa vendedora"
   - Companies apareceria como "entidade fiscal de faturamento"

---

### 3.5 CONCLUSÃO

| Aspecto | Status |
|---------|--------|
| Sobreposição | ❌ NÃO |
| Conflito | ❌ NÃO |
| Duplicidade | ❌ NÃO |
| Responsabilidades claras | ✅ SIM |

**Companies é a tabela correta para representar entidades fiscais de faturamento.**

---

## ETAPA 4 — VIABILIDADE DE COMPANIES COMO ENTIDADE FISCAL

### 4.1 PERGUNTA CENTRAL

**A tabela companies pode se tornar a entidade fiscal oficial do CRM?**

### 4.2 RESPOSTA

**✅ SIM**

---

### 4.3 JUSTIFICATIVA TÉCNICA

#### 4.3.1 Estrutura existente

| Aspecto | Status | Evidência |
|---------|--------|-----------|
| FK com contacts | ✅ OK | `empresa_id uuid references companies(id)` |
| Índice de performance | ✅ OK | `idx_contacts_empresa_id` |
| Campo CNPJ | ✅ OK | `cnpj text` |
| Campo Razão Social | ✅ OK | `nome text NOT NULL` |
| Campo Telefone | ✅ OK | `telefone text` |
| Campo Endereço | ✅ OK | `endereco text` |

#### 4.3.2 Código existente

| Aspecto | Status | Evidência |
|---------|--------|-----------|
| Companies é consultada | ✅ OK | `resolverEmpresa()` em actions.ts |
| Empresas são criadas automaticamente | ✅ OK | Inserção automática em `resolverEmpresa()` |
| Empresas são vinculadas | ✅ OK | `empresa_id` preenchido em criarContato/editarContato |
| JOIN funciona | ✅ OK | SELECT com `empresa:companies!empresa_id` |

#### 4.3.3 Adequação para fins fiscais

| Campo Necessário | Existe? | Ação |
|-----------------|---------|------|
| Razão Social | ✅ `nome` | Manter |
| CNPJ | ✅ `cnpj` | Manter |
| Nome Fantasia | ❌ | **ADICIONAR** |
| Inscrição Estadual | ❌ | **ADICIONAR** |
| Inscrição Municipal | ❌ | **ADICIONAR** |
| Endereço Estruturado | ❌ Parcial | **EXPANDIR** |

---

### 4.4 CAMINHO DE EVOLUÇÃO

```
ESTADO ATUAL                          ESTADO FUTURO
companies {                          companies {
  id,                                   id,
  organization_id,                      organization_id,
  nome (Razão Social),                  nome (Razão Social),
  cnpj,                                 cnpj,
  site,                                 site,
  telefone,                             telefone,
  endereco,                             endereco,
  criado_em,                            criado_em,
  atualizado_em                         atualizado_em,
}                                      nome_fantasia,     ← NOVO
                                       inscricao_estadual,← NOVO
                                       inscricao_municipal,← NOVO
                                       endereco_numero,   ← NOVO
                                       endereco_complemento,← NOVO
                                       endereco_bairro,   ← NOVO
                                       endereco_cep,      ← NOVO
                                       endereco_cidade,   ← NOVO
                                       endereco_estado    ← NOVO
                                     }
```

---

## ETAPA 5 — CAMPOS NECESSÁRIOS EM COMPANIES

### 5.1 nome_fantasia

| Classificação | **OBRIGATÓRIO** |
|--------------|-----------------|

**Justificativa:**
- Empresas B2B geralmente usam nome fantasia diferente da razão social
- Clínicas: "Clínica Vida" vs razão "Clínica Vida Ltda"
- Necessário para exibição em documentos fiscais
- Organizations já tem `nome_fantasia` — mesma lógica

**Tipo sugerido:** `text NULL`

---

### 5.2 cnpj

| Classificação | **OBRIGATÓRIO** |
|--------------|-----------------|

**Status:** ✅ JÁ EXISTE

**Justificativa:**
- Identificador fiscal principal para pessoa jurídica
- Necessário para qualquer documento fiscal
- Validação de formato obrigatória

---

### 5.3 inscricao_estadual

| Classificação | **RECOMENDADO** |
|--------------|-----------------|

**Justificativa:**
- Campo obrigatório na nota fiscal eletrônica (NF-e)
- Usado para identificação fiscal interestadual
- ISENTO pode ser armazenado como texto

**Tipo sugerido:** `text NULL`

---

### 5.4 inscricao_municipal

| Classificação | **OPCIONAL** |
|--------------|---------------|

**Justificativa:**
- Necessário apenas para emissão de NFS-e (Nota Fiscal de Serviços)
- Muitos distribuidores não emitem NFS-e
- Pode ser adicionado posteriormente se necessário

**Tipo sugerido:** `text NULL`

---

### 5.5 RESUMO DA CLASSIFICAÇÃO

| Campo | Status | Classificação |
|-------|--------|---------------|
| nome | ✅ Existe | Obrigatório |
| cnpj | ✅ Existe | Obrigatório |
| nome_fantasia | ❌ Ausente | **Obrigatório** |
| inscricao_estadual | ❌ Ausente | **Recomendado** |
| inscricao_municipal | ❌ Ausente | Opcional |
| endereco | ✅ Existe | Manter (texto único) |
| endereco_numero | ❌ Ausente | Recomendado |
| endereco_complemento | ❌ Ausente | Opcional |
| endereco_bairro | ❌ Ausente | Recomendado |
| endereco_cep | ❌ Ausente | Recomendado |
| endereco_cidade | ❌ Ausente | Recomendado |
| endereco_estado | ❌ Ausente | Recomendado |

---

## ETAPA 6 — ESTRATÉGIA DE ENDEREÇO FISCAL

### 6.1 OPÇÃO A: Reutilizar endereço atual

**Descrição:** Usar o campo `endereco` existente (texto único) como endereço fiscal.

**Vantagens:**
- Sem necessidade de novos campos
- Compatibilidade total com código existente
- Implementação mais rápida

**Desvantagens:**
- Endereço não estruturado dificulta formatação
- Não permite validação de CEP
- Pode haver duplicação de dados

---

### 6.2 OPÇÃO B: Criar endereço fiscal separado

**Descrição:** Adicionar campos estruturados para endereço fiscal.

**Vantagens:**
- Endereço estruturado para documentos fiscais
- Possibilidade de separar endereço fiscal de entrega
- Validação de CEP facilitada
- Formatação automática

**Desvantagens:**
- Mais campos para migrar
- Maior complexidade
- Impacto em formulários existentes

---

### 6.3 RECOMENDAÇÃO

**✅ OPÇÃO A: Reutilizar endereço atual (com expansão opcional)**

**Justificativa para o DPRIME:**

1. **Contexto do negócio**
   - Distribuidores vendem para clínicas/consultórios
   - Endereço de entrega geralmente é o mesmo do cadastro
   - Não há necessidade de separação de endereços neste momento

2. **Praticidade**
   - O campo `endereco` já existe e é usado
   - Adicionar campos estruturados pode ser feito gradualmente
   - Não há demanda imediata para NFS-e (que exigiria endereço estruturado)

3. **Estratégia híbrida sugerida**
   - Manter `endereco` como campo único para backwards compatibility
   - Adicionar campos estruturados como **recomendados, não obrigatórios**
   - Usar `endereco` concatenado quando campos estruturados estiverem vazios

4. **Futuro**
   - Se houver necessidade de NFS-e, adicionar campos estruturados
   - Se houver necessidade de endereço de entrega diferente, adicionar novo campo

---

### 6.4 IMPLEMENTAÇÃO SUGERIDA

```sql
-- Manter compatibilidade
endereco text,           -- texto único (mantém histórico)

-- Adicionar como opcionais (não substituir)
endereco_numero text,
endereco_complemento text,
endereco_bairro text,
endereco_cep text,
endereco_cidade text,
endereco_estado text,
```

**Lógica de exibição:**
```
SE campos estruturados existem:
  exibir "rua, número, bairro - cidade/UF"
SENÃO:
  exibir "endereco" (texto único)
```

---

## ETAPA 7 — VALIDAÇÃO DA ARQUITETURA

### 7.1 ARQUITETURA PROPOSTA

```
CONTACT
   ↓
COMPANY
   ↓
QUOTE
   ↓
ORDER
```

### 7.2 FLUXO DETALHADO

```
┌─────────────────────────────────────────────────────────────────┐
│ CONTACT (Pessoa de Relacionamento)                            │
│ • nome: "Dr. João Silva"                                      │
│ • telefone: "(11) 99999-9999"                                │
│ • empresa_id: "clinica-joao-ltda"  ──────────────────┐      │
│ • cpf_cnpj: "123.456.789-00"                              │      │
└─────────────────────────────────────────────────────────│────┘
                                                              │
┌─────────────────────────────────────────────────────────────▼─┐
│ COMPANY (Entidade Fiscal)                                     │
│ • nome: "Clínica João Silva LTDA"  (Razão Social)              │
│ • cnpj: "12.345.678/0001-90"                                  │
│ • nome_fantasia: "Clínica João Silva"                         │
│ • inscricao_estadual: "123.456.789"                          │
│ • inscricao_municipal: null                                  │
│ • endereco: "Av. Paulista, 1000"                             │
└──────────────────────────────────────────────────────────────┘
                                                              │
                                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ QUOTE (Orçamento)                                              │
│ • contato_id: "contato-dr-joao"  (relacionamento)              │
│ • tipo_faturamento: "PJ"                                      │
│ • faturamento_company_id: "clinica-joao-ltda"                 │
│ • faturamento_nome: "Clínica João Silva LTDA" (SNAPSHOT)       │
│ • faturamento_documento: "12.345.678/0001-90" (SNAPSHOT)       │
│ • faturamento_razao_social: "Clínica João Silva LTDA" (SNAPSHOT)│
│ • faturamento_ie: "123.456.789" (SNAPSHOT)                     │
│ • faturamento_endereco: "Av. Paulista, 1000" (SNAPSHOT)        │
└─────────────────────────────────────────────────────────────────┘
                                                              │
                                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ ORDER (Pedido)                                                 │
│ • contato_id: "contato-dr-joao" (relacionamento)               │
│ • quote_id: "orcamento-123"                                   │
│ • tipo_faturamento: "PJ" (copiado)                            │
│ • faturamento_company_id: "clinica-joao-ltda" (copiado)       │
│ • faturamento_nome: "Clínica João Silva LTDA" (SNAPSHOT)      │
│ • faturamento_documento: "12.345.678/0001-90" (SNAPSHOT)      │
│ • faturamento_razao_social: "Clínica João Silva LTDA" (SNAPSHOT)│
│ • faturamento_ie: "123.456.789" (SNAPSHOT)                     │
│ • faturamento_endereco: "Av. Paulista, 1000" (SNAPSHOT)        │
└─────────────────────────────────────────────────────────────────┘
```

---

### 7.3 VALIDAÇÃO POR CAMADA

| Camada | Validação | Status |
|--------|-----------|--------|
| CONTACT → COMPANY | FK `empresa_id` existe | ✅ OK |
| CONTACT → COMPANY | Código cria/vincula empresa | ✅ OK |
| COMPANY | Estrutura para entidade fiscal | ✅ OK (requer expansão) |
| COMPANY → QUOTE | Referência `faturamento_company_id` | ✅ OK (requer novo campo) |
| QUOTE | Snapshot fiscal | ✅ OK (requer novos campos) |
| QUOTE → ORDER | RPC copia snapshot | ✅ OK (requer atualização) |
| ORDER | Snapshot preservado | ✅ OK (requer novos campos) |

---

### 7.4 RESULTADO DA VALIDAÇÃO

**✅ ARQUITETURA APROVADA**

**Justificativa:**
1. Fluxo lógico de dados está correto
2. Relacionamentos estão bem definidos
3. Snapshot garante imutabilidade fiscal
4. Referências permitem edição inteligente
5. Não há conflitos com estrutura existente

---

## ETAPA 8 — VALIDAÇÃO DO SNAPSHOT FISCAL

### 8.1 ESTRATÉGIA PROPOSTA

**Referência:**
```typescript
faturamento_company_id uuid  // aponta para companies
faturamento_contact_id uuid  // aponta para contacts (quando PF)
```

**Snapshot:**
```typescript
faturamento_nome text
faturamento_documento text
faturamento_tipo_documento text  // 'CPF' ou 'CNPJ'
faturamento_razao_social text
faturamento_nome_fantasia text
faturamento_endereco text
faturamento_ie text
faturamento_im text
```

---

### 8.2 ANÁLISE

#### 8.2.1 Benefícios do Snapshot

| Benefício | Descrição |
|-----------|-----------|
| Imutabilidade | Dados fiscais não mudam se empresa for editada |
| Auditoria | Comprovante autêntico do que foi acordado |
| Legalidade | Documentos fiscais não podem ser alterados |
| Consistência | Pedido reflete exatamente o orçamento |

#### 8.2.2 Benefícios da Referência

| Benefício | Descrição |
|-----------|-----------|
| Pré-preenchimento | Ao selecionar empresa, dados vêm automaticamente |
| Validação | É possível verificar se empresa ainda existe |
| Alertas | Pode avisar se empresa foi alterada |

---

### 8.3 PREENCHIMENTO DO SNAPSHOT

**Na criação do orçamento:**

| Tipo | Ação |
|------|------|
| PF | Copiar `contato.nome`, `contato.cpf_cnpj`, `contato.endereco` |
| PJ | Copiar `company.nome`, `company.cnpj`, `company.nome_fantasia`, `company.inscricao_estadual`, `company.endereco` |

**Na conversão para pedido:**

| Ação |
|------|
| Copiar TODOS os campos de snapshot do orçamento para o pedido |

---

### 8.4 RESULTADO DA VALIDAÇÃO

**✅ SNAPSHOT FISCAL APROVADO**

**Justificativa:**
1. Garante imutabilidade dos dados fiscais
2. Permite pré-preenchimento inteligente
3. Mantém rastreabilidade via referência
4. Compatível com kebutuhan auditoria
5. Segue melhores práticas para documentos fiscais

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
| Empresas sem CNPJ | **MÉDIO** | PF pode não ter empresa, mas PJ deve ter |
| Empresas sem nome_fantasia | **BAIXO** | Pode usar `nome` como fallback |
| Empresas sem endereço | **BAIXO** | Endereço pode ser preenchido depois |
| Nome duplicado | **MÉDIO** | `resolverEmpresa` busca por ILIKE, pode haver duplicatas |

---

### 9.3 ORÇAMENTOS

| Risco | Nível | Descrição |
|-------|-------|-----------|
| Orçamentos sem tipo_faturamento | **MÉDIO** | Dados existentes terão NULL |
| Snapshot não preenchido | **MÉDIO** | Novos campos ficarão NULL |
| Campos novos em SELECT | **BAIXO** | SELECT * retorna automaticamente |

---

### 9.4 PEDIDOS

| Risco | Nível | Descrição |
|-------|-------|-----------|
| RPC não copia snapshot | **CRÍTICO** | Se não atualizar RPC, dados se perdem |
| Pedidos existentes sem snapshot | **MÉDIO** | Dados antigos terão NULL |
| Histórico quebrado | **BAIXO** | Snapshot preserva estado no momento |

---

### 9.5 PDFs

| Risco | Nível | Descrição |
|-------|-------|-----------|
| PDF não encontra snapshot | **MÉDIO** | Deve fallback para dados do contato |
| Layout não comporta novos campos | **MÉDIO** | Pode precisar ajuste de layout |
| Dados desatualizados no PDF | **BAIXO** | Snapshot garante dados corretos |

---

### 9.6 CONVERSÃO ORÇAMENTO → PEDIDO

| Risco | Nível | Descrição |
|-------|-------|-----------|
| Modificar RPC sem testar | **CRÍTICO** | Pode quebrar conversão |
| Campos não copiados | **CRÍTICO** | Dados fiscais se perdem |
| Rollback difícil | **ALTO** | Alterações em banco são complexas |
| Race condition | **BAIXO** | RPC já usa LOCK FOR UPDATE |

---

### 9.7 MATRIZ DE RISCOS CONSOLIDADA

| Risco | Nível | Mitigação |
|-------|-------|----------|
| RPC não copia snapshot | **CRÍTICO** | Testar exaustivamente, criar backup |
| Modificar RPC sem testar | **CRÍTICO** | Homologação obrigatória |
| Contatos sem empresa_id | **MÉDIO** | Validar antes de exigir PJ |
| Orçamentos sem tipo_faturamento | **MÉDIO** | Tratar NULL no código |
| Empresas sem CNPJ | **MÉDIO** | Validar no formulário |
| Nome duplicado em companies | **MÉDIO** | Adicionar validação unique |
| empresa_id referencing deletada | **MÉDIO** | Usar soft delete ou validar |
| Layout PDF não acomoda novos campos | **MÉDIO** | Testar com dados reais |
| Rollback difícil | **ALTO** | Documentar, ter scripts prontos |
| Campos não copiados | **CRÍTICO** | Verificar SELECT no INSERT |
| Contato_id não preenchido | **BAIXO** | Snapshot usa company_id |

---

## ETAPA 10 — RECOMENDAÇÃO FINAL

### 10.1 RESPOSTA À PERGUNTA CENTRAL

**A tabela companies pode se tornar a entidade fiscal oficial do CRM?**

**✅ SIM, APROVADO**

---

### 10.2 JUSTIFICATIVA

1. **Estrutura adequada**
   - FK com contacts existe e funciona
   - Campos básicos (nome, cnpj) existem
   - Código existente já usa companies

2. **Expansão simples**
   - Adicionar `nome_fantasia`, `inscricao_estadual` é trivial
   - Campos opcionais não quebram existentes
   - Índice em `empresa_id` já existe

3. **Sem conflitos**
   - Companies ≠ Organizations (propósitos diferentes)
   - Não há sobreposição de responsabilidades
   - Código existente não será afetado

4. **Modelo híbrido aprovado**
   - Referência + Snapshot é a melhor estratégia
   - Garante imutabilidade fiscal
   - Permite edição inteligente

---

### 10.3 CAMPOS A ADICIONAR EM COMPANIES

| Campo | Prioridade | Tipo |
|-------|------------|------|
| nome_fantasia | **ALTA** | text NULL |
| inscricao_estadual | **MÉDIA** | text NULL |
| inscricao_municipal | **BAIXA** | text NULL |

---

### 10.4 CAMPOS A ADICIONAR EM QUOTES/ORDERS

| Campo | Prioridade | Tipo |
|-------|------------|------|
| tipo_faturamento | **ALTA** | text NULL |
| faturamento_contact_id | **ALTA** | uuid NULL |
| faturamento_company_id | **ALTA** | uuid NULL |
| faturamento_nome | **ALTA** | text NULL |
| faturamento_documento | **ALTA** | text NULL |
| faturamento_tipo_documento | **ALTA** | text NULL |
| faturamento_razao_social | **MÉDIA** | text NULL |
| faturamento_nome_fantasia | **MÉDIA** | text NULL |
| faturamento_endereco | **ALTA** | text NULL |
| faturamento_ie | **MÉDIA** | text NULL |
| faturamento_im | **BAIXA** | text NULL |

---

### 10.5 AÇÕES CRÍTICAS

| Ação | Prioridade | Observação |
|------|-----------|------------|
| Atualizar RPC de conversão | **CRÍTICA** | Copiar todos os campos de snapshot |
| Adicionar campos em companies | **ALTA** | nome_fantasia, IE, IM |
| Adicionar campos em quotes/orders | **ALTA** | tipo_faturamento + snapshot |
| Testar conversão orçamento → pedido | **CRÍTICA** | Verificar que snapshot é copiado |
| Atualizar PDF do orçamento | **ALTA** | Separar comprador de faturamento |
| Atualizar formulário de orçamento | **ALTA** | Seletor PF/PJ, preview fiscal |

---

### 10.6 EVITAR

| Evitar | Motivo |
|--------|--------|
| Modificar RPC sem backup | Risco crítico de perda de dados |
| Criar constraints obrigatórias | Dados existentes são NULL |
| Substituir contato_id | Usado para relacionamento |
| Alterar WhatsApp | Não tem relação com faturamento |
| Alterar Leads | Não tem relação com faturamento |
| Tentar resolver duplicatas agora | Escopo diferente |

---

### 10.7 CONCLUSÃO

A arquitetura proposta está **APROVADA** para implementação.

**Companies é a tabela correta** para representar entidades fiscais de faturamento.

**O modelo híbrido (referência + snapshot)** é a estratégia mais segura para garantir imutabilidade fiscal enquanto permite edição inteligente.

**Os principais riscos** estão na modificação da RPC de conversão e na atualização do formulário de orçamento — ambos gerenciáveis com testes adequados.

---

## ANEXO — CHECKLIST DE IMPLEMENTAÇÃO

### Fase A: Schema
- [ ] Adicionar campos em companies
- [ ] Adicionar campos em quotes
- [ ] Adicionar campos em orders
- [ ] Atualizar RPC de conversão

### Fase B: Cadastro
- [ ] Atualizar types/database.ts
- [ ] Atualizar form-empresa.tsx
- [ ] Atualizar modal-novo-contato.tsx

### Fase C: Orçamento
- [ ] Atualizar form-orcamento.tsx
- [ ] Atualizar actions de orçamento
- [ ] Atualizar página de detalhe

### Fase D: PDF
- [ ] Atualizar orcamento-pdf-generator.ts
- [ ] Separar comprador de faturamento

### Fase E: Conversão
- [ ] Testar RPC com snapshot
- [ ] Verificar que todos campos são copiados

### Fase F: Pedido
- [ ] Atualizar página de detalhe
- [ ] Verificar/adicionar PDF do pedido

### Fase G: Testes
- [ ] Fluxo completo PF
- [ ] Fluxo completo PJ
- [ ] Edição de faturamento
- [ ] Módulos dependentes

---

*Documento gerado através de análise estática do código.*
*Não foram executadas queries diretas no banco de dados.*
*Recomenda-se validação com dados reais antes de implementar.*
