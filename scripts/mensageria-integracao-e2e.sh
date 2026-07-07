#!/usr/bin/env bash
# DEC-023 · Fatia 0 — Integração ponta a ponta em Postgres EFÊMERO.
# Aplica 072→073→074→075, roda o driver TS e2e (componentes reais → RPCs reais)
# e os cenários SQL (SKIP LOCKED concorrente + crash-recovery). Destrói o ambiente.
# NUNCA conecta em HUB DEV/produção.
set -u
FAIL=0
BASE="$(mktemp -d /tmp/pge2e.XXXXXX)"; DATA="$BASE/data"; PORT=55445
export PGHOST="$BASE" PGPORT="$PORT" PGUSER=postgres PGDATABASE=postgres
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cleanup(){ pg_ctl -D "$DATA" stop -m immediate >/dev/null 2>&1; rm -rf "$BASE" "$REPO/.tmp-integ"; echo "== ambiente e2e descartado =="; }
trap cleanup EXIT
cd "$REPO"
initdb -D "$DATA" -U postgres --auth=trust --encoding=UTF8 --locale=C >/dev/null 2>&1 || { echo "FALHA initdb"; exit 1; }
pg_ctl -D "$DATA" -l "$BASE/log" -o "-k $BASE -p $PORT -c listen_addresses=''" -w start >/dev/null 2>&1 || { echo "FALHA start"; cat "$BASE/log"; exit 1; }
Q(){ psql -tA "$@"; }
check(){ if [ "$2" = "$3" ]; then echo "  ✅ $1 (=$3)"; else echo "  ❌ $1 esperado=$2 obtido=$3"; FAIL=1; fi; }

echo "== stubs + migrations 072→073→074→075 + conta =="
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
for m in 072_mensageria_communication 073_mensageria_poller_claim 074_mensageria_persistir_mensagem 075_mensageria_rpc_grants_fix; do
  Q -v ON_ERROR_STOP=1 -q -f "supabase/migrations/$m.sql" >/dev/null 2>&1 && echo "  ✅ $m" || { echo "  ❌ $m FALHOU"; exit 1; }
done
Q -v ON_ERROR_STOP=1 -q -c "INSERT INTO hubs DEFAULT VALUES;" \
  -c "INSERT INTO communication_accounts(hub_id, channel, provider, external_account_id) SELECT id,'whatsapp','cloud_api','PNID1' FROM hubs LIMIT 1;" >/dev/null

echo
echo "########## DRIVER TS END-TO-END (componentes reais → RPCs reais) ##########"
node_modules/.bin/tsc -p tsconfig.integ.json >/dev/null 2>&1 || { echo "  ❌ tsc integ falhou"; node_modules/.bin/tsc -p tsconfig.integ.json 2>&1 | head; exit 1; }
node -e "require('fs').writeFileSync('.tmp-integ/package.json','{\"type\":\"commonjs\"}')"
node .tmp-integ/tests/mensageria/e2e-driver.js || FAIL=1

echo
echo "########## CENÁRIOS SQL (concorrência + crash) ##########"
echo "== SKIP LOCKED: dois claims concorrentes disjuntos =="
Q -v ON_ERROR_STOP=1 -q -c "INSERT INTO communication_inbound_events(provider,external_event_id,payload,status) SELECT 'cloud_api','sql-'||g,'{}'::jsonb,'pendente' FROM generate_series(1,50) g;" >/dev/null
Q -tA -c "SELECT external_event_id FROM communication_inbound_claim(30,300,5)" > "$BASE/c1.txt" 2>/dev/null &
P1=$!
Q -tA -c "SELECT external_event_id FROM communication_inbound_claim(30,300,5)" > "$BASE/c2.txt" 2>/dev/null &
P2=$!
wait $P1 $P2
INTER=$(comm -12 <(sort "$BASE/c1.txt") <(sort "$BASE/c2.txt") | grep -c . || true)
DISTINCT=$(cat "$BASE/c1.txt" "$BASE/c2.txt" | sort -u | grep -c . || true)
TOTAL=$(cat "$BASE/c1.txt" "$BASE/c2.txt" | grep -c . || true)
check "interseção vazia entre claims concorrentes" "0" "$INTER"
check "nenhum evento reivindicado 2x" "$TOTAL" "$DISTINCT"

echo "== crash recovery: claim sem aplicar → reclaim até dead-letter =="
Q -v ON_ERROR_STOP=1 -q -c "INSERT INTO communication_inbound_events(provider,external_event_id,payload,status) VALUES('cloud_api','sql-crash','{}'::jsonb,'pendente');" >/dev/null
for i in 1 2 3 4 5 6 7; do Q -q -c "SELECT count(*) FROM communication_inbound_claim(10,0,5);" >/dev/null; done
check "crash-loop vira dead-letter no teto" "erro:5" "$(Q -c "SELECT status||':'||tentativas FROM communication_inbound_events WHERE external_event_id='sql-crash';")"

echo
if [ "$FAIL" = "0" ]; then echo "RESULTADO: ✅ INTEGRAÇÃO E2E COMPLETA PASSOU"; else echo "RESULTADO: ❌ HÁ FALHAS"; fi
exit $FAIL
