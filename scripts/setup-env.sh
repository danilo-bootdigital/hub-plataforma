#!/bin/bash

# Script para configurar .env.local com as variáveis corretas
# Execute este script antes de rodar o projeto localmente

echo "🔧 Configurando .env.local..."
echo ""

# Criar .env.local com as variáveis necessárias
cat > .env.local << EOF
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://zjhapezbcqoqwrwolcju.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MzE5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMzk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3k0qGARJnU

# Evolution API Configuration
EVOLUTION_API_URL=https://evolution.dprimerepresentacao.com.br
EVOLUTION_API_KEY=DprimeEvo2024BootKey
EVOLUTION_WEBHOOK_SECRET=webhook-secret-dprime-2024

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_TELEMETRY_DISABLED=1

# Vercel (para deploy)
VERCEL=1
VERCEL_ENV=development
EOF

echo "✅ .env.local configurado!"
echo ""
echo "📋 Variáveis configuradas:"
echo "  - Supabase URL: https://zjhapezbcqoqwrwolcju.supabase.co"
echo "  - Supabase Anon Key: configurada"
echo "  - Supabase Service Role Key: configurada"
echo "  - Evolution API URL: https://evolution.dprimerepresentacao.com.br"
echo "  - Evolution API Key: DprimeEvo2024BootKey"
echo "  - Evolution Webhook Secret: webhook-secret-dprime-2024"
echo "  - App URL: http://localhost:3000"
echo ""
echo "🚀 Agora você pode rodar:"
echo "  npm run dev"
echo ""
echo "⚠️  ATENÇÃO: Estas são variáveis de exemplo. Para produção, use as variáveis reais!"