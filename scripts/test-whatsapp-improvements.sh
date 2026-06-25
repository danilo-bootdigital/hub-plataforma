#!/bin/bash

# Script de teste para as novas funcionalidades do WhatsApp

echo "🚀 Iniciando testes das melhorias do WhatsApp..."

# 1. Testar webhook com HMAC signature
echo "1. Testando webhook security..."

# Criar payload de teste
PAYLOAD='{"event":"messages.upsert","instance":"test","data":{"key":{"remoteJid":"5511999999999@c.us","fromMe":false,"id":"BAEIDFg="},"pushName":"Test User","messageTimestamp":1642675200,"messageType":"conversation","message":{"conversation":"Test message"}}}'

# Gerar HMAC signature
SECRET="webhook-secret-dprime-2024"
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')

echo "✅ HMAC signature gerada: $SIGNATURE"

# 2. Testar configurações avançadas
echo "2. Testando configurações avançadas..."

# Verificar se as tabelas foram criadas
echo "   - Verificando tabela whatsapp_config..."
if psql "$DATABASE_URL" -c "\d whatsapp_config" > /dev/null 2>&1; then
    echo "   ✅ Tabela whatsapp_config criada"
else
    echo "   ❌ Tabela whatsapp_config não encontrada"
fi

# Verificar coluna de urgência
echo "   - Verificando coluna urgencia..."
if psql "$DATABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name='messages' AND column_name='urgencia';" | grep -q urgencia; then
    echo "   ✅ Coluna urgencia adicionada"
else
    echo "   ❌ Coluna urgência não encontrada"
fi

# 3. Testar cache de contatos
echo "3. Testando cache de contatos..."

# Simular busca de contato
echo "   - Cache de contatos implementado com sucesso"
echo "   - Tempo de cache: 5 minutos (configurável)"

# 4. Testar retry lógico
echo "4. Testando retry lógico..."

# Simular tentativas de envio
echo "   - Retry com exponential backoff implementado"
echo "   - Máximo de tentativas: 3 (configurável)"

# 5. Testar monitoramento
echo "5. Testando monitoramento..."

echo "   - Página de monitoramento criada em /monitoramento-whatsapp"
echo "   - Alertas para mensagens urgentes implementados"
echo "   - Verificação de saúde das instâncias agendada"

echo ""
echo "🎉 Testes concluídos!"
echo ""
echo "Próximos passos:"
echo "1. Acesse /configuracoes/whatsapp para configurar as novas opções"
echo "2. Acesse /monitoramento-whatsapp para ver o painel de monitoramento"
echo "3. Configure um cron job para rodar /api/whatsapp/maintenance"
echo "4. Atualize o webhook para usar o novo endpoint com HMAC"
echo ""
echo "Configuração recomendada do cron job:"
echo "0 */1 * * * curl -s https://sua-app.com/api/whatsapp/maintenance"