#!/usr/bin/env bash
# DEC-023 · E9.4 — Dry-run em Postgres EFÊMERO da migration 077
# (communication_aplicar_status). Valida monotonicidade por estado, idempotência,
# guarda de direção, backfill de enviada_em, não-encontrada e grants.
# NUNCA conecta em HUB DEV/produção — cluster descartável local.
set -u
FAIL=0
BASE="$(mktemp -d /tmp/pgstatus.XXXXXX)"; DATA="$BASE/data"; PORT=55448; LOG="$BASE/log"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cleanup(){ pg_ctl -D "$DATA" stop -m immediate >/dev/null 2>&1; rm -rf "$BASE"; echo "== ambiente efêmero descartado =="; }
trap cleanup EXIT
initdb -D "$DATA" -U postgres --auth=trust --encoding=UTF8 --locale=C >/dev/null 2>&1 || { echo "FALHA initdb"; exit 1; }
pg_ctl -D "$DATA" -l "$LOG" -o "-k $BASE -p $PORT -c listen_addresses=''" -w start >/dev/null 2>&1 || { echo "FALHA start"; cat "$LOG"; exit 1; }
Q(){ psql -h "$BASE" -p "$PORT" -U postgres -d postgres -tA "$@"; }
check(){ if [ "$2" = "$3" ]; then echo "  ✅ $1 (=$3)"; else echo "  ❌ $1 esperado=$2 obtido=$3"; FAIL=1; fi; }

# aplica status e devolve resultado|status_anterior|status_novo
APLICA(){ Q -c "WITH r AS (SELECT communication_aplicar_status('cloud_api','$1','$2',$3,$4) j) SELECT coalesce(j->>'resultado','')||'|'||coalesce(j->>'status_anterior','')||'|'||coalesce(j->>'status_novo','') FROM r;"; }
EVCOUNT(){ Q -c "SELECT count(*) FROM communication_message_events e JOIN communication_messages m ON m.id=e.message_id WHERE m.provider_message_id='$1' AND e.evento='$2';"; }
MSTATUS(){ Q -c "SELECT status FROM communication_messages WHERE provider_message_id='$1';"; }

echo "== stubs + migrations 072/074/076/077 + conta + conversa + outbound enviada =="
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
for m in 072_mensageria_communication 074_mensageria_persistir_mensagem 076_mensageria_envio 077_mensageria_aplicar_status; do
  Q -v ON_ERROR_STOP=1 -q -f "$REPO/supabase/migrations/$m.sql" >/dev/null 2>&1 || { echo "FALHA $m"; Q -v ON_ERROR_STOP=1 -f "$REPO/supabase/migrations/$m.sql" 2>&1 | tail; exit 1; }
  echo "  ✅ $m"
done
Q -v ON_ERROR_STOP=1 -q -c "INSERT INTO hubs DEFAULT VALUES;" \
  -c "INSERT INTO communication_accounts(hub_id, channel, provider, external_account_id) SELECT id,'whatsapp','cloud_api','PNID1' FROM hubs LIMIT 1;" >/dev/null
# conversa via inbound; outbound via 076 e confirmação (status=enviada, wamid=wamid.A)
Q -q -c "SELECT communication_persistir_mensagem('cloud_api','PNID1','5511999998888','5511999998888','Fulano','texto','oi','wamid.in.1','2026-07-06T10:00:00Z');" >/dev/null
CONV=$(Q -c "SELECT id FROM communication_conversations LIMIT 1;")
MSG_A=$(Q -c "SELECT (communication_registrar_envio('$CONV','msg A','idem-A'))->>'message_id';")
Q -q -c "SELECT communication_confirmar_envio('$MSG_A','wamid.A');" >/dev/null
check "estado inicial da A: enviada" "enviada" "$(MSTATUS wamid.A)"

echo "== Teste 1: aplicado enviada→entregue =="
check "resultado" "aplicado|enviada|entregue" "$(APLICA 'wamid.A' 'entregue' 'NULL' "'2026-07-06T10:01:00Z'")"
check "status = entregue" "entregue" "$(MSTATUS wamid.A)"
check "1 event entregue" "1" "$(EVCOUNT wamid.A entregue)"

echo "== Teste 2: aplicado entregue→lida =="
check "resultado" "aplicado|entregue|lida" "$(APLICA 'wamid.A' 'lida' 'NULL' "'2026-07-06T10:02:00Z'")"
check "status = lida" "lida" "$(MSTATUS wamid.A)"
check "1 event lida" "1" "$(EVCOUNT wamid.A lida)"

echo "== Teste 3: regressão lida→entregue é ignorada =="
check "resultado" "ignorado_regressao|lida|lida" "$(APLICA 'wamid.A' 'entregue' 'NULL' 'NULL')"
check "status permanece lida" "lida" "$(MSTATUS wamid.A)"
check "event entregue continua 1 (sem novo)" "1" "$(EVCOUNT wamid.A entregue)"

echo "== Teste 4: duplicado lida→lida é no-op =="
check "resultado" "ignorado_duplicado|lida|lida" "$(APLICA 'wamid.A' 'lida' 'NULL' 'NULL')"
check "event lida continua 1" "1" "$(EVCOUNT wamid.A lida)"

echo "== Teste 5: falha após entregue/lida é ignorada =="
check "resultado" "ignorado_regressao|lida|lida" "$(APLICA 'wamid.A' 'falha' "'erro tardio'" 'NULL')"
check "status permanece lida" "lida" "$(MSTATUS wamid.A)"
check "nenhum event de falha na A" "0" "$(EVCOUNT wamid.A falha)"

echo "== Teste 6: falha válida (mensagem em enviada) =="
MSG_B=$(Q -c "SELECT (communication_registrar_envio('$CONV','msg B','idem-B'))->>'message_id';")
Q -q -c "SELECT communication_confirmar_envio('$MSG_B','wamid.B');" >/dev/null
check "resultado" "aplicado|enviada|falha" "$(APLICA 'wamid.B' 'falha' "'token expirado'" "'2026-07-06T10:05:00Z'")"
check "status = falha" "falha" "$(MSTATUS wamid.B)"
check "1 event falha" "1" "$(EVCOUNT wamid.B falha)"
check "erro gravado no event" "token expirado" "$(Q -c "SELECT e.erro FROM communication_message_events e JOIN communication_messages m ON m.id=e.message_id WHERE m.provider_message_id='wamid.B' AND e.evento='falha';")"

echo "== Teste 7: mensagem não encontrada =="
EVANTES=$(Q -c "SELECT count(*) FROM communication_message_events;")
check "resultado" "mensagem_nao_encontrada||" "$(APLICA 'wamid.INEXISTENTE' 'entregue' 'NULL' 'NULL')"
check "nenhum event criado" "$EVANTES" "$(Q -c "SELECT count(*) FROM communication_message_events;")"

echo "== Teste 8: backfill de enviada_em (confirmacao_falhou: enfileirada + wamid) =="
MSG_C=$(Q -c "SELECT (communication_registrar_envio('$CONV','msg C','idem-C'))->>'message_id';")
# simula envio sem confirmar: grava wamid mantendo status='enfileirada' e enviada_em NULL
Q -q -c "UPDATE communication_messages SET provider_message_id='wamid.C' WHERE id='$MSG_C';" >/dev/null
check "pré: enviada_em NULL" "t" "$(Q -c "SELECT (enviada_em IS NULL) FROM communication_messages WHERE id='$MSG_C';")"
check "resultado" "aplicado|enfileirada|entregue" "$(APLICA 'wamid.C' 'entregue' 'NULL' "'2026-07-06T10:07:00Z'")"
check "status = entregue" "entregue" "$(MSTATUS wamid.C)"
check "enviada_em backfilled (=ocorrido_em)" "t" "$(Q -c "SELECT (enviada_em = '2026-07-06T10:07:00Z'::timestamptz) FROM communication_messages WHERE id='$MSG_C';")"

echo "== Teste 9: guarda de direção (wamid inbound não é reconciliado) =="
check "resultado" "mensagem_nao_encontrada||" "$(APLICA 'wamid.in.1' 'entregue' 'NULL' 'NULL')"
check "inbound continua recebida" "recebida" "$(Q -c "SELECT status FROM communication_messages WHERE provider_message_id='wamid.in.1' AND direction='inbound';")"

echo "== Teste 10: duplicado enviada→enviada =="
MSG_D=$(Q -c "SELECT (communication_registrar_envio('$CONV','msg D','idem-D'))->>'message_id';")
Q -q -c "SELECT communication_confirmar_envio('$MSG_D','wamid.D');" >/dev/null
check "resultado" "ignorado_duplicado|enviada|enviada" "$(APLICA 'wamid.D' 'enviada' 'NULL' 'NULL')"
check "event enviada não duplica (1 do confirmar)" "1" "$(EVCOUNT wamid.D enviada)"

echo "== Teste 11: grants — só service_role executa (padrão 075) =="
check "aplicar_status sem EXECUTE p/ PUBLIC" "f" "$(Q -c "SELECT has_function_privilege('public','communication_aplicar_status(text,text,text,text,timestamptz)','EXECUTE');")"

echo
if [ "$FAIL" = "0" ]; then echo "RESULTADO: ✅ TODOS OS TESTES DE RECONCILIAÇÃO (077) PASSARAM"; else echo "RESULTADO: ❌ HÁ FALHAS"; fi
exit $FAIL
