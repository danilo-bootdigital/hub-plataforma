// ============================================================================
// ROLLBACK do seed de demonstração STIN PHARMA
// ============================================================================
// Remove SOMENTE os registros criados pelo seed (tag seed=stin_presentation_2026_07
// / accounts DEMO-STIN-*). Não toca em dado real nem na account DEMO-PNID-* legada.
// Ordem FK-safe. Idempotente (rodar de novo não falha).
//
// Uso:  set -a; . ./.env.local; set +a; node scripts/rollback-demo-stin.mjs
// ============================================================================

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) { console.error('Faltam env vars'); process.exit(1) }
const SEED = 'stin_presentation_2026_07'
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

async function req(method, path, extra = {}) {
  const r = await fetch(`${URL}/rest/v1/${path}`, { method, headers: { ...H, ...extra } })
  const txt = await r.text()
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${txt.slice(0, 200)}`)
  return txt ? JSON.parse(txt) : null
}
const get = (p) => req('GET', p)
// delete devolve as linhas removidas (return=representation) para contagem
async function delIn(table, col, ids) {
  let total = 0
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100)
    if (!chunk.length) continue
    const rows = await req('DELETE', `${table}?${col}=in.(${chunk.join(',')})`, { Prefer: 'return=representation' })
    total += rows?.length ?? 0
  }
  return total
}
async function delLike(table, col, pattern) {
  const rows = await req('DELETE', `${table}?${col}=like.${pattern}`, { Prefer: 'return=representation' })
  return rows?.length ?? 0
}

async function main() {
  console.log('== ROLLBACK DEMO STIN — início ==')
  const contatos = await get(`contacts?select=id&observacoes=like.*${SEED}*`)
  const quotes = await get(`quotes?select=id&observacoes=like.*${SEED}*`)
  const contactIds = contatos.map((c) => c.id)
  const quoteIds = quotes.map((q) => q.id)

  // pega todas as conversas demo (em lotes)
  const convIds = []
  for (let i = 0; i < contactIds.length; i += 100) {
    const chunk = contactIds.slice(i, i + 100)
    const c = await get(`communication_conversations?select=id&contact_id=in.(${chunk.join(',')})`)
    convIds.push(...c.map((x) => x.id))
  }

  const r = {}
  // 1) mensagens (por provider_message_id determinístico) — cascata cobriria, mas explícito
  r.mensagens = await delLike('communication_messages', 'provider_message_id', `demo:${SEED}:*`)
  // 2) participantes das conversas demo
  r.participantes = await delIn('communication_conversation_participants', 'conversation_id', convIds)
  // 3) conversas demo
  r.conversas = await delIn('communication_conversations', 'id', convIds)
  // 4) identidades de canal dos clientes demo
  r.identidades = await delIn('communication_channel_identities', 'contact_id', contactIds)
  // 5) itens dos orçamentos demo
  r.itens = await delIn('quote_items', 'quote_id', quoteIds)
  // 6) orçamentos demo
  r.orcamentos = await delIn('quotes', 'id', quoteIds)
  // 7) accounts demo (DEMO-STIN-*), preservando DEMO-PNID-* legada
  r.accounts = await delLike('communication_accounts', 'external_account_id', 'DEMO-STIN-*')
  // 8) contatos demo
  r.contatos = await delIn('contacts', 'id', contactIds)

  console.log('== REMOVIDOS ==')
  console.log(r)
  console.log('== ROLLBACK DEMO STIN — fim ==')
}
main().catch((e) => { console.error('FALHA:', e.message); process.exit(1) })
