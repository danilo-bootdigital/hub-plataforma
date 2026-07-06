// Cria a Função "Assistente Comercial" nos hubs do seed + vincula assistentes.
import { readFileSync } from 'node:fs'; import ws from 'ws'
if (!globalThis.WebSocket) globalThis.WebSocket = ws
import { createClient } from '@supabase/supabase-js'
const env={}; for(const l of readFileSync(new URL('../.env.local.hubdev',import.meta.url),'utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'').trim()}
if(!env.NEXT_PUBLIC_SUPABASE_URL?.includes('pnkgwfgjhijksfmofiot')){console.error('ABORT');process.exit(1)}
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})

const NOME='Assistente Comercial'
const PERMS={ dashboard:['visualizar'], clientes:['visualizar','criar','editar'],
  produtos:['visualizar'], orcamentos:['visualizar','criar','editar'], receita:['visualizar','criar','editar'] }

const {data:hubs}=await db.from('hubs').select('id,nome,organization_id').order('nome')
let vinc=0
for(const h of hubs){
  // upsert função (unique hub_id+nome)
  let {data:f}=await db.from('funcoes').select('id').eq('hub_id',h.id).eq('nome',NOME).maybeSingle()
  if(!f){ const {data:nf,error}=await db.from('funcoes').insert({organization_id:h.organization_id,hub_id:h.id,nome:NOME,descricao:'Orçamentos, cadastro de clientes, validação de receita e consulta de produtos.',ativo:true}).select('id').single()
    if(error){console.error(`funcao ${h.nome}:`,error.message);process.exit(1)} f=nf }
  // permissões (idempotente)
  const rows=Object.entries(PERMS).flatMap(([modulo,acoes])=>acoes.map(acao=>({funcao_id:f.id,modulo,acao})))
  const {error:pe}=await db.from('funcao_permissoes').upsert(rows,{onConflict:'funcao_id,modulo,acao',ignoreDuplicates:true})
  if(pe){console.error(`perms ${h.nome}:`,pe.message);process.exit(1)}
  // vincula assistentes do hub
  const {data:up,error:ue}=await db.from('profiles').update({funcao_id:f.id,atualizado_em:new Date().toISOString()}).eq('hub_id',h.id).eq('cargo','assistente').select('id')
  if(ue){console.error(`vinculo ${h.nome}:`,ue.message);process.exit(1)}
  vinc+=up.length
  console.log(`✓ ${h.nome}: função ${f.id} (${rows.length} permissões) → ${up.length} assistentes`)
}
// verificação
const {count:comFuncao}=await db.from('profiles').select('*',{count:'exact',head:true}).eq('cargo','assistente').not('funcao_id','is',null)
const {count:totalFunc}=await db.from('funcoes').select('*',{count:'exact',head:true})
console.log(`\n✅ ${totalFunc} funções; ${vinc} assistentes vinculados; assistentes com função=${comFuncao}/15`)
