# Scripts de Deploy

Este diretório contém scripts auxiliares para o processo de deploy no Vercel.

## 📁 Arquivos

### `verify-deploy-env.sh`
Script para verificar a configuração de ambiente antes do deploy.

**Como usar:**
```bash
./scripts/verify-deploy-env.sh
```

**Verificações realizadas:**
- Presença de variáveis de ambiente no `.env.local`
- Autenticação do Vercel CLI
- Configuração de GitHub Secrets
- Status dos projetos Vercel

## 🚀 Pré-requisitos

Antes de executar qualquer script, certifique-se de ter:

1. **Node.js 24 LTS** instalado
2. **Vercel CLI** instalado: `npm i -g vercel`
3. **GitHub CLI** instalado: `brew install gh` (macOS) ou [download](https://github.com/cli/cli)
4. **Autenticado no Vercel**: `vercel login`
5. **Autenticado no GitHub**: `gh auth login`

## 🔧 Configuração Necessária

### Variáveis de Ambiente

Adicione ao seu `.env.local`:

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

### GitHub Secrets

Configure no seu repositório GitHub:
- `VERCEL_TOKEN`: Token do Vercel
- `VERCEL_ORG_ID`: ID da organização Vercel
- `VERCEL_PROJECT_ID`: ID do projeto Vercel

**Como obter o token do Vercel:**
1. Acesse [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Clique em "Create Token"
3. Dê um nome (ex: "Boot-CRM-Deploy")
4. Copie o token

**Como configurar secrets:**
```bash
gh secret set VERCEL_TOKEN --repo <seu-usuario>/<seu-repo>
gh secret set VERCEL_ORG_ID --repo <seu-usuario>/<seu-repo>
gh secret set VERCEL_PROJECT_ID --repo <seu-usuario>/<seu-repo>
```

## 📋 Checklist de Deploy

1. [ ] Execute `./scripts/verify-deploy-env.sh`
2. [ ] Verifique se todas as verificações estão ✅
3. [ ] Execute `npm run lint` - sem erros
4. [ ] Execute `npm run build` - sem erros
5. [ ] Faça commit e push para o branch main
6. [ ] Monitore o deploy no GitHub Actions
7. [ ] Verifique o deploy no Vercel Dashboard
8. [ ] Configure o webhook na Evolution API (manualmente)