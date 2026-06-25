# AUDITORIA DO MÓDULO WHATSAPP - RELATÓRIO COMPLETO

## 1. FLUXO ATUAL DE CONEXÃO WHATSAPP

### 1.1 Criação de Instância
1. **Admin acessa** `/configuracoes/whatsapp`
2. **Cria nova instância** via `adicionarInstancia()`
   - Gera `instanceName` único: `org{org_id}-{timestamp}`
   - Chama Evolution API: `criarInstancia(instanceName, webhookUrl)`
   - Salva no banco com `status_conexao: 'desconectado'`

### 1.2 Conexão via QR Code
1. **Usuário clica "Conectar"** → abre `QrCodeDialog`
2. **Chama** `verificarQRCode(instanceId)`:
   - Se status = 'conectado' → retorna sucesso
   - Se status = 'desconectado' → chama `obterQRCode()`
   - Evolution retorna QR code em base64
3. **Usuário escaneia QR** com WhatsApp do celular
4. **Webhook CONNECTION_UPDATE** atualiza status para 'conectado'

### 1.3 Problemas Arquitetônicos
- **Sem status de última conexão**: A tabela `whatsapp_instances` não tem campo `ultima_conexao_em`
- **Sem retry automático**: Se instância cair, precisa reconectar manualmente
- **Sem monitoramento**: Não há verificação periódica de saúde da conexão

## 2. FLUXO ATUAL DE RECEBIMENTO DE MENSAGENS

### 2.1 Webhook Evolution API
**Endpoint**: `/api/webhook/evolution?secret={webhookSecret}`

### 2.2 Processamento de `messages.upsert`
1. **Filtragem**:
   - Ignora grupos (`@g.us`)
   - Ignora mensagens de sistema (protocol, reaction, etc.)
   - Ignora mensagens vazias

2. **Normalização**:
   - Extrai telefone: `normalizarTelefone(remoteJid)`
   - Remove prefixos: `@s.whatsapp.net`, `@c.us`, `:device_id`

3. **Deduplicação**:
   - Checa `message_id_externo` na tabela `messages`
   - Se existe, ignora

4. **Busca/cria conversa**:
   - Busca por `telefone_externo` + `organization_id`
   - Se não existe:
     - Se `fromMe=true` (mensagem enviada) → cria conversa de prospecção
     - Se `fromMe=false` (mensagem recebida) → cria lead + conversa

5. **Processo de lead**:
   - Busca lead existente por telefone
   - Se não existe:
     - Usa nome do contato cadastrado ou `pushName`
     - Cria lead com origem 'whatsapp'
     - Distribui lead (se admin existe)
     - Cria deal no pipeline

### 2.3 Problemas de Implementação
- **Cache ineficiente**: Busca contato sem cache (linha 17-38 no route.ts)
- **Sem tratamento de erros**: Se criação de lead falha, mensagem é perdida
- **Sem rate limiting**: Vulnerável a spam
- **Push name não persistido**: Não salva `pushName` na conversa para uso futuro

## 3. FLUXO ATUAL DE ENVIO DE MENSAGENS

### 3.1 Envio via UI
1. **Usuário seleciona conversa** → abre thread de mensagens
2. **Digita mensagem** → clica "Enviar"
3. **Chama API** `/api/whatsapp/send` (não existe no código!)
4. **Server action** `enviarMensagem()` (não encontrada)

### 3.2 Problemas Críticos
- **API de envio não implementada**: Não há endpoint para enviar mensagens
- **Sem retry lógico**: Evolution API tem retry, mas não há estratégia de fallback
- **Sem status de entrega**: Não atualiza status das mensagens enviadas
- **Sem fila de mensagens**: Mensagens falhadas são perdidas

## 4. COMO OS CONTATOS RECEBEM NOMES

### 4.1 Prioridade de Fontes (do mais alto para o baixo)
1. **Manual**: Editado pelo usuário via `EditarNome` componente
2. **Contact**: Nome salvo no cadastro de contatos
3. **Pushname**: `pushName` vindo do WhatsApp (não persistido)
4. **Lead**: Nome salvo no cadastro de leads
5. **Conversation**: Nome salvo na conversa (cache)
6. **Phone**: Telefone formatado
7. **Unknown**: "Não identificado"

### 4.2 Implementação em `lib/nome-contato.ts`
```typescript
// 1. Verifica se é lead com nome manual
if (options?.leadId) {
  const lead = await supabase.from('leads').select('nome').eq('id', options.leadId).single()
  if (lead?.nome && !/^\d{8,15}$/.test(lead.nome)) {
    return { display: lead.nome, source: 'manual' }
  }
}

// 2. Busca contato por telefone
const contato = await supabase.from('contacts').select('nome').or(...).single()
if (contato?.nome && !/^\d{8,15}$/.test(contato.nome)) {
  return { display: contato.nome, source: 'contact' }
}

// 3. Usa pushName do WhatsApp
if (options?.pushName && !/^\d{8,15}$/.test(options.pushName)) {
  return { display: options.pushName, source: 'pushname' }
}
```

### 4.3 Problemas
- **Push name não persistido**: Não salva no banco, só usa na hora da resolução
- **Sem cache eficiente**: Busca no banco a cada requisição
- **Sem atualização automática**: Se contato mudar nome no WhatsApp, não atualiza

## 5. COMO AS CONVERSAS SÃO VINCULADAS AOS CONTATOS

### 5.1 Vínculo via Lead
1. **Mensagem recebida** → cria lead automaticamente
2. **Lead tem** `whatsapp_instance_id` (vincula à instância)
3. **Conversa tem** `lead_id` (vincula ao lead)

### 5.2 Vínculo via Contato
1. **Busca contato** por telefone normalizado
2. **Se encontrar** → exibe nome do contato
3. **Mas não salva vínculo direto** na tabela `conversations`

### 5.3 Problemas
- **Sem vínculo bidirecional**: Conversa não sabe qual contato está vinculado
- **Sem sincronização automática**: Se contato mudar telefone, não atualiza
- **Sem deduplicação inteligente**: Mesmo número pode existir em contato e lead separados

## 6. ERROS DE ARQUITETURA

### 6.1 Falta de Abstração
- **Código repetido**: Lógica de normalização de telefone espalhada
- **Sem service layer**: Business logic misturada com API routes
- **Sem DTOs**: Dados brutos passados entre camadas

### 6.2 Falta de Resiliência
- **Sem retry strategy**: Evolution API falha sem retry
- **Sem circuit breaker**: Se API cai, todo sistema quebra
- **Sem monitoring**: Não há métricas de saúde

### 6.3 Falta de Escalabilidade
- **Sem cache**: Buscas ao banco a cada mensagem
- **Sem filas**: Processamento síncrono bloqueante
- **Sem partitioning**: Todas instâncias na mesma tabela

## 7. ERROS DE IMPLEMENTAÇÃO

### 7.1 TypeScript
- **Tipos inconsistentes**: `vendedor` pode ser objeto ou array
- **Null handling**: Verificações ausentes em vários pontos
- **Erros silenciosos**: Try-catch sem logging ou retry

### 7.2 Performance
- **N+1 queries**: Busca de tags para cada conversa
- **Sem índices**: `conversas(organization_id, ultima_mensagem_em)` pode ser lento
- **Realtime ineficiente**: Atualiza toda a lista em vez de só o item modificado

### 7.3 UX Issues
- **Sem loading states**: Spinner ausente em operações lentas
- **Sem feedback de erro**: Mensagens genéricas "Erro desconhecido"
- **Sem confirmação**: Exclusão de instância sem confirmação visual

## 8. ARQUIVOS ENVOLVIDOS

### 8.1 Backend
```
app/api/webhook/evolution/route.ts          # Webhook principal
app/api/webhook/evolution/route-improved.ts # Versão melhorada
app/api/whatsapp/instances/route.ts         # CRUD instâncias
lib/evolution.ts                           # Client Evolution API
lib/nome-contato.ts                        # Resolução de nomes
lib/telefone.ts                            # Normalização telefones
```

### 8.2 Frontend
```
app/(dashboard)/configuracoes/whatsapp/     # Configurações
app/(dashboard)/whatsapp/                   # Interface de conversas
components/whatsapp/                       # Todos componentes
```

### 8.3 Database
```
supabase/migrations/001_schema_completo.sql # Schema principal
supabase/migrations/030_unique_constraints_whatsapp.sql # Restrições
supabase/migrations/039_whatsapp_inativa_status.sql # Status inativa
supabase/migrations/040_conversations_nome_contato.sql # Campos nome
supabase/migrations/041_normalizar_telefones.sql # Função normalização
```

## 9. RECOMENDAÇÕES PRIORITÁRIAS

### 9.1 Críticas (P0)
1. **Implementar API de envio**: Criar endpoint `/api/whatsapp/send`
2. **Adicionar retry strategy**: Implementar exponential backoff
3. **Persistir pushName**: Salvar na tabela `conversations`
4. **Adicionar campos de auditoria**: `ultima_conexao_em`, `tentativas_conexao`

### 9.2 Altas (P1)
1. **Implementar cache**: Redis para contatos e nomes
2. **Adicionar fila**: Bull Queue para processamento assíncrono
3. **Melhorar UX**: Loading states e mensagens de erro claras
4. **Adicionar monitoring**: Métricas de saúde e performance

### 9.3 Médias (P2)
1. **Refatorar service layer**: Separar business logic
2. **Adicionar testes**: Unitários e de integração
3. **Implementar deduplicação**: Inteligente de contatos
4. **Adicionar features**: Transferência, templates, respostas rápidas

## 10. CONCLUSÃO

O módulo WhatsApp tem uma arquitetura básica funcional, mas carece de resiliência, escalabilidade e boas práticas de código. Os problemas mais críticos são:

1. **Falta de API de envio** de mensagens
2. **Tratamento de erros insuficiente**
3. **Sem cache ou otimizações**
4. **UX com vários pontos de melhoria**

Com as correções recomendadas, o sistema pode se tornar robusto e confiável para uso em produção.