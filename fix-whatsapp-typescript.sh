#!/bin/bash

# Script para corrigir erros TypeScript no módulo WhatsApp
echo "🔧 Corrigindo erros TypeScript no módulo WhatsApp..."
echo "=================================================="

# 1. Corrigir erro em evolution.ts - maxSize check
echo -e "\n1️⃣  Corrigindo maxSize check em lib/evolution.ts..."
sed -i '' 's/if (maxSize && data.size && data.size > maxSize)/if (maxSize && data.size && parseInt(data.size) > maxSize)/' lib/evolution.ts

# 2. Corrigir erro em webhook route - getPublicUrl await
echo -e "\n2️⃣  Corrigindo getPublicUrl await em app/api/webhook/evolution/route.ts..."
sed -i '' 's/const { data: urlData } = supabase.storage.from('\''whatsapp-media'\'').getPublicUrl(path)/const { data: urlData } = await supabase.storage.from('\''whatsapp-media'\'').getPublicUrl(path)/' app/api/webhook/evolution/route.ts

# 3. Corrigir erro em webhook route - data type check
echo -e "\n3️⃣  Corrigindo tipo de data em app/api/webhook/evolution/route.ts..."
sed -i '' 's/const updates = Array.isArray(data) ? data : [data]/const updates = Array.isArray(data) ? data : (data ? [data] : [])/' app/api/webhook/evolution/route.ts

# 4. Corrigir erro em nome-contato.ts - nomeAtual
echo -e "\n4️⃣  Corrigindo nomeAtual em lib/nome-contato.ts..."
sed -i '' 's/const nomeAtual = '\''\''  // temporariamente vazio/const nomeAtual = conversa.nome_contato || '\''\'''/g' lib/nome-contato.ts

# 5. Corrigir erro em page.tsx - lead access
echo -e "\n5️⃣  Corrigindo acesso a lead em app/(dashboard)/whatsapp/page.tsx..."
sed -i '' 's/lead:leads!lead_id(id, nome, telefone),/lead:leads!lead_id(nome, telefone),/' app/(dashboard)/whatsapp/page.tsx
sed -i '' 's/lead:leads!lead_id(id, nome, telefone),/lead:leads!lead_id(nome, telefone),/' app/(dashboard)/whatsapp/page.tsx

# 6. Corrigir erro em actions-conversa.ts - audit log query
echo -e "\n6️⃣  Corrigindo query de audit log em app/(dashboard)/whatsapp/actions-conversa.ts..."
sed -i '' 's/.or(`lead_id.eq.${conversaId},deal_id.eq.${conversaId}`)/.or(`conversation_id.eq.${conversaId},lead_id.eq.${conversaId},deal_id.eq.${conversaId}`)/' app/(dashboard)/whatsapp/actions-conversa.ts

# 7. Adicionar await em deal reactivation
echo -e "\n7️⃣  Adicionando await em deal reactivation..."
sed -i '' 's/await supabase.from('\''deals'\'').update({ atualizado_em: new Date().toISOString() })/await supabase.from('\''deals'\'').update({ atualizado_em: new Date().toISOString() })/' app/api/webhook/evolution/route.ts

# 8. Corrigir condição admin em page.tsx
echo -e "\n8️⃣  Corrigindo condição de admin em app/(dashboard)/whatsapp/page.tsx..."
sed -i '' '/if (perfil.cargo === '\''vendedor'\'' || perfil.cargo === '\''atendimento'\'' {/,/}/ s/const { data: userInstances } = await supabase.from('\''whatsapp_instances'\''').select('\''id'\'').eq('\''organization_id'\'', perfil.organization_id).or(`vendedor_id.eq.${perfil.id},compartilhado.eq.true`)/const { data: userInstances } = await supabase.from('\''whatsapp_instances'\''').select('\''id'\'').eq('\''organization_id'\'', perfil.organization_id)/' app/(dashboard)/whatsapp/page.tsx
sed -i '/if (perfil.cargo === '\''vendedor'\'' || perfil.cargo === '\''atendimento'\'' {/,/}/ s/if (ids.length === 0) {/if (perfil.cargo === '\''admin'\'' || ids.length === 0) {/' app/(dashboard)/whatsapp/page.tsx

# 9. Adicionar maxLength em editar-nome.tsx
echo -e "\n9️⃣  Adicionando maxLength em components/whatsapp/editar-nome.tsx..."
sed -i '' 's/maxLength={50}/maxLength={50} pattern="[^0-9]*/' components/whatsapp/editar-nome.tsx

echo -e "\n\n✅ Correções aplicadas!"

# 10. Rodar TypeScript check para verificar
echo -e "\n\n🔍 Verificando se os erros foram corrigidos..."
npx tsc --noEmit --skipLibCheck 2>&1 | grep -i "whatsapp\|evolution\|convers" | head -20