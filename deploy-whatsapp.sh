#!/bin/bash

# ==============================================
# Script de Deploy para o Sistema WhatsApp
# ==============================================

echo "🚀 Iniciando deploy do sistema WhatsApp..."

# 1. Verificar se todas as variáveis de ambiente estão configuradas
echo "📋 Verificando variáveis de ambiente..."
required_vars=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "EVOLUTION_API_URL"
  "EVOLUTION_API_KEY"
  "EVOLUTION_WEBHOOK_SECRET"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Erro: Variável $var não configurada"
    exit 1
  fi
done

echo "✅ Todas as variáveis de ambiente configuradas"

# 2. Instalar dependências
echo "📦 Instalando dependências..."
npm ci

# 3. Rodar linter
echo "🔍 Rodando linter..."
npm run lint

# 4. Rodar build
echo "🏗️ Rodando build..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Erro no build"
  exit 1
fi

echo "✅ Build concluído com sucesso"

# 5. Se for deploy para Vercel
if [ "$1" == "vercel" ]; then
  echo "🌐 Deploy para Vercel..."

  # Instalar Vercel CLI se não existir
  if ! command -v vercel &> /dev/null; then
    echo "📦 Instalando Vercel CLI..."
    npm i -g vercel
  fi

  # Fazer login
  vercel login

  # Fazer deploy
  vercel --prod

  echo "✅ Deploy para Vercel concluído"
fi

# 6. Se for deploy manual (Docker)
if [ "$1" == "docker" ]; then
  echo "🐳 Build da imagem Docker..."

  docker build -t boot-crm-whatsapp .

  echo "✅ Imagem Docker criada"
  echo "Para rodar: docker run -p 3000:3000 --env-file .env.local boot-crm-whatsapp"
fi

# 7. Mensagem final
echo ""
echo "🎉 Deploy concluído!"
echo ""
echo "Próximos passos:"
echo "1. Configure uma nova instância na Evolution API"
echo "2. Atualize o webhook com a URL: ${NEXT_PUBLIC_APP_URL}/api/webhook/evolution?secret=${EVOLUTION_WEBHOOK_SECRET}"
echo "3. Escaneie o QR code no dashboard"
echo "4. Envie uma mensagem de teste"
echo ""
echo "URL do aplicativo: ${NEXT_PUBLIC_APP_URL}"