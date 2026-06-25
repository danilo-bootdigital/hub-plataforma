# 🚀 Boot CRM - Sistema de Gestão com WhatsApp

Sistema completo de CRM com integração WhatsApp, construído com Next.js, Supabase e Evolution API.

## 📋 Pré-requisitos

- Node.js 24 LTS
- npm ou yarn
- Conta no Vercel
- Conta no Supabase
- Acesso à Evolution API

## 🚀 Quick Start

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
Crie um arquivo `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
EVOLUTION_API_URL=https://evolution-api.com
EVOLUTION_API_KEY=sua-chave-evolution
EVOLUTION_WEBHOOK_SECRET=seu-secret-webhook
NEXT_PUBLIC_APP_URL=https://seu-app.vercel.app
NEXT_TELEMETRY_DISABLED=1
```

### 3. Rodar localmente
```bash
npm run dev
```

## 🚀 Deploy

### Configuração Inicial

1. **Configure o Vercel:**
   - Importe seu repositório
   - Adicione as variáveis de ambiente
   - Conecte ao GitHub

2. **Configure GitHub Secrets:**
   ```bash
   gh secret set VERCEL_TOKEN
   gh secret set VERCEL_ORG_ID
   gh secret set VERCEL_PROJECT_ID
   ```

### Scripts de Deploy

```bash
# Verificar ambiente antes do deploy
npm run deploy:verify

# Verificar após o deploy
npm run deploy:test

# Configurar webhook
npm run deploy:webhook
```

## 📁 Estrutura de Pastas

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── env-check/     # Verificação de variáveis
│   │   ├── webhook/       # Webhook WhatsApp
│   │   └── whatsapp/     # APIs do WhatsApp
│   ├── configuracoes-whatsapp/
│   ├── dashboard/
│   └── global.css
├── components/           # Componentes reutilizáveis
├── lib/                  # Configurações e utilitários
└── types/               # TypeScript types

scripts/                 # Scripts de deploy e verificação
├── verify-deploy-env.sh
├── verify-deploy.sh
└── setup-webhook.sh
```

## 🎯 Funcionalidades

- ✅ Gestão de empresas e usuários
- ✅ Sistema de orçamentos
- ✅ Pedidos de venda
- ✅ Integração WhatsApp
- ✅ Autenticação com Supabase
- ✅ Deploy automático no Vercel

## 📊 Monitoramento

- **Vercel Dashboard**: Logs e desempenho
- **Supabase Dashboard**: Banco de dados
- **GitHub Actions**: Status dos deploys

## 📚 Documentação

- [Guia de Deploy](./DEPLOY.md)
- [Por que usar Vercel](./porque-vercel.md)
- [Scripts de Deploy](./scripts/README.md)

## 🤝 Contribuição

1. Faça um fork
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit suas mudanças: `git commit -am 'Adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📞 Suporte

- Verifique a [documentação](./DEPLOY.md)
- Execute os scripts de verificação
- Verifique os logs no Vercel Dashboard