// ============================================================================
// seed-hubs-demo.mjs — popula o HUB DEV com estrutura de demonstração.
//   5 hubs; cada hub = 1 proprietário + 3 assistentes + 1 carteira (1:1) + 10 clientes.
// Replica a lógica das server actions criarHub/criarAssistente (GoTrue Admin API +
// UPDATE do profile, pois o trigger handle_new_user não reconhece proprietario_hub/
// assistente e usa a org 'master-representacao'). Usa service role.
// Rodar: node scripts/seed-hubs-demo.mjs
// ============================================================================
import { readFileSync } from 'node:fs'
import ws from 'ws'
if (!globalThis.WebSocket) globalThis.WebSocket = ws
import { createClient } from '@supabase/supabase-js'

const env = {}
for (const l of readFileSync(new URL('../.env.local.hubdev', import.meta.url), 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
if (!URL_?.includes('pnkgwfgjhijksfmofiot')) { console.error('ABORT: não é HUB DEV'); process.exit(1) }
const db = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const SENHA = env.SEED_HUB_PASSWORD
if (!SENHA) { console.error('ABORT: defina SEED_HUB_PASSWORD no .env.local.hubdev'); process.exit(1) }
const NHUBS = 5, NASSIST = 3, NCLIENTES = 10
const now = () => new Date().toISOString()

// Org da Indústria = a do dev (admin geral).
const { data: dev, error: devErr } = await db.from('profiles')
  .select('organization_id').eq('email', 'dev@bootdigital.com.br').single()
if (devErr || !dev) { console.error('ABORT: dev@ não encontrado:', devErr?.message); process.exit(1) }
const ORG = dev.organization_id
console.log('Org (Indústria):', ORG, '\n')

async function criarUsuario(email, nome, cargo, hubId) {
  const { data, error } = await db.auth.admin.createUser({
    email, password: SENHA, email_confirm: true, user_metadata: { nome, cargo },
  })
  if (error) throw new Error(`createUser ${email}: ${error.message}`)
  const id = data.user.id
  // trigger criou o profile (org=master, cargo=vendedor); corrige tudo.
  const { error: upErr } = await db.from('profiles').update({
    nome, organization_id: ORG, cargo, hub_id: hubId, atualizado_em: now(),
  }).eq('id', id)
  if (upErr) throw new Error(`update profile ${email}: ${upErr.message}`)
  return id
}

let totU = 0, totC = 0
for (let i = 1; i <= NHUBS; i++) {
  const propEmail = `prop.hub${i}@hubdev.local`
  const propNome = `Proprietário Hub ${i}`
  console.log(`── Hub ${i} ──`)

  // 1) Proprietário (hub_id definido após criar o hub).
  const ownerId = await criarUsuario(propEmail, propNome, 'proprietario_hub', null); totU++

  // 2) Hub.
  const cnpj = String(10000000000000 + i) // 14 dígitos, único
  const { data: hub, error: hubErr } = await db.from('hubs').insert({
    organization_id: ORG, nome: `Hub Demo ${i}`, nome_representante: propNome,
    email: propEmail, telefone: `1140000${String(i).padStart(4, '0')}`, cnpj, status: 'ATIVO',
  }).select('id').single()
  if (hubErr) throw new Error(`hub ${i}: ${hubErr.message}`)
  const hubId = hub.id

  // 3) Vincula proprietário + desfaz auto-vínculo do trigger (outro profile no hub).
  await db.from('profiles').update({ hub_id: hubId, atualizado_em: now() }).eq('id', ownerId)
  await db.from('profiles').update({ hub_id: null, atualizado_em: now() }).eq('hub_id', hubId).neq('id', ownerId)
  console.log(`  ✓ proprietário ${propEmail} + hub ${hubId}`)

  // 4) 3 assistentes.
  for (let j = 1; j <= NASSIST; j++) {
    await criarUsuario(`assist.hub${i}.${j}@hubdev.local`, `Assistente ${j} — Hub ${i}`, 'assistente', hubId); totU++
  }
  console.log(`  ✓ ${NASSIST} assistentes`)

  // 5) Carteira 1:1 com o hub.
  const { data: cart, error: cErr } = await db.from('carteiras').insert({
    organization_id: ORG, nome: `Carteira Hub ${i}`, ordem: i, ativo: true, hub_id: hubId,
  }).select('id').single()
  if (cErr) throw new Error(`carteira ${i}: ${cErr.message}`)

  // 6) 10 clientes na carteira do hub.
  const clientes = Array.from({ length: NCLIENTES }, (_, k) => ({
    organization_id: ORG, nome: `Cliente ${k + 1} — Hub ${i}`,
    email: `cliente${i}-${k + 1}@hubdev.local`,
    telefone: `1150${String(i)}${String(k + 1).padStart(4, '0')}`,
    carteira_id: cart.id,
  }))
  const { error: ctErr } = await db.from('contacts').insert(clientes)
  if (ctErr) throw new Error(`contacts hub ${i}: ${ctErr.message}`)
  totC += NCLIENTES
  console.log(`  ✓ carteira ${cart.id} + ${NCLIENTES} clientes\n`)
}

// Verificação.
const c = async (t, f) => (await (f ? f(db.from(t).select('*', { count: 'exact', head: true })) : db.from(t).select('*', { count: 'exact', head: true }))).count
console.log('=== RESUMO ===')
console.log('hubs:', await c('hubs'))
console.log('carteiras (com hub):', (await db.from('carteiras').select('*', { count: 'exact', head: true }).not('hub_id', 'is', null)).count)
console.log('proprietários:', (await db.from('profiles').select('*', { count: 'exact', head: true }).eq('cargo', 'proprietario_hub')).count)
console.log('assistentes:', (await db.from('profiles').select('*', { count: 'exact', head: true }).eq('cargo', 'assistente')).count)
console.log('contacts total:', await c('contacts'))
console.log(`\n✅ seed concluído: ${totU} usuários, 5 hubs, 5 carteiras, ${totC} clientes. Senha: ${SENHA}`)
