#!/usr/bin/env bash
# DEC-023 · Fatia 0 · Etapa 8B.2 — Dry-run em Postgres EFÊMERO da migration 074
# (communication_persistir_mensagem). Valida persistência de domínio idempotente.
# NUNCA conecta em HUB DEV/produção — cluster descartável local.
set -u
FAIL=0
BASE="$(mktemp -d /tmp/pgpers.XXXXXX)"; DATA="$BASE/data"; PORT=55441; LOG="$BASE/log"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cleanup(){ pg_ctl -D "$DATA" stop -m immediate >/dev/null 2>&1; rm -rf "$BASE"; echo "== ambiente efêmero descartado =="; }
trap cleanup EXIT
initdb -D "$DATA" -U postgres --auth=trust --encoding=UTF8 --locale=C >/dev/null 2>&1 || { echo "FALHA initdb"; exit 1; }
pg_ctl -D "$DATA" -l "$LOG" -o "-k $BASE -p $PORT -c listen_addresses=''" -w start >/dev/null 2>&1 || { echo "FALHA start"; cat "$LOG"; exit 1; }
Q(){ psql -h "$BASE" -p "$PORT" -U postgres -d postgres -tA "$@"; }
check(){ if [ "$2" = "$3" ]; then echo "  ✅ $1 (=$3)"; else echo "  ❌ $1 esperado=$2 obtido=$3"; FAIL=1; fi; }
RPC(){ Q -c "SELECT communication_persistir_mensagem('cloud_api','$1','wa1','5511999998888','Fulano','$2','$3','$4',$5);"; }

echo "== stubs + migrations 072/074 + conta =="
Q -v ON_ERROR_STOP=1 -q <<'SQL'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS hubs(id uuid PRIMARY KEY DEFAULT uuid_generate_v4());
CREATE TABLE IF NOT EXISTS organizations(id uuid PRIMARY KEY DEFAULT uuid_generate_v4());
CREATE TABLE IF NOT EXISTS contacts(id uuid PRIMARY KEY DEFAULT uuid_generate_v4());
CREATE TABLE IF NOT EXISTS profiles(id uuid PRIMARY KEY DEFAULT uuid_generate_v4());
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';
CREATE OR REPLACE FUNCTION get_hub_id() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';
CREATE OR REPLACE FUNCTION get_organization_id() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';
SQL
Q -v ON_ERROR_STOP=1 -q -f "$REPO/supabase/migrations/072_mensageria_communication.sql" >/dev/null 2>&1 || { echo "FALHA 072"; exit 1; }
Q -v ON_ERROR_STOP=1 -q -f "$REPO/supabase/migrations/074_mensageria_persistir_mensagem.sql" >/dev/null 2>&1 || { echo "FALHA 074"; exit 1; }
Q -v ON_ERROR_STOP=1 -q -c "INSERT INTO hubs DEFAULT VALUES;" \
  -c "INSERT INTO communication_accounts(hub_id, channel, provider, external_account_id) SELECT id,'whatsapp','cloud_api','PNID1' FROM hubs LIMIT 1;" >/dev/null

echo "== Teste A: conta inexistente =="
RA=$(RPC 'NOPE' 'texto' 'oi' 'wamid.x' 'NULL')
check "retorna conta_nao_encontrada" "conta_nao_encontrada" "$RA"
check "nenhuma identity criada" "0" "$(Q -c "SELECT count(*) FROM communication_channel_identities;")"
check "nenhuma conversation criada" "0" "$(Q -c "SELECT count(*) FROM communication_conversations;")"
check "nenhuma message criada" "0" "$(Q -c "SELECT count(*) FROM communication_messages;")"

echo "== Teste B: conta encontrada, 1ª mensagem =="
RB=$(RPC 'PNID1' 'texto' 'oi' 'wamid.1' "'2026-07-06T10:00:00Z'")
check "retorna criada" "criada" "$RB"
check "identity (1)" "1" "$(Q -c "SELECT count(*) FROM communication_channel_identities;")"
check "conversation (1)" "1" "$(Q -c "SELECT count(*) FROM communication_conversations;")"
check "participant externo (1)" "1" "$(Q -c "SELECT count(*) FROM communication_conversation_participants WHERE tipo='externo';")"
check "message inbound/texto/corpo (1)" "1" "$(Q -c "SELECT count(*) FROM communication_messages WHERE direction='inbound' AND tipo='texto' AND corpo='oi';")"
check "message_event recebida (1)" "1" "$(Q -c "SELECT count(*) FROM communication_message_events WHERE evento='recebida';")"
check "sender_participant_id = participante externo" "t" "$(Q -c "SELECT (m.sender_participant_id = p.id) FROM communication_messages m JOIN communication_conversation_participants p ON p.id = m.sender_participant_id LIMIT 1;")"
check "unread_count = 1" "1" "$(Q -c "SELECT unread_count FROM communication_conversations LIMIT 1;")"
check "last_message_at setado" "t" "$(Q -c "SELECT (last_message_at IS NOT NULL) FROM communication_conversations LIMIT 1;")"
check "attachments = 0" "0" "$(Q -c "SELECT count(*) FROM communication_message_attachments;")"

echo "== Teste C: idempotência (mesmo provider_message_id) =="
RC=$(RPC 'PNID1' 'texto' 'oi' 'wamid.1' "'2026-07-06T10:00:00Z'")
check "retorna duplicada" "duplicada" "$RC"
check "messages continua 1" "1" "$(Q -c "SELECT count(*) FROM communication_messages;")"
check "unread continua 1 (sem reincremento)" "1" "$(Q -c "SELECT unread_count FROM communication_conversations LIMIT 1;")"
check "message_events continua 1" "1" "$(Q -c "SELECT count(*) FROM communication_message_events;")"

echo "== Teste D: 2ª mensagem (mesma conversa) =="
RD=$(RPC 'PNID1' 'texto' 'tudo bem?' 'wamid.2' "'2026-07-06T11:00:00Z'")
check "retorna criada" "criada" "$RD"
check "conversation continua 1" "1" "$(Q -c "SELECT count(*) FROM communication_conversations;")"
check "messages = 2" "2" "$(Q -c "SELECT count(*) FROM communication_messages;")"
check "unread = 2" "2" "$(Q -c "SELECT unread_count FROM communication_conversations LIMIT 1;")"
check "last_message_at = 11:00" "t" "$(Q -c "SELECT (last_message_at = '2026-07-06T11:00:00Z'::timestamptz) FROM communication_conversations LIMIT 1;")"

echo "== Teste E: mensagem fora de ordem (mais antiga) não regride last_message_at =="
RE=$(RPC 'PNID1' 'texto' 'msg antiga' 'wamid.3' "'2026-07-06T09:00:00Z'")
check "retorna criada" "criada" "$RE"
check "last_message_at permanece 11:00 (GREATEST)" "t" "$(Q -c "SELECT (last_message_at = '2026-07-06T11:00:00Z'::timestamptz) FROM communication_conversations LIMIT 1;")"
check "unread = 3" "3" "$(Q -c "SELECT unread_count FROM communication_conversations LIMIT 1;")"
check "attachments continua 0" "0" "$(Q -c "SELECT count(*) FROM communication_message_attachments;")"

echo
if [ "$FAIL" = "0" ]; then echo "RESULTADO: ✅ TODOS OS TESTES DE PERSISTÊNCIA (074) PASSARAM"; else echo "RESULTADO: ❌ HÁ FALHAS"; fi
exit $FAIL
