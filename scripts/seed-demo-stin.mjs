// ============================================================================
// Seed de DEMONSTRAÇÃO — apresentação comercial STIN PHARMA
// ============================================================================
// Cria dados FICTÍCIOS e reversíveis: para cada assistente, 10 clientes com
// orçamento (status/etapa variados) e uma conversa WhatsApp (Mensageria).
//
// SEGURANÇA:
//  - Não altera nenhum dado real (só insere; nunca faz UPDATE/DELETE em real).
//  - Tudo marcado com a tag de seed (rollback remove só o que tem a tag).
//  - Idempotente: rodar 2x não duplica (checagem por slot determinístico).
//  - service role (bypassa RLS); todo registro carrega o hub_id correto.
//  - Não escreve em tabelas append-only (message_events/quote_events).
//
// Uso:  set -a; . ./.env.local; set +a; node scripts/seed-demo-stin.mjs
// ============================================================================

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) { console.error('Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

const SEED = 'stin_presentation_2026_07'
const CLIENTS_PER_ASSISTANT = process.env.SEED_CLIENTS ? Number(process.env.SEED_CLIENTS) : 10
const MAX_ASSIST = process.env.SEED_MAX_ASSIST ? Number(process.env.SEED_MAX_ASSIST) : Infinity
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

// ---- helpers REST ----------------------------------------------------------
async function req(method, path, body, extra = {}) {
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    method, headers: { ...H, ...extra }, body: body ? JSON.stringify(body) : undefined,
  })
  const txt = await r.text()
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${txt.slice(0, 300)}`)
  return txt ? JSON.parse(txt) : null
}
const get = (p) => req('GET', p)
const insert = (t, row) => req('POST', t, row, { Prefer: 'return=representation' })

// ---- geradores --------------------------------------------------------------
const NOMES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Eduarda', 'Felipe', 'Gabriela', 'Henrique', 'Isabela', 'João',
  'Larissa', 'Marcelo', 'Natália', 'Otávio', 'Patrícia', 'Rafael', 'Sabrina', 'Thiago', 'Vanessa', 'William',
  'Camila', 'Rodrigo', 'Juliana', 'Fernando', 'Beatriz', 'Gustavo', 'Letícia', 'André', 'Mariana', 'Lucas']
const SOBRENOMES = ['Silva', 'Souza', 'Oliveira', 'Santos', 'Pereira', 'Lima', 'Carvalho', 'Ferreira', 'Almeida',
  'Costa', 'Gomes', 'Ribeiro', 'Martins', 'Rocha', 'Barbosa', 'Araújo', 'Nunes', 'Cardoso', 'Teixeira', 'Moraes']
const DDDS = ['11', '21', '31', '41', '51']
const PRODUTOS = [
  { nome: 'Vitamina D3 2000UI (60 cáps)', preco: 89.9 },
  { nome: 'Ômega 3 1000mg (120 cáps)', preco: 129.9 },
  { nome: 'Colágeno Hidrolisado (300g)', preco: 74.5 },
  { nome: 'Magnésio Dimalato (90 cáps)', preco: 68.0 },
  { nome: 'Coenzima Q10 100mg (30 cáps)', preco: 149.0 },
  { nome: 'Multivitamínico A-Z (60 cáps)', preco: 59.9 },
  { nome: 'Whey Protein Isolado (900g)', preco: 189.9 },
  { nome: 'Creatina Monohidratada (300g)', preco: 99.0 },
]

// CPF fictício com dígitos verificadores válidos (formato aceito, mas fake).
function gerarCPF(seed) {
  const n = []
  let x = seed * 2654435761 % 1000000000
  for (let i = 0; i < 9; i++) { n.push(x % 10); x = Math.floor(x / 10) + (i + 3) * 17 }
  const dv = (base) => { let s = 0; for (let i = 0; i < base.length; i++) s += base[i] * (base.length + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r }
  const d1 = dv(n); const d2 = dv([...n, d1])
  const full = [...n, d1, d2].join('')
  return `${full.slice(0, 3)}.${full.slice(3, 6)}.${full.slice(6, 9)}-${full.slice(9)}`
}
// Telefone BR fictício E.164 (13 díg): 55 + DDD + 9 + 9000 + seq(4). Faixa reservada fake.
function gerarTelefone(hubIdx, seq) {
  return `55${DDDS[hubIdx % DDDS.length]}99000${String(seq).padStart(4, '0')}`
}
const money = (v) => Math.round(v * 100) / 100

// Distribuição realista das 10 etapas por assistente (funil completo).
const DISTRIB = [
  { pipe: 'novo_orcamento', quote: 'aguardando_aprovacao_interna', conv: 'novo' },
  { pipe: 'novo_orcamento', quote: 'rascunho', conv: 'novo' },
  { pipe: 'orcamento_enviado', quote: 'enviado_ao_cliente', conv: 'aguardando_cliente' },
  { pipe: 'orcamento_enviado', quote: 'enviado_ao_cliente', conv: 'aguardando_cliente' },
  { pipe: 'aguardando_receita', quote: 'enviado_ao_cliente', conv: 'aguardando_cliente' },
  { pipe: 'aguardando_receita', quote: 'enviado_ao_cliente', conv: 'em_atendimento' },
  { pipe: 'aguardando_comprovante_pagamento', quote: 'aprovado_pelo_cliente', conv: 'em_atendimento' },
  { pipe: 'pagamento_confirmado', quote: 'aprovado_pelo_cliente', conv: 'em_atendimento' },
  { pipe: 'pedido_enviado_industria', quote: 'aprovado_pelo_cliente', conv: 'finalizado' },
  { pipe: 'orcamento_enviado', quote: 'recusado_pelo_cliente', conv: 'perdido' }, // perdido
]

// Thread coerente (sem dados reais de paciente/médico). Retorna [{dir,corpo,st}].
function montarThread(d, primeiroNome, assistNome, produto, valor, numero) {
  const R = 'recebida', L = 'lida', E = 'entregue'
  const t = [
    { dir: 'inbound', corpo: `Olá, boa tarde! Vi o material de vocês e queria saber mais.`, st: L },
    { dir: 'outbound', corpo: `Oi, ${primeiroNome}! Aqui é ${assistNome}. Posso te ajudar sim 😊 Qual produto te interessou?`, st: L },
    { dir: 'inbound', corpo: `Tenho interesse no ${produto}. Quanto fica?`, st: L },
    { dir: 'outbound', corpo: `O ${produto} sai por R$ ${valor.toFixed(2).replace('.', ',')}. Consigo montar um orçamento completo pra você.`, st: L },
  ]
  if (['orcamento_enviado', 'aguardando_receita', 'aguardando_comprovante_pagamento', 'pagamento_confirmado', 'pedido_enviado_industria'].includes(d.pipe)) {
    t.push({ dir: 'outbound', corpo: `Prontinho! Acabei de te enviar o orçamento nº ${numero}. Dá uma olhada quando puder.`, st: E })
  }
  if (d.pipe === 'aguardando_receita') {
    t.push({ dir: 'outbound', corpo: `Pra seguir com esse item, você consegue me enviar a receita/prescrição? Pode ser foto pelo WhatsApp.`, st: E })
    t.push({ dir: 'inbound', corpo: `Perfeito, vou providenciar e te mando.`, st: L })
  }
  if (d.pipe === 'aguardando_comprovante_pagamento') {
    t.push({ dir: 'inbound', corpo: `Fechado! Como faço o pagamento?`, st: L })
    t.push({ dir: 'outbound', corpo: `Te enviei os dados. Assim que fizer, me manda o comprovante que eu libero o pedido.`, st: E })
  }
  if (d.pipe === 'pagamento_confirmado') {
    t.push({ dir: 'inbound', corpo: `Segue o comprovante do pagamento.`, st: L })
    t.push({ dir: 'outbound', corpo: `Pagamento confirmado, muito obrigado! 🎉 Já vou dar andamento.`, st: E })
  }
  if (d.pipe === 'pedido_enviado_industria') {
    t.push({ dir: 'inbound', corpo: `Comprovante enviado 👍`, st: L })
    t.push({ dir: 'outbound', corpo: `Recebido! Seu pedido já foi enviado para a indústria. Em breve te atualizo sobre a entrega.`, st: E })
  }
  if (d.conv === 'perdido') {
    t.push({ dir: 'inbound', corpo: `Achei um pouco acima do meu orçamento agora, vou deixar pra frente.`, st: L })
    t.push({ dir: 'outbound', corpo: `Sem problemas, ${primeiroNome}! Qualquer coisa estou por aqui. 😉`, st: E })
  } else if (d.pipe === 'novo_orcamento' || d.pipe === 'orcamento_enviado') {
    t.push({ dir: 'outbound', corpo: `Passando pra saber se ficou alguma dúvida sobre o orçamento 😊`, st: E })
  }
  return t
}

// ---- execução ---------------------------------------------------------------
const now = Date.UTC(2026, 6, 7, 12, 0, 0) // base determinística (sem Date.now)
const iso = (msAgo) => new Date(now - msAgo).toISOString()

async function main() {
  console.log('== SEED DEMO STIN — início ==')
  const assistentesTodos = await get(`profiles?select=id,nome,organization_id,hub_id&cargo=eq.assistente&order=hub_id,nome`)
  const assistentes = assistentesTodos.slice(0, MAX_ASSIST)
  console.log(`assistentes: ${assistentes.length} (de ${assistentesTodos.length})`)

  // Estado existente (idempotência): mapa slot -> contact
  const contatosExist = await get(`contacts?select=id,observacoes,responsavel_id&observacoes=like.*${SEED}*`)
  const slotContato = new Map(contatosExist.map((c) => [ (c.observacoes.match(/slot=([^;]+)/) || [])[1], c ]))

  const hubsComAssist = [...new Set(assistentes.map((a) => a.hub_id))]
  // 1 account demo por hub (idempotente por external_account_id)
  const accByHub = new Map()
  for (const hub of hubsComAssist) {
    const ext = `DEMO-STIN-${hub.slice(0, 8)}`
    let acc = (await get(`communication_accounts?select=id&external_account_id=eq.${ext}`))[0]
    if (!acc) acc = (await insert('communication_accounts', {
      hub_id: hub, channel: 'whatsapp', provider: 'cloud_api', external_account_id: ext,
      display_label: '[DEMO] WhatsApp STIN', status: 'ativo', metadata: { demo: true, seed: SEED },
    }))[0]
    accByHub.set(hub, acc.id)
  }
  console.log(`accounts demo por hub: ${accByHub.size}`)

  const stat = { contatos: 0, identities: 0, quotes: 0, items: 0, convs: 0, parts: 0, msgs: 0, pulados: 0 }
  const hubLocalIdx = new Map()

  for (const a of assistentes) {
    const li = (hubLocalIdx.get(a.hub_id) ?? 0); hubLocalIdx.set(a.hub_id, li + 1)
    const hubIdx = hubsComAssist.indexOf(a.hub_id)
    const accId = accByHub.get(a.hub_id)

    for (let n = 0; n < CLIENTS_PER_ASSISTANT; n++) {
      const slot = `${a.id.slice(0, 8)}C${n}`
      if (slotContato.has(slot)) { stat.pulados++; continue }

      const seq = hubIdx * 1000 + li * 100 + n
      const nome = `${NOMES[(li * 10 + n) % NOMES.length]} ${SOBRENOMES[(seq) % SOBRENOMES.length]}`
      const primeiro = nome.split(' ')[0]
      const tel = gerarTelefone(hubIdx, seq)
      const d = DISTRIB[n]
      const prod = PRODUTOS[(seq) % PRODUTOS.length]
      const qtd = 1 + (n % 3)
      const total = money(prod.preco * qtd)
      const diasAtras = (n + 1) * 2

      // 1) contato (cliente) — vínculo ao hub via responsavel_id (assistente)
      const contato = (await insert('contacts', {
        organization_id: a.organization_id, nome: `[DEMO] ${nome}`,
        telefone: tel, cpf_cnpj: gerarCPF(seq + 7), tipo_pessoa: 'fisica',
        responsavel_id: a.id, responsavel_operacional_id: a.id,
        observacoes: `seed=${SEED};slot=${slot}`,
      }))[0]
      stat.contatos++

      // 2) orçamento + item (pipeline_status = etapa; card = orçamento)
      const quote = (await insert('quotes', {
        organization_id: a.organization_id, hub_id: a.hub_id, contato_id: contato.id,
        responsavel_id: a.id, status: d.quote,
        valor_subtotal: total, desconto_geral: 0, desconto_valor: 0, valor_total: total,
        pipeline_status: d.pipe, pipeline_moved_at: iso(diasAtras * 86400000), pipeline_moved_by: a.id,
        observacoes: `[DEMO] seed=${SEED}`, criado_em: iso(diasAtras * 86400000),
      }))[0]
      stat.quotes++
      await insert('quote_items', {
        quote_id: quote.id, descricao: prod.nome, quantidade: qtd,
        preco_unitario: prod.preco, desconto_item: 0, subtotal: total,
      })
      stat.items++

      // 3) identidade de canal (WhatsApp do cliente)
      const ident = (await insert('communication_channel_identities', {
        hub_id: a.hub_id, channel: 'whatsapp', provider: 'cloud_api',
        external_user_id: tel, telefone: tel, display_name: `[DEMO] ${nome}`, contact_id: contato.id,
      }))[0]
      stat.identities++

      // 4) conversa + participantes
      const thread = montarThread(d, primeiro, a.nome, prod.nome, prod.preco, quote.numero)
      const lastMs = iso(diasAtras * 86400000 - (thread.length) * 60000)
      const unread = (d.conv === 'novo' || d.conv === 'aguardando_cliente') ? 1 : 0
      const conv = (await insert('communication_conversations', {
        hub_id: a.hub_id, account_id: accId, channel: 'whatsapp', channel_identity_id: ident.id,
        contact_id: contato.id, assigned_user_id: a.id, status: d.conv, unread_count: unread,
        last_message_at: lastMs, arquivada: false,
      }))[0]
      stat.convs++
      const pExterno = (await insert('communication_conversation_participants', {
        hub_id: a.hub_id, conversation_id: conv.id, tipo: 'externo', channel_identity_id: ident.id, papel: 'cliente',
      }))[0]
      await insert('communication_conversation_participants', {
        hub_id: a.hub_id, conversation_id: conv.id, tipo: 'usuario', user_id: a.id, papel: 'atendente',
      })
      stat.parts += 2

      // 5) mensagens (thread) — idempotência por provider_message_id determinístico
      const msgs = thread.map((m, i) => ({
        hub_id: a.hub_id, conversation_id: conv.id, direction: m.dir, tipo: 'texto', corpo: m.corpo,
        provider: 'cloud_api', provider_message_id: `demo:${SEED}:${slot}:${i}`,
        sender_participant_id: m.dir === 'inbound' ? pExterno.id : null,
        status: m.dir === 'inbound' ? 'recebida' : m.st,
        enviada_em: iso(diasAtras * 86400000 - (thread.length - i) * 60000),
      }))
      await insert('communication_messages', msgs)
      stat.msgs += msgs.length

      slotContato.set(slot, contato)
    }
  }
  console.log('== RESUMO ==')
  console.log(stat)
  console.log('== SEED DEMO STIN — fim ==')
}
main().catch((e) => { console.error('FALHA:', e.message); process.exit(1) })
