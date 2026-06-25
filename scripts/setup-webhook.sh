#!/bin/bash

# Script para configurar automaticamente o webhook na Evolution API
# Execute este script após o deploy ser concluído

echo "🔧 Configurando webhook na Evolution API..."
echo ""

# Configurações
PROJECT_URL="https://crm.dprimerepresentacao.com.br"
WEBHOOK_SECRET="webhook-secret-dprime-2024"
WEBHOOK_URL="$PROJECT_URL/api/webhook/evolution?secret=$WEBHOOK_SECRET"

# Função para fazer requisição à Evolution API
make_request() {
  local endpoint=$1
  local data=$2
  local method=${3:-"POST"}

  echo "Enviando requisição para: $endpoint"
  echo "Método: $method"
  echo "Dados: $data"

  response=$(curl -s -X "$method" \
    -H "Content-Type: application/json" \
    -H "apikey: $EVOLUTION_API_KEY" \
    -d "$data" \
    "$endpoint")

  echo "Resposta: $response"
  echo ""
}

# Verificar se as variáveis de ambiente estão configuradas
if [ -z "$EVOLUTION_API_KEY" ]; then
  echo "❌ EVOLUTION_API_KEY não configurado no ambiente"
  echo "Por favor, configure a variável de ambiente:"
  echo "  export EVOLUTION_API_KEY=DprimeEvo2024BootKey"
  exit 1
fi

# 1. Verificar se a Evolution API está acessível
echo "1. Verificando conexão com a Evolution API..."
EVOLUTION_BASE_URL="https://evolution.dprimerepresentacao.com.br"
STATUS_URL="$EVOLUTION_BASE_URL/api/status"

if make_request "$STATUS_URL" '{}' "GET"; then
  echo "✅ Evolution API acessível"
else
  echo "❌ Não foi possível conectar à Evolution API"
  exit 1
fi

# 2. Listar instâncias existentes
echo "2. Listando instâncias existentes..."
INSTANCES_URL="$EVOLUTION_BASE_URL/api/instances"

instances=$(make_request "$INSTANCES_URL" '{}' "GET")

# 3. Criar instância se não existir
INSTANCE_ID="boot-crm-$(date +%s)"

echo "3. Verificando se instância '$INSTANCE_ID' já existe..."
if echo "$instances" | grep -q "$INSTANCE_ID"; then
  echo "✅ Instância '$INSTANCE_ID' já existe"
else
  echo "Criando nova instância..."
  CREATE_INSTANCE_URL="$EVOLUTION_BASE_URL/api/create-instance"

  create_data='{
    "instanceName": "'$INSTANCE_ID'",
    "number": "5511999999999",
    "api_key": "'$EVOLUTION_API_KEY'"
  }'

  make_request "$CREATE_INSTANCE_URL" "$create_data"

  # Aguardar instância ser criada
  echo "Aguardando instância ser criada..."
  sleep 5
fi

# 4. Configurar webhook na instância
echo "4. Configurando webhook na instância '$INSTANCE_ID'..."
WEBHOOK_CONFIG_URL="$EVOLUTION_BASE_URL/api/webhook"

webhook_data='{
  "instance": "'$INSTANCE_ID'",
  "url": "'$WEBHOOK_URL'",
  "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "MESSAGES_UPDATE"],
  "secret": "'$WEBHOOK_SECRET'"
}'

make_request "$WEBHOOK_CONFIG_URL" "$webhook_data"

# 5. Verificar se o webhook foi configurado
echo "5. Verificando webhook configurado..."
WEBHOOK_CHECK_URL="$EVOLUTION_BASE_URL/api/webhook/$INSTANCE_ID"

make_request "$WEBHOOK_CHECK_URL" '{}' "GET"

# 6. Testar webhook
echo "6. Testando webhook..."
TEST_DATA='{
  "type": "test",
  "instance": "'$INSTANCE_ID'",
  "timestamp": "'$(date -Iseconds)'"
}'

make_request "$WEBHOOK_URL" "$TEST_DATA"

echo ""
echo "✅ Configuração do webhook concluída!"
echo ""
echo "📋 Resumo da configuração:"
echo "  URL do Webhook: $WEBHOOK_URL"
echo "  Instância: $INSTANCE_ID"
echo "  Eventos: MESSAGES_UPSERT, CONNECTION_UPDATE, MESSAGES_UPDATE"
echo ""
echo "🔧 Para testar:"
echo "1. Acesse $PROJECT_URL/configuracoes-whatsapp"
echo "2. Selecione a instância '$INSTANCE_ID'"
echo "3. Escaneie o QR code"
echo "4. Envie uma mensagem de teste"
echo ""
echo "📊 Para monitorar:"
echo "  Vercel Dashboard: Logs do webhook"
echo "  Evolution API: Painel de controle da instância"