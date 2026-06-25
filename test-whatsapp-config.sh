#!/bin/bash

# Script para testar a página de configurações WhatsApp em modo de produção
echo "🔍 Testando página /configuracoes/whatsapp..."

# 1. Buildar o projeto
echo "1. Buildando o projeto..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build falhou"
    exit 1
fi
echo "✅ Build concluído"

# 2. Iniciar servidor de produção
echo "2. Iniciando servidor de produção..."
npm start > server.log 2>&1 &
SERVER_PID=$!
echo "Servidor iniciado com PID: $SERVER_PID"

# 3. Aguardar o servidor subir
echo "3. Aguardando servidor subir..."
sleep 10

# 4. Testar a página
echo "4. Testando a página..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/configuracoes/whatsapp)

if [ "$RESPONSE" = "200" ]; then
    echo "✅ Página acessível (200 OK)"
elif [ "$RESPONSE" = "307" ]; then
    echo "⚠️  Página redireciona para login (comportamento normal)"
else
    echo "❌ Página retornou erro: $RESPONSE"
fi

# 5. Verificar logs do servidor
echo "5. Verificando logs do servidor..."
if [ -f "server.log" ]; then
    echo "Últimos 20 logs:"
    tail -20 server.log
fi

# 6. Parar servidor
echo "6. Parando servidor..."
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null
echo "✅ Servidor parado"

# 7. Verificar se há erros no console do navegador (simulado)
echo "7. Analisando possíveis erros..."
if grep -i "error\|failed\|exception" server.log 2>/dev/null; then
    echo "⚠️  Possíveis erros encontrados:"
    grep -i "error\|failed\|exception" server.log
else
    echo "✅ Nenhum erro crítico encontrado nos logs"
fi