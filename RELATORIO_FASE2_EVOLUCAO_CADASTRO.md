# FASE 2 — PLANO DE EVOLUÇÃO DO CADASTRO DPRIME
## RELATÓRIO TÉCNICO COMPLETO

**Data:** 12 de Junho de 2026  
**Versão:** 1.0  
**Auditor:** Arquiteto de Software Sênior / DBA Sênior

---

## SUMÁRIO

1. [ETAPA 1 — TELAS IMPACTADAS](#etapa-1--telas-impactadas)
2. [ETAPA 2 — QUERIES IMPACTADAS](#etapa-2--queries-impactadas)
3. [ETAPA 3 — COMPATIBILIDADE](#etapa-3--compatibilidade)
4. [ETAPA 4 — ANÁLISE DE RISCO POR MÓDULO](#etapa-4--análise-de-risco-por-módulo)
5. [ETAPA 5 — ORDEM DE IMPLEMENTAÇÃO](#etapa-5--ordem-de-implementação)
6. [ETAPA 6 — VALIDAÇÃO DA ESTRATÉGIA](#etapa-6--validação-da-estratégia)

---

## ETAPA 1 — TELAS IMPACTADAS

### 1.1 PÁGINAS QUE UTILIZAM CONTACTS

| Arquivo | Tipo | Campos Usados | Impacto |
|---------|------|---------------|---------|
| `app/(dashboard)/contatos/page.tsx` | Página | Todos os campos (select completo) | **ALTO** |
| `app/(dashboard)/contatos/[id]/page.tsx` | Página | nome, cargo, empresa, telefone, email, endereco, cpf_cnpj | **ALTO** |
| `app/(dashboard)/leads/[id]/page.tsx` | Página | Busca contato por telefone/email (fallback) | **BAIXO** |
| `app/(dashboard)/orcamentos/[id]/page.tsx` | Página | contato_id (JOIN) | **MÉDIO** |
| `app/(dashboard)/pedidos/[id]/page.tsx` | Página | contato_id (JOIN) | **MÉDIO** |
| `app/(dashboard)/whatsapp/page.tsx` | Página | Busca por telefone | **BAIXO** |
| `app/(dashboard)/whatsapp/[id]/page.tsx` | Página | Busca por telefone | **BAIXO** |
| `app/(dashboard)/contatos/exportar/route.ts` | API | nome, email, telefone, cargo, empresa, endereco | **MÉDIO** |

### 1.2 PÁGINAS QUE UTILIZAM COMPANIES

| Arquivo | Tipo | Campos Usados | Impacto |
|---------|------|---------------|---------|
| `app/(dashboard)/contatos/page.tsx` | Página | empresa_id (JOIN com nome) | **MÉDIO** |
| `app/(dashboard)/contatos/[id]/page.tsx` | Página | empresa_id (JOIN com nome) | **MÉDIO** |
| `app/(dashboard)/leads/actions.ts` | Action | empresa_nome (criação automática) | **MÉDIO** |
| `app/(dashboard)/contatos/actions.ts` | Action | empresa_nome (criação automática) | **MÉDIO** |
| `app/(dashboard)/configuracoes/empresa/page.tsx` | Página | nome_fantasia, cnpj, telefone, email, endereco | **ALTO** |

### 1.3 COMPONENTES IMPACTADOS

| Arquivo | Tipo | Campos Usados | Impacto |
|---------|------|---------------|---------|
| `components/contatos/tabela-contatos.tsx` | Componente | nome, empresa, telefone, email, cargo, cpf_cnpj | **ALTO** |
| `components/contatos/modal-novo-contato.tsx` | Formulário | Todos os campos atuais | **ALTO** |
| `components/contatos/form-importacao.tsx` | Formulário | nome, telefone, email, endereco, cpf_cnpj | **ALTO** |
| `components/contatos/acoes-contato.tsx` | Ações | id, nome | **BAIXO** |
| `components/contatos/botao-importar-exportar.tsx` | UI | — | **NENHUM** |
| `components/leads/modal-converter-lead.tsx` | Formulário | nome, email, telefone, cargo, empresa | **ALTO** |
| `components/empresa/form-empresa.tsx` | Formulário | nome_fantasia, cnpj, telefone, email, endereco | **ALTO** |

### 1.4 ACTIONS/SERVER ACTIONS IMPACTADAS

| Arquivo | Função | Campos Usados | Impacto |
|---------|--------|---------------|---------|
| `app/(dashboard)/contatos/actions.ts` | criarContato | Todos os campos | **ALTO** |
| `app/(dashboard)/contatos/actions.ts` | editarContato | nome, email, telefone, cargo, empresa, observacoes | **ALTO** |
| `app/(dashboard)/contatos/actions.ts` | importarContatos | nome, telefone, email, endereco, cpf_cnpj | **ALTO** |
| `app/(dashboard)/contatos/actions.ts` | converterContatoEmLead | nome, email, telefone, cargo, empresa | **ALTO** |
| `app/(dashboard)/leads/actions.ts` | converterLeadEmContato | nome, email, telefone, cargo, empresa | **ALTO** |
| `app/(dashboard)/configuracoes/empresa/actions.ts` | atualizarEmpresa | nome_fantasia, cnpj, telefone, email, endereco | **ALTO** |

### 1.5 SERVIÇOS/LIBS IMPACTADAS

| Arquivo | Função | Campos Usados | Impacto |
|---------|--------|---------------|---------|
| `lib/nome-contato.ts` | resolverNomeContato | nome, telefone | **BAIXO** |
| `lib/whatsapp/resolver-nome-conversa.ts` | — | nome, telefone | **BAIXO** |
| `lib/queries/conversas.ts` | — | nome, telefone | **BAIXO** |

---

## ETAPA 2 — QUERIES IMPACTADAS

### 2.1 SELECTS EM CONTACTS

**Query 1: Lista de contatos (paginação)**
```typescript
// Arquivo: app/(dashboard)/contatos/page.tsx:36-41
.from('contacts')
.select('*, empresa:companies!empresa_id(id, nome)', { count: 'exact' })
.eq('organization_id', perfil.organization_id)
.order('nome')
.range(from, to)
```
**Impacto:** NÃO AFETA — SELECT * retorna todos os campos automaticamente

---

**Query 2: Detalhe do contato**
```typescript
// Arquivo: app/(dashboard)/contatos/[id]/page.tsx:35-40
.from('contacts')
.select('*, empresa:companies!empresa_id(id, nome), responsavel:profiles!responsavel_id(id, nome)')
.eq('id', id)
.eq('organization_id', perfil.organization_id)
.single()
```
**Impacto:** NÃO AFETA — SELECT * retorna todos os campos automaticamente

---

**Query 3: Busca por telefone (WhatsApp)**
```typescript
// Arquivo: app/(dashboard)/whatsapp/actions.ts:230-237
.from('contacts')
.select('nome, telefone')
.eq('organization_id', perfil.organization_id)
.not('telefone', 'is', null)
```
**Impacto:** NÃO AFETA — Não usa os novos campos

---

**Query 4: Resolução de nome por telefone**
```typescript
// Arquivo: lib/nome-contato.ts:83-89
.from('contacts')
.select('nome, telefone')
.eq('organization_id', organizationId)
.or(`telefone.ilike.%${telefoneNormalizado}%,...`)
.limit(1)
.single()
```
**Impacto:** NÃO AFETA — Não usa os novos campos

---

**Query 5: Exportação CSV**
```typescript
// Arquivo: app/(dashboard)/contatos/exportar/route.ts:25-29
.from('contacts')
.select('nome, email, telefone, cargo, endereco, observacoes, criado_em, empresa:companies!empresa_id(nome)')
.eq('organization_id', perfil.organization_id)
.order('nome')
```
**Impacto:** **REQUER AJUSTE** — Não seleciona novos campos. Após adicionar campos, deve expandir o SELECT.

---

### 2.2 INSERTS EM CONTACTS

**Insert 1: Criar contato**
```typescript
// Arquivo: app/(dashboard)/contatos/actions.ts:68-87
.insert({
  organization_id: perfil.organization_id,
  nome,
  email: email || null,
  telefone: telefone || null,
  cargo: cargo || null,
  cpf_cnpj: cpf_cnpj || null,
  empresa_id,
  responsavel_id: perfil.id,
  endereco: endereco || null,
  endereco_numero: endereco_numero || null,
  // ... outros campos de endereço
  observacoes: observacoes || null,
})
```
**Impacto:** **REQUER AJUSTE** — Deve adicionar novos campos ao INSERT

---

**Insert 2: Importar contatos**
```typescript
// Arquivo: app/(dashboard)/contatos/actions.ts:374-381
.insert({
  organization_id: perfil.organization_id,
  nome: c.nome.trim(),
  telefone: c.telefone?.trim() || null,
  email: c.email?.trim() || null,
  endereco: c.endereco || null,
  cpf_cnpj: c.cpf_cnpj || null,
})
```
**Impacto:** **REQUER AJUSTE** — Deve adicionar origem_cadastro = 'importacao'

---

**Insert 3: Converter lead em contato**
```typescript
// Arquivo: app/(dashboard)/leads/actions.ts:259-269
.insert({
  organization_id: perfil.organization_id,
  nome,
  email: email || null,
  telefone: telefone || null,
  cargo: cargo || null,
  empresa_id,
  responsavel_id: perfil.id,
})
```
**Impacto:** **REQUER AJUSTE** — Deve adicionar origem_cadastro = 'conversao_lead'

---

### 2.3 UPDATES EM CONTACTS

**Update 1: Editar contato**
```typescript
// Arquivo: app/(dashboard)/contatos/actions.ts:118-129
.update({
  nome,
  email: email || null,
  telefone: telefone || null,
  cargo: cargo || null,
  empresa_id,
  observacoes: observacoes || null,
  atualizado_em: new Date().toISOString(),
})
.eq('id', contatoId).eq('organization_id', perfil.organization_id)
```
**Impacto:** **REQUER AJUSTE** — Deve adicionar novos campos ao UPDATE

---

### 2.4 SELECTS EM COMPANIES

**Query 1: Busca empresa por nome**
```typescript
// Arquivo: app/(dashboard)/contatos/actions.ts:28-34
.from('companies')
.select('id')
.eq('organization_id', organization_id)
.ilike('nome', empresa_nome)
.single()
```
**Impacto:** NÃO AFETA — Não usa os novos campos

---

**Query 2: Listar empresas**
```typescript
// Arquivo: app/(dashboard)/configuracoes/empresa/page.tsx
.from('organizations')
.select('nome_fantasia, cnpj, telefone, email, endereco, logo_url, site, instagram')
```
**Impacto:** **REQUER AJUSTE** — Deve adicionar inscricao_estadual, inscricao_municipal

---

### 2.5 INSERTS/UPDATES EM COMPANIES

**Insert: Criar empresa**
```typescript
// Arquivo: app/(dashboard)/contatos/actions.ts:37-44
.insert({ organization_id, nome: empresa_nome })
```
**Impacto:** NÃO AFETA — Empresas são criadas automaticamente pelo nome

---

**Update: Atualizar empresa (configurações)**
```typescript
// Arquivo: app/(dashboard)/configuracoes/empresa/actions.ts
.update({
  nome_fantasia,
  cnpj,
  telefone,
  email,
  endereco,
  site,
  instagram,
})
```
**Impacto:** **REQUER AJUSTE** — Deve adicionar inscricao_estadual, inscricao_municipal

---

## ETAPA 3 — COMPATIBILIDADE

### 3.1 NOVOS CAMPOS PODEM SER OPCIONAIS INICIALMENTE?

**RESPOSTA: SIM**

### 3.2 JUSTIFICATIVA TÉCNICA

| Razão | Explicação |
|-------|------------|
| **PostgreSQL NULL-safe** | Novos campos com valor NULL não afetam queries existentes que usam SELECT * |
| **Retrocompatibilidade** | Queries que fazem INSERT sem especificar novos campos funcionarão (campos ficarão NULL) |
| **Migrations incrementais** | Adicionar colunas como NULL permite deploy gradual sem quebra |
| **Tipo de dado** | Todos os campos propostos são text ou enum, compatíveis com a estrutura existente |

### 3.3 ANÁLISE POR CAMPO

| Campo | Tipo | Pode ser NULL? | Impacto se NULL |
|-------|------|-----------------|-----------------|
| tipo_pessoa | enum | ✅ SIM | Padrão para 'PF' ou 'PJ' pode ser definido via aplicação |
| tipo_conselho | enum | ✅ SIM | Apenas profissionais de saúde terão valor |
| numero_conselho | text | ✅ SIM | Apenas profissionais de saúde terão valor |
| uf_conselho | text | ✅ SIM | Apenas profissionais de saúde terão valor |
| especialidade | text | ✅ SIM | Campo opcional para profissionais |
| origem_cadastro | enum | ✅ SIM | Padrão 'manual' para novos cadastros |
| observacoes_comerciais | text | ✅ SIM | Campo de notas adicional |
| nome_fantasia | text | ✅ SIM | Companies existentes terão NULL |
| inscricao_estadual | text | ✅ SIM | Companies existentes terão NULL |
| inscricao_municipal | text | ✅ SIM | Companies existentes terão NULL |

### 3.4 CÓDIGO COMPATÍVEL EXISTENTE

O código atual já trata campos opcionais corretamente:

```typescript
// Exemplo em app/(dashboard)/contatos/[id]/page.tsx:76-119
{contato.cargo && (
  <div>
    <p className="text-xs text-slate-500">Cargo</p>
    <p className="font-medium">{contato.cargo}</p>
  </div>
)}
```

**Não há validação de campos obrigatórios além de `nome`**, o que facilita a transição.

---

## ETAPA 4 — ANÁLISE DE RISCO POR MÓDULO

### 4.1 WHATSAPP

| Aspecto | Avaliação |
|--------|-----------|
| **Risco** | **BAIXO** |
| **Dependência de contacts** | Usa `telefone` para busca, não depende de novos campos |
| **Foreign Keys** | `contato_id` é FK opcional |
| **Queries afetadas** | `lib/nome-contato.ts` — busca apenas `nome` e `telefone` |
| **Impacto se adicionar campos** | Nenhum — não usa os novos campos |

**Justificativa:** O módulo WhatsApp resolve nomes por telefone e não tem dependência dos novos campos propostos.

---

### 4.2 LEADS

| Aspecto | Avaliação |
|--------|-----------|
| **Risco** | **BAIXO** |
| **Dependência de contacts** | Nenhuma — tabela separada |
| **Conversão Lead → Contato** | Usa apenas: nome, email, telefone, cargo, empresa |
| **Queries afetadas** | `app/(dashboard)/leads/[id]/page.tsx` — busca contato como fallback |
| **Impacto se adicionar campos** | Mínimo — conversão pode incluir novos campos opcionalmente |

**Justificativa:** Leads são uma tabela independente. A conversão para contato pode ser estendida gradualmente.

---

### 4.3 PIPELINE

| Aspecto | Avaliação |
|--------|-----------|
| **Risco** | **MÉDIO** |
| **Dependência de contacts** | `contato_id` em deals é FK opcional |
| **Display de deals** | Exibe nome do contato via JOIN |
| **Queries afetadas** | `app/(dashboard)/pipeline/actions.ts` — cria deal com contato_id |
| **Impacto se adicionar campos** | Médio — displays podem ser estendidos para mostrar novos campos |

**Justificativa:** Deals usam `contato_id` para vínculo, mas não dependem diretamente dos campos. A expansão para novos campos pode ser feita gradualmente nas telas de detalhe.

---

### 4.4 ORÇAMENTOS

| Aspecto | Avaliação |
|--------|-----------|
| **Risco** | **MÉDIO** |
| **Dependência de contacts** | `contato_id` em quotes é FK opcional |
| **Display de orçamentos** | Exibe dados do cliente (lead ou contato) |
| **Queries afetadas** | `app/(dashboard)/orcamentos/[id]/page.tsx:24` — JOIN com contacts |
| **Impacto se adicionar campos** | Médio — displays podem mostrar novos campos |

**Justificativa:** Orçamentos fazem JOIN com contacts para exibir dados do cliente. Os novos campos podem ser adicionados ao JOIN gradualmente.

---

### 4.5 PEDIDOS

| Aspecto | Avaliação |
|--------|-----------|
| **Risco** | **MÉDIO** |
| **Dependência de contacts** | `contato_id` em orders é FK opcional |
| **Display de pedidos** | Exibe dados do cliente (lead ou contato) |
| **Queries afetadas** | `app/(dashboard)/pedidos/[id]/page.tsx:35` — JOIN com contacts |
| **Impacto se adicionar campos** | Médio — displays podem mostrar novos campos |

**Justificativa:** Mesma situação dos orçamentos. Pedidos herdam dados do orçamento que originou o pedido.

---

### 4.6 HISTÓRICO DE ATIVIDADES

| Aspecto | Avaliação |
|--------|-----------|
| **Risco** | **BAIXO** |
| **Dependência de contacts** | `contato_id` em activities é FK opcional |
| **Display** | Timeline de atividades — não exibe dados detalhados do contato |
| **Impacto se adicionar campos** | Nenhum — não exibe campos do contato |

**Justificativa:** Activities armazena `contato_id` para rastreamento, mas não exibe campos do contato.

---

### 4.7 MATRIZ DE RISCO CONSOLIDADA

| Módulo | Risco | Motivo |
|--------|-------|-------|
| WhatsApp | **BAIXO** | Não usa novos campos |
| Leads | **BAIXO** | Tabela independente |
| Pipeline | **MÉDIO** | FK opcional, mas usa JOIN |
| Orçamentos | **MÉDIO** | FK opcional, mas usa JOIN |
| Pedidos | **MÉDIO** | FK opcional, mas usa JOIN |
| Histórico | **BAIXO** | Não exibe campos do contato |

---

## ETAPA 5 — ORDEM DE IMPLEMENTAÇÃO

### PASSO 1: Preparação

```
□ Criar backup do banco de dados antes de qualquer migration
□ Definir tipos/enums no código TypeScript (types/database.ts)
□ Documentar todas as mudanças de schema
□ Preparar scripts de rollback
```

**Justificativa:** Segurança antes de qualquer alteração.

---

### PASSO 2: Migration — Contacts (Campos Simples)

```sql
-- Adicionar campos simples em contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tipo_pessoa TEXT DEFAULT 'PF';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tipo_conselho TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS numero_conselho TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS uf_conselho TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS especialidade TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS origem_cadastro TEXT DEFAULT 'manual';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS observacoes_comerciais TEXT;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_contacts_tipo_pessoa ON contacts(tipo_pessoa);
CREATE INDEX IF NOT EXISTS idx_contacts_origem_cadastro ON contacts(origem_cadastro);
```

**Impacto:** Baixo — adiciona colunas NULL-safe

---

### PASSO 3: Migration — Companies (Campos Simples)

```sql
-- Adicionar campos em companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS nome_fantasia TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS inscricao_municipal TEXT;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON companies(cnpj);
```

**Impacto:** Baixo — adiciona colunas NULL-safe

---

### PASSO 4: Atualizar Types (TypeScript)

```typescript
// types/database.ts

// Adicionar enums
export type TipoPessoa = 'PF' | 'PJ'
export type TipoConselho = 'CRM' | 'CRO' | 'CRBM' | 'CRN' | 'CRF' | 'CREFITO' | 'OUTRO'
export type OrigemCadastro = 'manual' | 'importacao' | 'whatsapp' | 'conversao_lead' | 'api'

// Atualizar interface Contact
export interface Contact {
  // ... campos existentes ...
  tipo_pessoa?: TipoPessoa
  tipo_conselho?: TipoConselho
  numero_conselho?: string
  uf_conselho?: string
  especialidade?: string
  origem_cadastro?: OrigemCadastro
  observacoes_comerciais?: string
}

// Atualizar interface Company
export interface Company {
  // ... campos existentes ...
  nome_fantasia?: string
  inscricao_estadual?: string
  inscricao_municipal?: string
}
```

**Impacto:** Baixo — apenas tipos, não afeta runtime

---

### PASSO 5: Atualizar Actions — INSERTs

**Arquivo:** `app/(dashboard)/contatos/actions.ts`

```typescript
// Em criarContato(), adicionar:
origem_cadastro: 'manual',

// Em importarContatos(), adicionar:
origem_cadastro: 'importacao',

// Em converterContatoEmLead() (leads/actions.ts), adicionar:
origem_cadastro: 'conversao_lead',
```

**Impacto:** Médio — altera lógica de criação

---

### PASSO 6: Atualizar Actions — UPDATEs

**Arquivo:** `app/(dashboard)/contatos/actions.ts`

```typescript
// Em editarContato(), adicionar novos campos ao update
// Manter compatibilidade com dados existentes
```

**Impacto:** Médio — altera lógica de edição

---

### PASSO 7: Atualizar Formulários — Modal Novo Contato

**Arquivo:** `components/contatos/modal-novo-contato.tsx`

```
□ Adicionar seletor tipo_pessoa (PF/PJ)
□ Se PF: mostrar campos de conselho profissional
□ Se PJ: mostrar campos básicos
□ Adicionar campo origem_cadastro (oculto, valor fixo 'manual')
```

**Impacto:** Alto — altera UI do formulário

---

### PASSO 8: Atualizar Formulários — Importação

**Arquivo:** `components/contatos/form-importacao.tsx`

```
□ Adicionar lógica para detectar tipo_pessoa baseado no CPF/CNPJ
□ Adicionar origem_cadastro = 'importacao' na inserção
```

**Impacto:** Médio — altera lógica de importação

---

### PASSO 9: Atualizar Formulários — Conversão Lead

**Arquivo:** `components/leads/modal-converter-lead.tsx`

```
□ Adicionar campos de conselho profissional (se aplicável)
□ Passar origem_cadastro = 'conversao_lead'
```

**Impacto:** Médio — altera UI de conversão

---

### PASSO 10: Atualizar Tela de Detalhe — Contato

**Arquivo:** `app/(dashboard)/contatos/[id]/page.tsx`

```
□ Exibir tipo_pessoa
□ Se PF: exibir tipo_conselho, numero_conselho, uf_conselho, especialidade
□ Exibir origem_cadastro
□ Exibir observacoes_comerciais
```

**Impacto:** Alto — altera display

---

### PASSO 11: Atualizar Tabela de Contatos

**Arquivo:** `components/contatos/tabela-contatos.tsx`

```
□ Opcional: adicionar coluna tipo_pessoa
□ Opcional: adicionar coluna conselho (seu conteúdo for relevante)
```

**Impacto:** Médio — altera visualização

---

### PASSO 12: Atualizar Tela de Configuração — Empresa

**Arquivo:** `components/empresa/form-empresa.tsx`

```
□ Adicionar campo inscricao_estadual
□ Adicionar campo inscricao_municipal
□ Atualizar label nome_fantasia (já existe)
```

**Impacto:** Alto — altera UI de configuração

---

### PASSO 13: Atualizar Exportação CSV

**Arquivo:** `app/(dashboard)/contatos/exportar/route.ts`

```
□ Expandir SELECT para incluir novos campos
□ Adicionar novas colunas ao CSV
```

**Impacto:** Médio — altera exportação

---

### PASSO 14: Testes e Validação

```
□ Testar criação de contato PF com conselho
□ Testar criação de contato PJ
□ Testar importação de planilha
□ Testar conversão de lead
□ Testar edição de contato existente
□ Testar exportação CSV
□ Testar telas de orçamento/pedido com novos dados
□ Verificar que módulos dependentes continuam funcionando
```

---

## ETAPA 6 — VALIDAÇÃO DA ESTRATÉGIA

### 6.1 A EVOLUÇÃO ABAIXO É SEGURA?

**RESPOSTA: SIM**

### 6.2 JUSTIFICATIVA TÉCNICA

#### Campos Propostos para CONTACTS

| Campo | Tipo | Compatível? | Motivo |
|-------|------|-------------|--------|
| tipo_pessoa | enum | ✅ SIM | Novo campo, NULL-safe, SELECT * retorna automaticamente |
| tipo_conselho | enum | ✅ SIM | Novo campo, NULL-safe, apenas PF terá valor |
| numero_conselho | text | ✅ SIM | Novo campo, NULL-safe |
| uf_conselho | text | ✅ SIM | Novo campo, NULL-safe |
| especialidade | text | ✅ SIM | Novo campo, NULL-safe |
| origem_cadastro | enum | ✅ SIM | Novo campo, DEFAULT 'manual', NULL-safe |

**Análise:** Todos os campos são adições puras. Não alteram estrutura existente.

---

#### Campos Propostos para COMPANIES

| Campo | Tipo | Compatível? | Motivo |
|-------|------|-------------|--------|
| nome_fantasia | text | ✅ SIM | Já existe em organizations — apenas replicar |
| inscricao_estadual | text | ✅ SIM | Novo campo, NULL-safe |
| inscricao_municipal | text | ✅ SIM | Novo campo, NULL-safe |

**Análise:** `nome_fantasia` já existe na tabela `organizations`. Companies é uma entidade relacionada mas separada.

---

### 6.3 ANÁLISE DE IMPACTO POR MÓDULO

| Módulo | Impacto | Mitigação |
|--------|---------|-----------|
| WhatsApp | **NENHUM** | Não usa contacts para novos campos |
| Leads | **NENHUM** | Tabela independente |
| Pipeline | **MÍNIMO** | FK opcional, não usa novos campos |
| Orçamentos | **MÍNIMO** | FK opcional, pode exibir novos campos gradualmente |
| Pedidos | **MÍNIMO** | FK opcional, pode exibir novos campos gradualmente |

---

### 6.4 RISCOS MITIGADOS

| Risco | Mitigação |
|-------|-----------|
| **Quebra de queries** | SELECT * retorna novos campos automaticamente |
| **Falha em INSERTs** | Novos campos são opcionais com DEFAULT |
| **Falha em UPDATEs** | Novos campos não são alterados por queries existentes |
| **Incompatibilidade com dados existentes** | Campos novos são NULL para registros existentes |
| **Impacto em módulos dependentes** | Todas as FKs são opcionais |

---

### 6.5 CONDIÇÕES PARA SUCESSO

1. **Backup antes de migrations** — Sempre criar backup antes de executar
2. **Migrations incrementais** — Executar uma migration por vez
3. **Testes em staging** — Validar em ambiente de homologação
4. **Monitoramento** — Verificar logs após cada deployment
5. **Rollback plan** — Ter scripts de rollback prontos

---

### 6.6 EVOLUÇÃO RECOMENDADA

#### Contatos (Contacts)

```
NOVOS CAMPOS:
├── tipo_pessoa (PF | PJ)
├── tipo_conselho (CRM | CRO | CRBM | CRN | CRF | CREFITO | OUTRO)
├── numero_conselho
├── uf_conselho
├── especialidade
├── origem_cadastro (manual | importacao | whatsapp | conversao_lead | api)
└── observacoes_comerciais
```

#### Empresas (Companies)

```
NOVOS CAMPOS:
├── nome_fantasia
├── inscricao_estadual
└── inscricao_municipal
```

---

## CONCLUSÃO

### A estratégia é VIÁVEL e SEGURA

**Justificativa Final:**

1. ✅ **Adição pura de campos** — Todos os campos são novos, não há alteração de estrutura existente
2. ✅ **Retrocompatibilidade total** — Queries existentes continuam funcionando
3. ✅ **NULL-safe por padrão** — Registros existentes não são afetados
4. ✅ **Impacto controlado** — Módulos dependentes têm FKs opcionais
5. ✅ **Implementação gradual** — Pode ser feito em etapas

### Riscos identificados e mitigados

| Risco | Nível | Mitigação |
|-------|-------|-----------|
| Quebra de queries | **BAIXO** | SELECT * é NULL-safe |
| Falha em INSERTs | **BAIXO** | DEFAULT values |
| Impacto em módulos | **MÉDIO** | FKs opcionais |
| Dados inconsistentes | **MÉDIO** | Validação no formulário |

### Recomendação

**PROCEDER COM A EVOLUÇÃO** seguindo a ordem de implementação definida na ETAPA 5.

---

*Documento gerado através de análise estática do código.*
*Não foram executadas queries diretas no banco de dados.*
*Recomenda-se validação das queries com dados reais antes de implementar.*
