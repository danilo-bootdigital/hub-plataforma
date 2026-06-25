# 🚀 Checklist para Deploy do Sistema WhatsApp

## 🔍 **Verificação de Pré-requisitos**

### 1. **Variáveis de Ambiente (.env.local)**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=seu-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima

# Evolution API
EVOLUTION_API_URL=https://seu-evolution-api.com
EVOLUTION_API_KEY=sua-chave-api
EVOLUTION_WEBHOOK_SECRET=sua-secret-de-webhook

# Outras
NEXTAUTH_URL=http://localhost:3000 # ou seu domínio
```

### 2. **Banco de Dados - Schema Necessário**
```sql
-- Tabela para instâncias do WhatsApp
CREATE TABLE whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  evolution_instance_name TEXT NOT NULL UNIQUE,
  status_conexao TEXT DEFAULT 'desconectado',
  qrcode TEXT,
  webhook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para conversas
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  whatsapp_instance_id UUID REFERENCES whatsapp_instances(id),
  telefone_externo TEXT NOT NULL,
  lead_id UUID REFERENCES leads(id),
  status TEXT DEFAULT 'aguardando_resposta',
  responsavel_id UUID REFERENCES profiles(id),
  ultima_mensagem_em TIMESTAMP WITH TIME ZONE,
  nome_contato TEXT,
  name_source TEXT DEFAULT 'whatsapp',
  whatsapp_push_name TEXT,
  is_name_manually_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice importante para performance
CREATE INDEX idx_conversations_phone_org ON conversations(telefone_externo, organization_id);
CREATE INDEX idx_conversations_status ON conversations(status, organization_id);
```

### 3. **Permissões de API**
- [ ] Supabase: Tables criadas com RLS (Row Level Security)
- [ ] Evolution API: Acesso configurado
- [ ] Webhook: URL pública acessível

### 4. **Configuração do Webhook**
- [ ] URL do webhook: `https://seu-domino.com/api/webhook/evolution?secret=SUA_SECRET`
- [ ] Eventos configurados:
  - `MESSAGES_UPSERT`
  - `CONNECTION_UPDATE`
  - `MESSAGES_UPDATE`

### 5. **Build e Deploy**
```bash
# 1. Instalar dependências
npm install

# 2. Rodar build
npm run build

# 3. Rodar lint
npm run lint

# 4. Testar ambiente local
npm run dev
```

### 6. **Verificação de Funcionalidades**

#### Teste 1: Conexão com Evolution API
```bash
curl -X GET "https://seu-evolution-api.com/instance/connectionState/sua-instancia" \
  -H "apikey: sua-chave-api"
```

#### Teste 2: Criar Instância
```bash
curl -X POST "https://seu-evolution-api.com/instance/create" \
  -H "Content-Type: application/json" \
  -H "apikey: sua-chave-api" \
  -d '{
    "instanceName": "test-instance",
    "qrcode": true,
    "integration": "WHATSAPP-BAILEYS",
    "webhook": {
      "url": "https://seu-domino.com/api/webhook/evolution?secret=SUA_SECRET",
      "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "MESSAGES_UPDATE"]
    }
  }'
```

#### Teste 3: Enviar Mensagem (após QR code escaneado)
```bash
curl -X POST "https://seu-evolution-api.com/message/sendText/test-instance" \
  -H "Content-Type: application/json" \
  -H "apikey: sua-chave-api" \
  -d '{
    "number": "5511999998888",
    "text": "Teste de mensagem"
  }'
```

### 7. **Arquivos de Configuração**

#### next.config.js (se necessário)
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['example.com'], // se usar imagens externas
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
}

module.exports = nextConfig
```

### 8. **Scripts de Deploy**

#### Vercel (se for usar)
```bash
# Instalar CLI
npm i -g vercel

# Fazer deploy
vercel --prod

# Ou preview
vercel
```

#### Docker (se usar)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### 9. **Monitoramento e Logs**

#### Logs importantes:
- `app/api/webhook/evolution/route.ts` - Webhook reception
- `lib/evolution.ts` - API calls
- `lib/evolution-retry.ts` - Retry logs
- Console errors no navegador

#### Métricas para monitorar:
- Tempo de resposta do webhook
- Taxa de sucesso de envio
- Uso do cache
- Conexões ativas

### 10. **Possíveis Problemas Comuns**

#### Problema: "EVOLUTION_API_URL não configurada"
- Solução: Verificar .env.local

#### Problema: "Este número não possui WhatsApp"
- Solução: Verificar se o número tem WhatsApp e está no formato correto

#### Problema: Webhook não recebe eventos
- Solução: Verificar URL pública e secret

#### Problema: Mensagens não aparecem no banco
- Solução: Verificar permissões do Supabase e logs do webhook

### 11. **Checklist Final**

Antes do deploy:
- [ ] Todas as variáveis de ambiente configuradas
- [ ] Schema do banco criado
- [ ] Webhook configurado na Evolution API
- [ ] Build local sem erros
- [ ] Testes manuais realizados
- [ ] Documentação atualizada

Após o deploy:
- [ ] Acessar o dashboard do WhatsApp
- [ ] Configurar nova instância
- [ Escanear QR code
- [ ] Enviar mensagem de teste
- [ ] Verificar se aparece no banco
- [ ] Testar envio de mídia

### 12. **Links Úteis**

- [Evolution API Documentation](https://evolution-api-docs.vercel.app/)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Next.js Deployment](https://nextjs.org/docs/deployment)