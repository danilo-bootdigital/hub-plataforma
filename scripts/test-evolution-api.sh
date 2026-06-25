#!/bin/bash

# Script de teste para a Evolution API
echo "🚀 Testando conexão com a Evolution API"
echo "====================================="

# Verificar variáveis de ambiente
echo ""
echo "1. Verificando variáveis de ambiente..."
echo "----------------------------------------"

if [ -z "$EVOLUTION_API_URL" ]; then
    echo "❌ EVOLUTION_API_URL não configurada"
    exit 1
else
    echo "✅ EVOLUTION_API_URL: $EVOLUTION_API_URL"
fi

if [ -z "$EVOLUTION_API_KEY" ]; then
    echo "❌ EVOLUTION_API_KEY não configurada"
    exit 1
else
    echo "✅ EVOLUTION_API_KEY: [***]"
fi

# Testar endpoint de status
echo ""
echo "2. Testando endpoint /api/status..."
echo "-----------------------------------"

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
    exit 1
fi

# Testar criação de instância
echo ""
echo "3. Testando criação de instância..."
echo "-----------------------------------"

# Gerar nome de instância único
INSTANCE_NAME="test-$(date +%s)"

# Criar instância
CREATE_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "apikey: $EVOLUTION_API_KEY" \
    -w "%{http_code}" \
    "$EVOLUTION_API_URL/instance/create" \
    -d "{
        \"instanceName\": \"$INSTANCE_NAME\",
        \"qrcode\": true,
        \"integration\": \"WHATSAPP-BAILEYS\",
        \"webhook\": {
            \"url\": \"https://test.com/webhook\",
            \"events\": [\"MESSAGES_UPSERT\"]
        }
    }" 2>/dev/null)

CREATE_HTTP_CODE="${CREATE_RESPONSE: -3}"
CREATE_BODY="${CREATE_RESPONSE%???}"

if [ "$CREATE_HTTP_CODE" = "200" ] || [ "$CREATE_HTTP_CODE" = "201" ]; then
    echo "✅ Instância criada com sucesso"
    echo "   Nome: $INSTANCE_NAME"

    # Tentar obter QR code
    echo ""
    echo "4. Testando obtenção de QR code..."
    echo "---------------------------------"

    QR_RESPONSE=$(curl -s -X GET \
        -H "Content-Type: application/json" \
        -H "apikey: $EVOLUTION_API_KEY" \
        -w "%{http_code}" \
        "$EVOLUTION_API_URL/instance/connect/$INSTANCE_NAME" 2>/dev/null)

    QR_HTTP_CODE="${QR_RESPONSE: -3}"
    QR_BODY="${QR_RESPONSE%???}"

    if [ "$QR_HTTP_CODE" = "200" ]; then
        echo "✅ QR code obtido com sucesso"
        # Extrair base64 da resposta
        BASE64=$(echo "$QR_BODY" | grep -o '"base64":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$BASE64" ]; then
            echo "   QR code: [***]"
        fi
    else
        echo "⚠️  Não foi possível obter QR code: $QR_HTTP_CODE"
        echo "   Resposta: $QR_BODY"
    fi

    # Deletar instância de teste
    echo ""
    echo "5. Limpando instância de teste..."
    echo "--------------------------------"

    DELETE_RESPONSE=$(curl -s -X DELETE \
        -H "Content-Type: application/json" \
        -H "apikey: $EVOLUTION_API_KEY" \
        -w "%{http_code}" \
        "$EVOLUTION_API_URL/instance/delete/$INSTANCE_NAME" 2>/dev/null)

    DELETE_HTTP_CODE="${DELETE_RESPONSE: -3}"

    if [ "$DELETE_HTTP_CODE" = "200" ] || [ "$DELETE_HTTP_CODE" = "204" ]; then
        echo "✅ Instância de teste deletada"
    else
        echo "⚠️  Não foi possível deletar instância de teste: $DELETE_HTTP_CODE"
    fi

else
    echo "❌ Falha ao criar instância: $CREATE_HTTP_CODE"
    echo "   Resposta: $CREATE_BODY"
    exit 1
fi

echo ""
echo "🎉 Teste concluído com sucesso!"
echo ""
echo "Próximos passos:"
echo "1. Verifique se as variáveis de ambiente estão configuradas no seu .env.local"
echo "2. Acesse /configuracoes-whatsapp para criar instâncias"
echo "3. Use o script diagnose-whatsapp.sh para monitoramento contínuo"