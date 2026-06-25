# Solução de Conexão WhatsApp - Guia Rápido

## 📋 Resumo das Implementações

Para resolver o problema de conexão do WhatsApp, implementamos um sistema completo de gerenciamento e monitoramento:

### 1. **Páginas de Configuração e Monitoramento**
- `/configuracoes-whatsapp` - Página principal para gerenciar instâncias
- `/monitoramento-whatsapp` - Dashboard em tempo real
- Links diretos na página de WhatsApp para acesso rápido

### 2. **Componentes Novos**
- `WhatsAppInstanceManager` - Gerencia criação, conexão e exclusão de instâncias
- `WhatsAppMonitor` - Monitora status, estatísticas e saúde do sistema
- Interface amigável com QR codes em tempo real

### 3. **Scripts de Diagnóstico**
- `diagnose-whatsapp.sh` - Verifica configurações, API, banco e webhooks
- `test-evolution-api.sh` - Testa integração completa com a Evolution API

## 🔧 Passos para Conectar o WhatsApp

### 1. **Configurar Variáveis de Ambiente**
No arquivo `.env.local`:
```bash
EVOLUTION_API_URL=https://api.evolution-api.com
EVOLUTION_API_KEY=sua-chave-api-aqui
EVOLUTION_WEBHOOK_SECRET=seu-secret-aqui
```

### 2. **Testar a Conexão**
```bash
# Rodar o script de diagnóstico
./scripts/diagnose-whatsapp.sh

# Testar API Evolution
./scripts/test-evolution-api.sh
```

### 3. **Criar Instância**
1. Acesse `/configuracoes-whatsapp`
2. Clique em "Criar Nova Instância"
3. Dê um nome (ex: "WhatsApp Principal")
4. O sistema gera automaticamente o webhook
5. Clique em "QR Code" para conectar

### 4. **Conectar via WhatsApp**
1. Abre o WhatsApp no seu celular
2. Vá em Configurações > Dispositivos Vinculados
3. Clique em "Vincular Dispositivo"
4. Escaneie o QR code da tela
5. Aguarde a conexão (status muda para "Conectado")

## 🚨 Problemas Comuns e Soluções

### 1. **QR Code não aparece**
- Verifique se a API Evolution está online
- Confira se a chave API está correta
- Teste com `./scripts/test-evolution-api.sh`

### 2. **Instância fica "Aguardando QR"**
- A instância expira após 60 segundos
- Crie uma nova instância
- Verifique se o celular tem internet

### 3. **Mensagens não são recebidas**
- Confira se o webhook está acessível
- Verifique o domínio (HTTPS obrigatório)
- Teste o webhook manualmente

### 4. **Erro de autenticação**
- Verifique `EVOLUTION_WEBHOOK_SECRET`
- O webhook deve incluir o parâmetro `secret`

## 📊 Monitoramento

### Status das Instâncias
- **Conectado** - WhatsApp online
- **Aguardando QR** - QR code gerado
- **Desconectado** - Sem conexão

### Métricas Disponíveis
- Mensagens enviadas/recebidas
- Taxa de entrega
- Erros e falhas
- Status do webhook

## 🔍 Logs e Debug

### Verificar logs do sistema
```bash
# Logs do Next.js
tail -f .next/logs/combined.log

# Logs do banco (se usando PostgreSQL)
psql $DATABASE_URL -c "SELECT * FROM messages ORDER BY created_at DESC LIMIT 10;"
```

### Webhook Test
```bash
# Testar webhook manualmente
curl -X POST https://seu-dom.com/api/webhook/evolution?secret=SEU_SECRET \
  -H "Content-Type: application/json" \
  -d '{"event":"test","instance":"test","data":{"test":true}}'
```

## 🛠️ Manutenção

### Limpeza de instâncias expiradas
As instâncias com status "aguardando_qr" por mais de 5 minutos devem ser deletadas e recriadas.

### Backup de configurações
As configurações são salvas no banco de dados na tabela `whatsapp_config`.

## 📞 Suporte

Se continuar tendo problemas:
1. Execute o script de diagnóstico
2. Verifique os logs
3. Confirme todas as variáveis de ambiente
4. Teste a API Evolution isoladamente

---

*Este guia foi criado para ajudar a resolver problemas de conexão com o WhatsApp Integration.*