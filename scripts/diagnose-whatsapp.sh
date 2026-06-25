#!/bin/bash

# Script de diagnóstico para conexão do WhatsApp
echo "🔍 Diagnóstico de Conexão WhatsApp"
echo "=================================="

# 1. Verificar variáveis de ambiente
echo ""
echo "1. Verificando variáveis de ambiente..."
echo "----------------------------------------"

if [ -z "$EVOLUTION_API_URL" ]; then
    echo "❌ EVOLUTION_API_URL não configurada"
else
    echo "✅ EVOLUTION_API_URL: $EVOLUTION_API_URL"
fi

if [ -z "$EVOLUTION_API_KEY" ]; then
    echo "❌ EVOLUTION_API_KEY não configurada"
else
    echo "✅ EVOLUTION_API_KEY: [***]"
fi

if [ -z "$EVOLUTION_WEBHOOK_SECRET" ]; then
    echo "❌ EVOLUTION_WEBHOOK_SECRET não configurada"
else
    echo "✅ EVOLUTION_WEBHOOK_SECRET: [***]"
fi

# 2. Testar conexão com a Evolution API
echo ""
echo "2. Testando conexão com a Evolution API..."
echo "------------------------------------------"

if [ -n "$EVOLUTION_API_URL" ] && [ -n "$EVOLUTION_API_KEY" ]; then
    # Testar endpoint de status
    RESPONSE=$(curl -s -X GET \
        -H "Content-Type: application/json" \
        -H "apikey: $EVOLUTION_API_KEY" \
        -w "%{http_code}" \
        "$EVOLUTION_API_URL/api/status" 2>/dev/null)

    HTTP_CODE="${RESPONSE: -3}"
    BODY="${RESPONSE%???}"

    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ API Evolution está online"
        echo "   Resposta: $BODY"
    else
        echo "❌ API Evolution retornou erro: $HTTP_CODE"
        echo "   Resposta: $BODY"
    fi
else
    echo "❌ Variáveis de ambiente não configuradas, não foi possível testar"
fi

# 3. Verificar instâncias no banco
echo ""
echo "3. Verificando instâncias no banco de dados..."
echo "---------------------------------------------"

# Verificar se o script pode acessar o banco
if [ -n "$DATABASE_URL" ]; then
    # Contar instâncias
    TOTAL_INSTANCES=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM whatsapp_instances;" 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "✅ Total de instâncias: $TOTAL_INSTANCES"

        # Verificar instâncias conectadas
        CONNECTED_INSTANCES=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM whatsapp_instances WHERE status_conexao = 'conectado';" 2>/dev/null)
        echo "✅ Instâncias conectadas: $CONNECTED_INSTANCES"

        # Listar instâncias
        echo ""
        echo "   Lista de instâncias:"
        psql "$DATABASE_URL" -c "SELECT id, nome, status_conexao, evolution_instance_name, created_at FROM whatsapp_instances ORDER BY created_at DESC;" 2>/dev/null | sed '1,2d'
    else
        echo "❌ Não foi possível acessar o banco de dados"
    fi
else
    echo "❌ DATABASE_URL não configurada"
fi

# 4. Verificar webhook
echo ""
echo "4. Verificando configuração do webhook..."
echo "----------------------------------------"

if [ -n "$EVOLUTION_WEBHOOK_SECRET" ]; then
    # Construir URL do webhook
    if [ -n "$VERCEL_URL" ]; then
        WEBHOOK_URL="$VERCEL_URL/api/webhook/evolution?secret=$EVOLUTION_WEBHOOK_SECRET"
    elif [ -n "$NEXT_PUBLIC_APP_URL" ]; then
        WEBHOOK_URL="$NEXT_PUBLIC_APP_URL/api/webhook/evolution?secret=$EVOLUTION_WEBHOOK_SECRET"
    else
        WEBHOOK_URL="https://seu-domain.com/api/webhook/evolution?secret=$EVOLUTION_WEBHOOK_SECRET"
    fi

    echo "✅ Webhook URL: $WEBHOOK_URL"

    # Testar se o webhook está acessível
    WEBHOOK_TEST=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "secret: $EVOLUTION_WEBHOOK_SECRET" \
        -d '{"test": true}' \
        -w "%{http_code}" \
        "$WEBHOOK_URL/api/webhook/evolution?secret=$EVOLUTION_WEBHOOK_SECRET" 2>/dev/null)

    if [ "${WEBHOOK_TEST: -3}" = "200" ]; then
        echo "✅ Webhook está acessível"
    else
        echo "❌ Webhook não está acessível (retornou: ${WEBHOOK_TEST: -3})"
    fi
else
    echo "❌ EVOLUTION_WEBHOOK_SECRET não configurada"
fi

# 5. Verificar logs recentes
echo ""
echo "5. Verificando logs recentes..."
echo "------------------------------"

# Verificar logs do Next.js
if [ -d "logs" ]; then
    echo "📁 Logs encontrados em 'logs/'"
    ls -la logs/ 2>/dev/null | head -10
elif [ -f ".next/logs/combined.log" ]; then
    echo "📁 Logs do Next.js encontrados"
    tail -n 20 .next/logs/combined.log 2>/dev/null
else
    echo "ℹ️  Nenhum log encontrado diretamente"
    echo "   Verifique os logs do seu servidor (PM2, systemd, etc)"
fi

echo ""
echo "🎯 Próximos passos:"
echo "1. Se a API Evolution não está acessível, verifique o URL e a chave"
echo "2. Se nenhuma instância está conectada, crie uma nova instância"
echo "3. Se o webhook não está acessível, verifique o domínio e SSL"
echo "4. Verifique os logs para erros específicos"