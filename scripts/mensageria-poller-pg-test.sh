#!/usr/bin/env bash
# DEC-023 · Fatia 0 · Etapa 8A — Dry-run em Postgres EFÊMERO da migration 073
# (communication_inbound_claim). Valida FOR UPDATE SKIP LOCKED, claims concorrentes
# disjuntos, timeout de visibilidade e elegibilidade por backoff.
# NUNCA conecta em HUB DEV/produção — sobe um cluster descartável local e o destrói.
set -u
FAIL=0
BASE="$(mktemp -d /tmp/pgpoller.XXXXXX)"; DATA="$BASE/data"; PORT=55440; LOG="$BASE/log"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cleanup(){ pg_ctl -D "$DATA" stop -m immediate >/dev/null 2>&1; rm -rf "$BASE"; echo "== ambiente efêmero descartado =="; }
trap cleanup EXIT
initdb -D "$DATA" -U postgres --auth=trust --encoding=UTF8 --locale=C >/dev/null 2>&1 || { echo "FALHA initdb"; exit 1; }
pg_ctl -D "$DATA" -l "$LOG" -o "-k $BASE -p $PORT -c listen_addresses=''" -w start >/dev/null 2>&1 || { echo "FALHA start"; cat "$LOG"; exit 1; }
Q(){ psql -h "$BASE" -p "$PORT" -U postgres -d postgres -tA "$@"; }

echo "== stubs + migrations 072/073 =="
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
Q -v ON_ERROR_STOP=1 -q -f "$REPO/supabase/migrations/073_mensageria_poller_claim.sql" >/dev/null 2>&1 || { echo "FALHA 073"; exit 1; }

seed50(){ Q -v ON_ERROR_STOP=1 -q -c "TRUNCATE communication_inbound_events CASCADE;" \
  -c "INSERT INTO communication_inbound_events(provider,external_event_id,payload,status) SELECT 'cloud_api','evt-'||g,'{}'::jsonb,'pendente' FROM generate_series(1,50) g;" ; }
check(){ local nome="$1" esperado="$2" obtido="$3"; if [ "$esperado" = "$obtido" ]; then echo "  ✅ $nome (=$obtido)"; else echo "  ❌ $nome esperado=$esperado obtido=$obtido"; FAIL=1; fi; }

echo "== Teste A: SKIP LOCKED pula linhas travadas por outra sessão =="
seed50
# Sessão A (bg): trava 10 linhas por 3s.
psql -h "$BASE" -p "$PORT" -U postgres -d postgres -q -c "BEGIN; SELECT id FROM communication_inbound_events ORDER BY created_at LIMIT 10 FOR UPDATE; SELECT pg_sleep(3); ROLLBACK;" >/dev/null 2>&1 &
APID=$!
# Sessão B: espera 1s (SQL) e reivindica tudo; deve pegar 40 (pula as 10 travadas).
CLAIMED_B=$(psql -h "$BASE" -p "$PORT" -U postgres -d postgres -tA -c "SELECT pg_sleep(1);" -c "SELECT count(*) FROM communication_inbound_claim(1000,300);" | tail -1)
wait $APID
check "B reivindica 40 (pula as 10 travadas)" "40" "$CLAIMED_B"

echo "== Teste B: dois claims CONCORRENTES retornam conjuntos disjuntos =="
seed50
psql -h "$BASE" -p "$PORT" -U postgres -d postgres -tA -c "SELECT external_event_id FROM communication_inbound_claim(30,300);" > "$BASE/b1.txt" 2>/dev/null &
P1=$!
psql -h "$BASE" -p "$PORT" -U postgres -d postgres -tA -c "SELECT external_event_id FROM communication_inbound_claim(30,300);" > "$BASE/b2.txt" 2>/dev/null &
P2=$!
wait $P1 $P2
INTER=$(comm -12 <(sort "$BASE/b1.txt" | grep -c . >/dev/null; sort "$BASE/b1.txt") <(sort "$BASE/b2.txt") | grep -c . )
TOTAL=$(cat "$BASE/b1.txt" "$BASE/b2.txt" | grep -c .)
DISTINCT=$(cat "$BASE/b1.txt" "$BASE/b2.txt" | sort -u | grep -c .)
check "interseção vazia entre os dois claims" "0" "$INTER"
check "nenhum evento reivindicado 2x (total==distintos)" "$TOTAL" "$DISTINCT"

echo "== Teste C: visibilidade (reclaim de preso) + elegibilidade por backoff =="
seed50
Q -q \
  -c "UPDATE communication_inbound_events SET status='processado' WHERE external_event_id NOT IN ('evt-1','evt-2','evt-3');" \
  -c "UPDATE communication_inbound_events SET status='processando', proxima_tentativa_em = now() - interval '1 minute' WHERE external_event_id='evt-1';" \
  -c "UPDATE communication_inbound_events SET status='processando', proxima_tentativa_em = now() + interval '10 minutes' WHERE external_event_id='evt-2';" \
  -c "UPDATE communication_inbound_events SET status='pendente', proxima_tentativa_em = now() + interval '10 minutes' WHERE external_event_id='evt-3';"
CLAIM_C=$(Q -c "SELECT string_agg(external_event_id, ',' ORDER BY external_event_id) FROM communication_inbound_claim(1000,300);")
check "claim retorna só o preso expirado (evt-1); pula processando-futuro e pendente-em-backoff" "evt-1" "$CLAIM_C"

echo "== Teste D: tentativa contada no claim + crash-loop → dead-letter (sem incremento duplo) =="
seedcrash(){ Q -v ON_ERROR_STOP=1 -q -c "TRUNCATE communication_inbound_events CASCADE;" \
  -c "INSERT INTO communication_inbound_events(provider,external_event_id,payload,status) VALUES('cloud_api','evt-crash','{}'::jsonb,'pendente');"; }
# um único claim conta exatamente 1 tentativa (não 0, não 2)
seedcrash
Q -q -c "SELECT count(*) FROM communication_inbound_claim(10,300,5);" >/dev/null
T1=$(Q -c "SELECT tentativas FROM communication_inbound_events WHERE external_event_id='evt-crash';")
check "1 claim = exatamente 1 tentativa (sem incremento duplo)" "1" "$T1"
# crash-loop: visibilidade=0 (reclaim imediato), NUNCA aplica transição; deve dead-letar em <= max claims
seedcrash
for i in 1 2 3 4 5 6 7; do Q -q -c "SELECT count(*) FROM communication_inbound_claim(10,0,5);" >/dev/null; done
DL=$(Q -c "SELECT status||':'||tentativas FROM communication_inbound_events WHERE external_event_id='evt-crash';")
check "crash-loop termina em dead-letter no teto (erro:5)" "erro:5" "$DL"
CLAIMED_AFTER=$(Q -c "SELECT count(*) FROM communication_inbound_claim(10,0,5);")
check "evento dead-letter não é mais reivindicado" "0" "$CLAIMED_AFTER"

echo
if [ "$FAIL" = "0" ]; then echo "RESULTADO: ✅ TODOS OS TESTES SKIP LOCKED/VISIBILIDADE PASSARAM"; else echo "RESULTADO: ❌ HÁ FALHAS"; fi
exit $FAIL
