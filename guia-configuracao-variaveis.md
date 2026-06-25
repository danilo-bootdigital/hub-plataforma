# 🛠️ Guia para Configurar Variáveis de Ambiente

## 1. **Arquivo .env.local**

Primeiro, crie ou edite o arquivo `.env.local` na raiz do seu projeto:

```bash
# Se não existir, crie o arquivo:
touch .env.local
```

Adicione estas variáveis:

```env
# ============================================================
# Supabase - Configurações do Banco de Dados
# ============================================================

# URL do seu projeto Supabase (encontrada no dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://seuprojeto.supabase.co

# Chave pública do Supabase (encontrada no dashboard)
# Começa com "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Chave de serviço (opcional, para operações admin)
# Supabase Dashboard > Settings > API > Project API keys
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================================
# Evolution API - Configurações do WhatsApp
# ============================================================

# URL da sua API Evolution (fornecida pela Evolution)
# Ex: https://evolution-api.yourprovider.com
EVOLUTION_API_URL=https://sua-evolution-api.com

# Chave de API da Evolution (fornecida pela Evolution)
EVOLUTION_API_KEY=sua-chave-api-aqui

# Segredo para validar webhooks (crie uma string aleatória)
# Ex: wh4t5@Pp_3v0lu710n_w3bh00k_53cr3t_2024
EVOLUTION_WEBHOOK_SECRET=wh4t5@Pp_3v0lu710n_w3bh00k_53cr3t_2024

# ============================================================
# App - Configurações Gerais
# ============================================================

# URL do seu aplicativo em produção
NEXT_PUBLIC_APP_URL=https://seu-dominio.com

# Porta local (opcional)
PORT=3000

# Desabilitar telemetry do Next.js
NEXT_TELEMETRY_DISABLED=1
```

## 2. **Onde Encontrar cada Valor**

### 🔑 **Supabase Configuration**

1. Acesse o [Dashboard do Supabase](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **Settings > API**
4. Você encontrará:
   - **Project URL**: `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 📡 **Evolution API Configuration**

1. Entre em contato com seu provedor da Evolution API
2. Peça estas informações:
   - **API URL**: O endereço onde sua API está hospedada
   - **API Key**: Sua chave de autenticação
   - **Webhook Secret**: Uma string secreta para validar webhooks

   **Exemplo de como gerar um webhook secret:**
   ```bash
   # No terminal, gere um secret aleatório:
   openssl rand -base64 32
   ```

## 3. **Script para Gerar Variáveis**

Use este script para gerar um webhook seguro:

```bash
#!/bin/bash
echo "Gerando webhook secret aleatório:"
openssl rand -base64 32
echo ""
echo "Use este valor para EVOLUTION_WEBHOOK_SECRET"
```

Salve como `generate-secret.sh` e execute:
```bash
chmod +x generate-secret.sh
./generate-secret.sh
```

## 4. **Exemplo Completo de .env.local**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://abc123xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# Evolution API
EVOLUTION_API_URL=https://evolution-api.example.com
EVOLUTION_API_KEY=evolution_1234567890abcdef
EVOLUTION_WEBHOOK_SECRET=wh4t5@Pp_3v0lu710n_w3bh00k_53cr3t_2024

# App
NEXT_PUBLIC_APP_URL=https://meuapp.com
PORT=3000
NEXT_TELEMETRY_DISABLED=1
```

## 5. **Verificação das Variáveis**

Depois de configurar, rode este comando para testar:

```bash
# Verificar se todas as variáveis estão setadas
echo "Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
echo "Evolution API: $EVOLUTION_API_URL"
echo "Webhook Secret: ${EVOLUTION_WEBHOOK_SECRET:0:10}..."
```

## 6. **Variáveis Importantes para o WhatsApp**

### **EVOLUTION_WEBHOOK_SECRET**
- Esta é **MUITO IMPORTANTE**
- Usada para validar que os webhooks vêm realmente da Evolution
- Nunca exponha este valor
- Use uma string longa e aleatória

### **EVOLUTION_API_URL**
- Deve terminar com `/` (opcional, mas recomendado)
- Ex: `https://api.evolution.com/`
- Verifique com seu provedor

### **NEXT_PUBLIC_APP_URL**
- Deve ser a URL onde seu app estará em produção
- Usada para configurar os webhooks
- Ex: `https://meuapp.com` ou `https://boot-crm.vercel.app`

## 7. **Próximos Passos Após Configurar**

1. **Reinicie seu servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```

2. **Verifique no console** se não há erros de variáveis não definidas:
   ```
   Error: EVOLUTION_API_URL não configurada
   ```

3. **Teste as conexões**:
   - Acesse `/debug-whatsapp`
   - Verifique se as variáveis estão carregadas

## 8. **Dicas de Segurança**

- **NUNCA** commit `.env.local` no Git
- Adicione `.env.local` ao seu `.gitignore`
- Use diferentes valores para desenvolvimento e produção
- Rotacione suas chaves periodicamente

## 9. **Se Algo Der Errado**

Se você encontrar erros como:

```
Error: EVOLUTION_API_URL não configurada
```

Verifique:
1. O arquivo `.env.local` existe
2. As variáveis não têm typos
3. Você reiniciou o servidor após alterar
4. As variáveis estão no formato correto (sem aspas extras)

Precisa de ajuda com algum desses passos?