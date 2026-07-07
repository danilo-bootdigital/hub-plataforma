#!/usr/bin/env bash
# DEC-023 · E9.1 — Dry-run em Postgres EFÊMERO da migration 076 (envio outbound).
# Valida communication_registrar_envio / confirmar_envio / registrar_falha,
# idempotência por idempotency_key, guardas de status e grants.
# NUNCA conecta em HUB DEV/produção — cluster descartável local.
set -u
FAIL=0
BASE="$(mktemp -d /tmp/pgenvio.XXXXXX)"; DATA="$BASE/data"; PORT=55447; LOG="$BASE/log"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cleanup(){ pg_ctl -D "$DATA" stop -m immediate >/dev/null 2>&1; rm -rf "$BASE"; echo "== ambiente efêmero descartado =="; }
trap cleanup EXIT
initdb -D "$DATA" -U postgres --auth=trust --encoding=UTF8 --locale=C >/dev/null 2>&1 || { echo "FALHA initdb"; exit 1; }
pg_ctl -D "$DATA" -l "$LOG" -o "-k $BASE -p $PORT -c listen_addresses=''" -w start >/dev/null 2>&1 || { echo "FALHA start"; cat "$LOG"; exit 1; }
Q(){ psql -h "$BASE" -p "$PORT" -U postgres -d postgres -tA "$@"; }
check(){ if [ "$2" = "$3" ]; then echo "  ✅ $1 (=$3)"; else echo "  ❌ $1 esperado=$2 obtido=$3"; FAIL=1; fi; }

echo "== stubs + migrations 072/074/076 + conta + conversa (via inbound 074) =="
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
for m in 072_mensageria_communication 074_mensageria_persistir_mensagem 076_mensageria_envio; do
  Q -v ON_ERROR_STOP=1 -q -f "$REPO/supabase/migrations/$m.sql" >/dev/null 2>&1 || { echo "FALHA $m"; Q -v ON_ERROR_STOP=1 -f "$REPO/supabase/migrations/$m.sql" 2>&1 | tail; exit 1; }
  echo "  ✅ $m"
done
Q -v ON_ERROR_STOP=1 -q -c "INSERT INTO hubs DEFAULT VALUES;" \
  -c "INSERT INTO communication_accounts(hub_id, channel, provider, external_account_id) SELECT id,'whatsapp','cloud_api','PNID1' FROM hubs LIMIT 1;" >/dev/null
# cria a conversa a partir de um inbound real (074), como no fluxo de produção.
# No Cloud API o external_user_id (wa_id) É o próprio telefone — refletimos isso.
Q -q -c "SELECT communication_persistir_mensagem('cloud_api','PNID1','5511999998888','5511999998888','Fulano','texto','oi','wamid.in.1','2026-07-06T10:00:00Z');" >/dev/null
CONV=$(Q -c "SELECT id FROM communication_conversations LIMIT 1;")
check "conversa criada pelo inbound" "t" "$([ -n "$CONV" ] && echo t || echo f)"
check "estado inicial: unread=1" "1" "$(Q -c "SELECT unread_count FROM communication_conversations WHERE id='$CONV';")"
check "estado inicial: status=novo" "novo" "$(Q -c "SELECT status FROM communication_conversations WHERE id='$CONV';")"

# helper: roda registrar_envio 1x e devolve campos do jsonb delimitados por |
ENVIO(){ Q -c "WITH r AS (SELECT communication_registrar_envio('$1','$2','$3') j) SELECT coalesce(j->>'ok','')||'|'||coalesce(j->>'ja_existia','')||'|'||coalesce(j->>'message_id','')||'|'||coalesce(j->>'provider','')||'|'||coalesce(j->>'account_external_id','')||'|'||coalesce(j->>'to','')||'|'||coalesce(j->>'motivo','') FROM r;"; }

echo "== Teste A: registrar_envio (nova mensagem outbound) =="
RA=$(ENVIO "$CONV" "Olá, seguem infos" "idem-A")
IFS='|' read -r A_OK A_JA A_MSG A_PROV A_ACC A_TO A_MOT <<EOF
$RA
EOF
check "ok=true" "true" "$A_OK"
check "ja_existia=false" "false" "$A_JA"
check "message_id retornado" "t" "$([ -n "$A_MSG" ] && echo t || echo f)"
check "provider=cloud_api" "cloud_api" "$A_PROV"
check "account_external_id=PNID1" "PNID1" "$A_ACC"
check "to=external_user_id (5511999998888)" "5511999998888" "$A_TO"
check "msg outbound enfileirada (1)" "1" "$(Q -c "SELECT count(*) FROM communication_messages WHERE direction='outbound' AND status='enfileirada' AND corpo='Olá, seguem infos';")"
check "idempotency_key gravada" "idem-A" "$(Q -c "SELECT idempotency_key FROM communication_messages WHERE id='$A_MSG';")"
check "message_event enfileirada (1)" "1" "$(Q -c "SELECT count(*) FROM communication_message_events WHERE evento='enfileirada';")"
check "unread zerado (0)" "0" "$(Q -c "SELECT unread_count FROM communication_conversations WHERE id='$CONV';")"
check "status novo→em_atendimento" "em_atendimento" "$(Q -c "SELECT status FROM communication_conversations WHERE id='$CONV';")"
check "last_message_at setado" "t" "$(Q -c "SELECT (last_message_at IS NOT NULL) FROM communication_conversations WHERE id='$CONV';")"

echo "== Teste B: idempotência (replay mesma idempotency_key) =="
RB=$(ENVIO "$CONV" "Olá, seguem infos" "idem-A")
IFS='|' read -r B_OK B_JA B_MSG _ _ _ _ <<EOF
$RB
EOF
check "ok=true" "true" "$B_OK"
check "ja_existia=true" "true" "$B_JA"
check "message_id = o mesmo do A" "$A_MSG" "$B_MSG"
check "outbound continua 1 (sem duplicar)" "1" "$(Q -c "SELECT count(*) FROM communication_messages WHERE direction='outbound';")"
check "message_event enfileirada continua 1" "1" "$(Q -c "SELECT count(*) FROM communication_message_events WHERE evento='enfileirada';")"

echo "== Teste C: confirmar_envio (resposta da Meta com wamid) =="
Q -q -c "SELECT communication_confirmar_envio('$A_MSG','wamid.out.1');" >/dev/null
check "status enfileirada→enviada" "enviada" "$(Q -c "SELECT status FROM communication_messages WHERE id='$A_MSG';")"
check "provider_message_id gravado" "wamid.out.1" "$(Q -c "SELECT provider_message_id FROM communication_messages WHERE id='$A_MSG';")"
check "enviada_em setado" "t" "$(Q -c "SELECT (enviada_em IS NOT NULL) FROM communication_messages WHERE id='$A_MSG';")"
check "message_event enviada (1)" "1" "$(Q -c "SELECT count(*) FROM communication_message_events WHERE evento='enviada';")"

echo "== Teste D: confirmar_envio é idempotente/guardado (não reaplica em 'enviada') =="
Q -q -c "SELECT communication_confirmar_envio('$A_MSG','wamid.out.OUTRO');" >/dev/null
check "provider_message_id inalterado" "wamid.out.1" "$(Q -c "SELECT provider_message_id FROM communication_messages WHERE id='$A_MSG';")"
check "message_event enviada continua 1" "1" "$(Q -c "SELECT count(*) FROM communication_message_events WHERE evento='enviada';")"

echo "== Teste E: registrar_falha não afeta mensagem já 'enviada' (guarda) =="
Q -q -c "SELECT communication_registrar_falha('$A_MSG','deveria ser ignorado');" >/dev/null
check "status permanece enviada" "enviada" "$(Q -c "SELECT status FROM communication_messages WHERE id='$A_MSG';")"
check "nenhum event de falha" "0" "$(Q -c "SELECT count(*) FROM communication_message_events WHERE evento='falha';")"

echo "== Teste F: registrar_falha caminho feliz (nova outbound → falha) =="
RF=$(ENVIO "$CONV" "segunda mensagem" "idem-F")
IFS='|' read -r _ _ F_MSG _ _ _ _ <<EOF
$RF
EOF
Q -q -c "SELECT communication_registrar_falha('$F_MSG','token expirado');" >/dev/null
check "status enfileirada→falha" "falha" "$(Q -c "SELECT status FROM communication_messages WHERE id='$F_MSG';")"
check "message_event falha (1)" "1" "$(Q -c "SELECT count(*) FROM communication_message_events WHERE evento='falha';")"
check "erro registrado no event" "token expirado" "$(Q -c "SELECT erro FROM communication_message_events WHERE evento='falha' LIMIT 1;")"
Q -q -c "SELECT communication_confirmar_envio('$F_MSG','wamid.x');" >/dev/null
check "confirmar_envio não ressuscita 'falha'" "falha" "$(Q -c "SELECT status FROM communication_messages WHERE id='$F_MSG';")"

echo "== Teste G: conversa inexistente =="
RG=$(ENVIO "00000000-0000-0000-0000-000000000000" "oi" "idem-G")
IFS='|' read -r G_OK _ _ _ _ _ G_MOT <<EOF
$RG
EOF
check "ok=false" "false" "$G_OK"
check "motivo=conversa_nao_encontrada" "conversa_nao_encontrada" "$G_MOT"
check "nenhuma outbound extra criada por G" "2" "$(Q -c "SELECT count(*) FROM communication_messages WHERE direction='outbound';")"

echo "== Teste H: grants — só service_role executa (padrão 075) =="
check "registrar_envio sem EXECUTE p/ PUBLIC" "f" "$(Q -c "SELECT has_function_privilege('public','communication_registrar_envio(uuid,text,text)','EXECUTE');")"
check "confirmar_envio sem EXECUTE p/ PUBLIC" "f" "$(Q -c "SELECT has_function_privilege('public','communication_confirmar_envio(uuid,text)','EXECUTE');")"
check "registrar_falha sem EXECUTE p/ PUBLIC" "f" "$(Q -c "SELECT has_function_privilege('public','communication_registrar_falha(uuid,text)','EXECUTE');")"

echo "== Teste I: índice único parcial de idempotência existe =="
check "uq_comm_msg_idempotency criado" "1" "$(Q -c "SELECT count(*) FROM pg_indexes WHERE indexname='uq_comm_msg_idempotency';")"
check "coluna idempotency_key existe" "1" "$(Q -c "SELECT count(*) FROM information_schema.columns WHERE table_name='communication_messages' AND column_name='idempotency_key';")"

echo
if [ "$FAIL" = "0" ]; then echo "RESULTADO: ✅ TODOS OS TESTES DE ENVIO (076) PASSARAM"; else echo "RESULTADO: ❌ HÁ FALHAS"; fi
exit $FAIL
