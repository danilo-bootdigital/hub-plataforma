#!/bin/bash

# Script para verificar se o deploy no Vercel está funcionando corretamente
# Execute este script após o deploy ser concluído

echo "🔍 Verificando deploy no Vercel..."
echo ""

# Obter URL do projeto do Vercel
PROJECT_URL="https://crm.dprimerepresentacao.com.br"

echo "🌐 Verificando se o site está acessível..."
if curl -s -o /dev/null -w "%{http_code}" "$PROJECT_URL" | grep -q "200\|301\|302"; then
  echo "✅ Site principal está acessível"
else
  echo "❌ Site principal não está acessível"
  exit 1
fi

echo ""
echo "📱 Verificando rotas da aplicação..."

# Verificar rotas importantes
ROUTES=(
  "/configuracoes-whatsapp"
  "/dashboard"
  "/dashboard/empresas"
  "/dashboard/usuarios"
  "/dashboard/pedidos"
  "/dashboard/orcamentos"
)

for route in "${ROUTES[@]}"; do
  URL="$PROJECT_URL$route"
  echo -n "  Verificando $route... "

  # Usar curl com timeout de 10 segundos
  if curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$URL" | grep -q "200\|301\|302"; then
    echo "✅"
  else
    echo "❌ (ou timeout)"
  fi
done

echo ""
echo "🔗 Verificando APIs do WhatsApp..."

# Verificar APIs do WhatsApp
API_ROUTES=(
  "/api/whatsapp/send"
  "/api/webhook/evolution"
)

for route in "${API_ROUTES[@]}"; do
  URL="$PROJECT_URL$route"
  echo -n "  Verificando $route... "

  # Fazer requisição GET para verificar se a API responde
  if curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$URL" | grep -q "200\|404\|500"; then
    echo "✅ (respondeu com código HTTP)"
  else
    echo "❌ (sem resposta)"
  fi
done

echo ""
echo "🧪 Testando funcionalidades..."

# Testar se as variáveis de ambiente estão carregadas corretamente
echo -n "  Verificando variáveis de ambiente... "
ENV_URL="$PROJECT_URL/api/env-check"
if curl -s "$ENV_URL" | grep -q "NEXT_PUBLIC_SUPABASE_URL"; then
  echo "✅ Variáveis de ambiente configuradas"
else
  echo "❌ Variáveis de ambiente não configuradas"
fi

echo ""
echo "📊 Verificando logs do Vercel..."

# Verificar se o Vercel CLI está instalado
if command -v vercel &> /dev/null && vercel whoami &> /dev/null; then
  # Obter o último deployment
  echo "Último deployment:"
  vercel ls --scope $(vercel whoami --scope) --json | jq -r '.[0] | "URL: \(.url)\nStatus: \(.state)\nCreated: \(.createdAt)"' 2>/dev/null || vercel ls --scope $(vercel whoami --scope)

  echo ""
  echo "Para ver os logs detalhados:"
  echo "  vercel logs <project-id>"
else
  echo "❌ Vercel CLI não instalado ou não autenticado"
fi

echo ""
echo "📋 Checklist pós-deploy:"
echo ""
echo "1. [ ] Site principal está acessível"
echo "2. [ ] Todas as rotas da aplicação respondem"
echo "3. [ ] APIs do WhatsApp estão ativas"
echo "4. [ ] Variáveis de ambiente estão configuradas"
echo "5. [ ] Webhook está configurado na Evolution API"
echo "6. [ ] Nenhum erro nos logs do Vercel"
echo ""
echo "🔧 Próximos passos:"
echo "1. Acesse /configuracoes-whatsapp"
echo "2. Crie uma nova instância"
echo "3. Escaneie o QR code"
echo "4. Envie uma mensagem de teste"
echo "5. Verifique se aparece no banco de dados"
echo ""
echo "Para testar o webhook:"
echo "curl -X POST '$PROJECT_URL/api/webhook/evolution' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"type\":\"test\"}'"