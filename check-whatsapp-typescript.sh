#!/bin/bash

# Script para identificar erros TypeScript no módulo WhatsApp
echo "🔍 Verificando erros TypeScript no módulo WhatsApp..."
echo "=================================================="

# 1. Executar TypeScript check com foco em WhatsApp
echo -e "\n1️⃣  Executando npx tsc --noEmit --skipLibCheck..."
npx tsc --noEmit --skipLibCheck 2>&1 | grep -i "whatsapp\|evolution\|convers" | head -50

echo -e "\n\n2️⃣  Buscando tipos any no código WhatsApp..."
find . -path "*/node_modules" -prune -o -name "*.ts" -o -name "*.tsx" | grep -E "(whatsapp|evolution)" | xargs grep -n "any\s*:" | head -20

echo -e "\n\n3️⃣  Buscando @ts-ignore no código..."
find . -path "*/node_modules" -prune -o -name "*.ts" -o -name "*.tsx" | xargs grep -n "@ts-ignore" | head -20

echo -e "\n\n4️⃣  Verificando imports faltantes..."
find . -path "*/node_modules" -prune -o -name "*.ts" -o -name "*.tsx" | grep -E "(whatsapp|evolution)" | xargs grep -n "from.*whatsapp" | grep -v "whatsapp-utils\|evolution\|nome-contato" | head -10

echo -e "\n\n5️⃣  Verificando funções async/await..."
find . -path "*/node_modules" -prune -o -name "*.ts" -o -name "*.tsx" | grep -E "(whatsapp|evolution)" | xargs grep -n "async.*=>" | grep -v "await" | head -10

echo -e "\n\n6️⃣  Buscando variáveis não tipadas..."
find . -path "*/node_modules" -prune -o -name "*.ts" -o -name "*.tsx" | grep -E "(whatsapp|evolution)" | xargs grep -n "const.*=" | grep -E "(conversa|instancia|mensagem)" | grep -v ":" | head -10

echo -e "\n\n✅ Verificação concluída!"