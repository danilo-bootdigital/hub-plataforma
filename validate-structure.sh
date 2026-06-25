#!/bin/bash

echo "🔍 Validando estrutura do CRM..."

# Verificar arquivos de configuração
echo "1️⃣ Verificando arquivos de configuração..."
if [ -f "next.config.js" ]; then
    echo "❌ next.config.js existe - conflito com next.config.ts"
    rm next.config.js
    echo "✅ Arquivo removido"
fi

if [ -f "types/crm-system.ts" ]; then
    echo "❌ types/crm-system.ts existe - conflito com types/database.ts"
    rm types/crm-system.ts
    echo "✅ Arquivo removido"
fi

# Verificar Dockerfile
echo "2️⃣ Verificando Dockerfile..."
if grep -q "NEXT_PUBLIC_SUPABASE_URL" Dockerfile; then
    echo "❌ Credenciais hardcoded no Dockerfile"
    echo "💡 Use variáveis de ambiente em vez de valores fixos"
fi

# Verificar TypeScript
echo "3️⃣ Verificando erros de TypeScript..."
npx tsc --noEmit --skipLibCheck 2>&1 | grep -E "error|Error" | head -10

# Verificar dependências
echo "4️⃣ Verificando dependências..."
npm audit --audit-level moderate

# Verificar estrutura de pastas
echo "5️⃣ Verificando estrutura de pastas..."
required_dirs=("app" "components" "lib" "types" "supabase")
for dir in "${required_dirs[@]}"; do
    if [ ! -d "$dir" ]; then
        echo "❌ Pasta $dir não existe"
    fi
done

echo "✅ Validação concluída!"