#!/bin/bash

# Script para verificar configuração de ambiente para deploy no Vercel
# Execute este script antes de fazer o deploy

echo "🔍 Verificando configuração de ambiente para deploy no Vercel..."
echo ""

# Verificar variáveis de ambiente necessárias
VARIABLES=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "EVOLUTION_API_URL"
  "EVOLUTION_API_KEY"
  "EVOLUTION_WEBHOOK_SECRET"
  "NEXT_PUBLIC_APP_URL"
  "NEXT_TELEMETRY_DISABLED"
)

# Verificar no arquivo .env.local
echo "📁 Verificando .env.local..."
if [ -f .env.local ]; then
  echo "✅ .env.local encontrado"

  # Verificar se todas as variáveis estão no .env.local
  MISSING_LOCAL=()
  for var in "${VARIABLES[@]}"; do
    if ! grep -q "^${var}=" .env.local; then
      MISSING_LOCAL+=("$var")
    fi
  done

  if [ ${#MISSING_LOCAL[@]} -eq 0 ]; then
    echo "✅ Todas as variáveis de ambiente estão presentes no .env.local"
  else
    echo "❌ Variáveis ausentes no .env.local:"
    for var in "${MISSING_LOCAL[@]}"; do
      echo "   - $var"
    done
  fi
else
  echo "❌ .env.local não encontrado"
fi

echo ""
echo "🌐 Verificando configuração do Vercel..."

# Verificar se o Vercel CLI está instalado e autenticado
if command -v vercel &> /dev/null; then
  echo "✅ Vercel CLI instalado"

  # Verificar autenticação
  if vercel whoami &> /dev/null; then
    echo "✅ Vercel CLI autenticado"

    # Listar projetos
    echo ""
    echo "📂 Projetos Vercel:"
    vercel ls --scope $(vercel whoami --scope)
  else
    echo "❌ Vercel CLI não autenticado. Execute: vercel login"
  fi
else
  echo "❌ Vercel CLI não instalado. Execute: npm i -g vercel"
fi

echo ""
echo "🔑 Verificando GitHub Secrets..."

# Verificar GitHub Secrets (requer GitHub CLI)
if command -v gh &> /dev/null; then
  echo ""
  echo "Verificando secrets necessários..."
  SECRETS=(
    "VERCEL_TOKEN"
    "VERCEL_ORG_ID"
    "VERCEL_PROJECT_ID"
  )

  # Obter repositório atual
  REPO=$(git remote get-url origin | sed 's/.*://' | sed 's/\.git$//' | sed 's/.*\///')
  ORG=$(echo $REPO | cut -d'/' -f1)
  REPO_NAME=$(echo $REPO | cut -d'/' -f2)

  echo "Repositório: $ORG/$REPO_NAME"

  for secret in "${SECRETS[@]}"; do
    if gh secret list --repo $ORG/$REPO_NAME --jq '.[] | select(.name == "'$secret'")' | grep -q "$secret"; then
      echo "✅ $secret configurado"
    else
      echo "❌ $secret NÃO configurado"
      echo "   Para configurar: gh secret set $secret --repo $ORG/$REPO_NAME"
    fi
  done
else
  echo "❌ GitHub CLI não instalado. Instale com: brew install gh"
fi

echo ""
echo "📋 Checklist de pré-deploy:"
echo ""
echo "1. [ ] Todas as variáveis de ambiente estão configuradas no Vercel Dashboard"
echo "2. [ ] Todos os GitHub Secrets estão configurados"
echo "3. [ ] Vercel CLI está autenticado"
echo "4. [ ] Código está no branch main"
echo "5. [ ] Nenhum erro de lint ou build"
echo ""
echo "Para verificar o build localmente:"
echo "  npm run lint"
echo "  npm run build"
echo ""