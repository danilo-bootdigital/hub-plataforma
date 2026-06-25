# 🚀 Guia de Deploy - Sistema WhatsApp

## 📋 Pré-requisitos

Antes de fazer o deploy, certifique-se de ter:

1. **Conta no Vercel** (ou outra plataforma)
2. **Repositório no GitHub** já configurado
3. **Node.js 24 LTS** instalado
4. **Vercel CLI** instalado: `npm i -g vercel`
5. **GitHub CLI** instalado: `brew install gh` (macOS) ou [download](https://github.com/cli/cli)

## 🔧 Scripts de Verificação

### Antes do Deploy
Execute o script de verificação de ambiente:
```bash
./scripts/verify-deploy-env.sh
```

### Após o Deploy
Execute o script de verificação do deploy:
```bash
./scripts/verify-deploy.sh
```

### Configuração Automática do Webhook
```bash
# Configure a variável de ambiente primeiro
export EVOLUTION_API_KEY=DprimeEvo2024BootKey

# Execute o script de configuração
./scripts/setup-webhook.sh
```

## 🔧 Configuração Necessária

### 1. **Vercel Configuration**

1. Acesse [vercel.com](https://vercel.com)
2. Importe seu repositório do GitHub
3. Adicione as variáveis de ambiente em **Project Settings > Environment Variables**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://zjhapezbcqoqwrwolcju.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EVOLUTION_API_URL=https://evolution.dprimerepresentacao.com.br
EVOLUTION_API_KEY=DprimeEvo2024BootKey
EVOLUTION_WEBHOOK_SECRET=webhook-secret-dprime-2024
NEXT_PUBLIC_APP_URL=https://crm.dprimerepresentacao.com.br
NEXT_TELEMETRY_DISABLED=1
```

### 2. **GitHub Secrets**

No seu repositório GitHub, vá em **Settings > Secrets and variables > Actions** e adicione:

- `VERCEL_TOKEN`: Seu token do Vercel
- `VERCEL_ORG_ID`: ID da sua organização Vercel
- `VERCEL_PROJECT_ID`: ID do seu projeto Vercel

### 3. **Como obter os tokens do Vercel**

1. Vá para [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Clique em "Create Token"
3. Dê um nome (ex: "Boot-CRM-Deploy")
4. Copie o token e adicione no GitHub Secrets

## 🚀 Processo de Deploy

### **Deploy Automático (Recomendado)**

O deploy será feito automaticamente sempre que:
- Um push for feito no branch `main`
- Um PR for merged para o `main`

### **Deploy Manual**

Se precisar fazer deploy manual:

1. **Via Vercel Dashboard:**
   - Acesse seu projeto no Vercel
   - Clique em "Deploy" > "Deploy Branch"

2. **Via CLI:**
   ```bash
   # Instalar Vercel CLI
   npm i -g vercel
   
   # Fazer login
   vercel login
   
   # Fazer deploy
   vercel --prod
   ```

## 🔧 Configuração do Webhook

Após o deploy, configure o webhook na Evolution API:

1. **URL do Webhook:**
   ```
   https://crm.dprimerepresentacao.com.br/api/webhook/evolution?secret=webhook-secret-dprime-2024
   ```

2. **Eventos:**
   - `MESSAGES_UPSERT`
   - `CONNECTION_UPDATE`
   - `MESSAGES_UPDATE`

## 📋 Checklist Pós-Deploy

### Verificação Automática
Execute o script de verificação:
```bash
./scripts/verify-deploy.sh
```

### Checklist Manual
1. [ ] Verificar se o aplicativo está online
2. [ ] Acessar `/configuracoes-whatsapp`
3. [ ] Criar nova instância
4. [ ] Escanear QR code
5. [ ] Enviar mensagem de teste
6. [ ] Verificar se aparece no banco de dados
7. [ ] Verificar se o webhook está recebendo eventos

### Configuração do Webhook
Para configurar automaticamente o webhook:
```bash
export EVOLUTION_API_KEY=DprimeEvo2024BootKey
./scripts/setup-webhook.sh
```

## 🐛 Troubleshooting

### Erro comum: "EVOLUTION_API_URL não configurada"

**Solução:**
1. Verificar se as variáveis de ambiente estão no Vercel
2. Reiniciar o deploy no Vercel
3. Checar se o `.env.local` não foi commitado
4. Executar: `./scripts/verify-deploy-env.sh`

### Erro: "Webhook não recebe eventos"

**Solução:**
1. Verificar se a URL do webhook está acessível
2. Checar se o secret está correto
3. Verificar se a Evolution API está online
4. Reconfigurar webhook: `./scripts/setup-webhook.sh`

### Erro: "Deploy falhou no GitHub Actions"

**Solução:**
1. Verificar logs do GitHub Actions
2. Verificar se Node.js 24 está configurado
3. Executar local: `npm run lint` e `npm run build`

### Erro: "Site não carrega após deploy"

**Solução:**
1. Verificar se todas as variáveis de ambiente estão configuradas
2. Executar: `./scripts/verify-deploy.sh`
3. Verificar logs do Vercel Dashboard
4. Fazer rollback via Vercel Dashboard

## 📊 Monitoramento

- **Vercel Dashboard**: Logs e desempenho
- **GitHub Actions**: Status dos deploys
- **Supabase Dashboard**: Logs do banco

## 🔄 Rollback

Se algo der errado:

1. **Via Vercel Dashboard:**
   - Vá em "Deployments"
   - Clique no deployment anterior
   - Selecione "Deploy Branch"

2. **Via Git:**
   ```bash
   git reset --hard HEAD~1
   git push origin main --force
   ```

## 📞 Suporte

Se precisar de ajuda:

1. **Verificação rápida:**
   ```bash
   ./scripts/verify-deploy-env.sh
   ./scripts/verify-deploy.sh
   ```

2. **Verifique os logs no Vercel Dashboard**

3. **Consulte a documentação:**
   - [Scripts de Deploy](./scripts/README.md)
   - [Configuração Vercel](./porque-vercel.md)

4. **Recomendações:**
   - Sempre execute os scripts de verificação antes e após o deploy
   - Mantenha as variáveis de ambiente atualizadas
   - Monitore os logs regularmente

---

## 🎉 Pronto! Seu sistema WhatsApp está no ar e com deploy automático!

### Resumo do que foi configurado:

- ✅ **GitHub Actions** com Node.js 24 LTS
- ✅ **Scripts de verificação** para pré e pós-deploy
- ✅ **API de verificação** de variáveis de ambiente
- ✅ **Script automático** de configuração de webhook
- ✅ **Documentação atualizada** com todos os passos

### Fluxo de trabalho recomendado:

1. **Antes do commit:**
   ```bash
   npm run lint
   npm run build
   ./scripts/verify-deploy-env.sh
   ```

2. **Após o deploy:**
   ```bash
   ./scripts/verify-deploy.sh
   ./scripts/setup-webhook.sh
   ```

3. **Monitoramento contínuo:**
   - Vercel Dashboard (logs e desempenho)
   - GitHub Actions (status dos deploys)
   - Supabase Dashboard (logs do banco)