import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { CabecalhoPagina } from '@/components/layout/listagem'
import { PIPELINE_STAGES, normalizarEtapa } from '@/lib/pipeline/etapas'
import { PipelineBoard, type CartaoPipeline, type ResponsavelOpcao } from '@/components/pipeline/pipeline-board'

// Pipeline / Kanban operacional do Hub (MVP). Cada card = um orçamento do Hub.
// Fonte de verdade: quotes.pipeline_status. Escopo por hub_id NO SERVIDOR.
// Indústria não acessa (bloqueada no middleware em /hub/**).
export default async function HubPipelinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles').select('id, organization_id, cargo, hub_id').eq('id', user.id).single()
  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'proprietario_hub' && perfil.cargo !== 'assistente') redirect('/painel')

  const ehProprietario = perfil.cargo === 'proprietario_hub'

  if (!perfil.hub_id) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-slate-900">Pipeline</h1>
        <p className="max-w-prose text-slate-500">
          Seu usuário não está vinculado a um Hub. Solicite o vínculo à Indústria.
        </p>
      </div>
    )
  }

  const org = perfil.organization_id
  const hub = perfil.hub_id
  const admin = createAdminClient()

  // Orçamentos do Hub. Escopo server-side: Proprietário vê todos; Assistente só
  // os atribuídos a ele (responsavel_id). Nunca confia em filtro do front.
  let q = admin
    .from('quotes')
    .select('id, numero, valor_total, criado_em, pipeline_status, pipeline_moved_at, forma_pagamento, contato_id, responsavel_id, portfolio:portfolio_id(nome), responsavel:profiles!responsavel_id(nome)')
    .eq('organization_id', org)
    .eq('hub_id', hub)
    .order('pipeline_moved_at', { ascending: true, nullsFirst: true })
  if (!ehProprietario) q = q.eq('responsavel_id', perfil.id)
  const { data: qRaw } = await q

  const lista = (qRaw ?? []) as unknown as {
    id: string; numero: number | null; valor_total: number | null; criado_em: string
    pipeline_status: string | null; pipeline_moved_at: string | null; forma_pagamento: string | null
    contato_id: string | null; responsavel_id: string | null
    portfolio: { nome: string } | null; responsavel: { nome: string } | null
  }[]

  const ids = lista.map((q) => q.id)

  // Nome dos clientes (busca única).
  const contatoIds = [...new Set(lista.map((q) => q.contato_id).filter((v): v is string => !!v))]
  const contatoMap = new Map<string, string>()
  if (contatoIds.length) {
    const { data: cs } = await admin.from('contacts').select('id, nome').in('id', contatoIds)
    ;(cs ?? []).forEach((c) => contatoMap.set(c.id, c.nome))
  }

  // Produto principal + contagem de itens (1º item de cada orçamento).
  const itensMap = new Map<string, { primeiro: string; total: number }>()
  if (ids.length) {
    const { data: itens } = await admin
      .from('quote_items').select('quote_id, descricao').in('quote_id', ids)
    ;(itens ?? []).forEach((it) => {
      const cur = itensMap.get(it.quote_id)
      if (cur) cur.total += 1
      else itensMap.set(it.quote_id, { primeiro: it.descricao, total: 1 })
    })
  }

  // Badge de receita: orçamento tem receita anexada?
  const comReceita = new Set<string>()
  if (ids.length) {
    const { data: recs } = await admin.from('quote_receitas').select('quote_id').in('quote_id', ids)
    ;(recs ?? []).forEach((r) => comReceita.add(r.quote_id))
  }

  const cartoes: CartaoPipeline[] = lista.map((q) => {
    const itens = itensMap.get(q.id)
    return {
      id: q.id,
      numero: q.numero,
      cliente_nome: q.contato_id ? contatoMap.get(q.contato_id) ?? '—' : '—',
      produto_resumo: itens
        ? itens.total > 1 ? `${itens.primeiro} +${itens.total - 1}` : itens.primeiro
        : q.portfolio?.nome ?? '—',
      valor_total: q.valor_total,
      responsavel_id: q.responsavel_id,
      responsavel_nome: q.responsavel?.nome ?? '—',
      criado_em: q.criado_em,
      pipeline_status: normalizarEtapa(q.pipeline_status),
      pipeline_moved_at: q.pipeline_moved_at ?? q.criado_em,
      tem_receita: comReceita.has(q.id),
      tem_pagamento: !!q.forma_pagamento,
    }
  })

  // Lista de responsáveis do Hub (filtro do Proprietário).
  const responsaveis: ResponsavelOpcao[] = []
  if (ehProprietario) {
    const { data: profs } = await admin
      .from('profiles').select('id, nome')
      .eq('organization_id', org).eq('hub_id', hub)
      .in('cargo', ['proprietario_hub', 'assistente']).order('nome')
    ;(profs ?? []).forEach((p) => responsaveis.push({ id: p.id, nome: p.nome }))
  }

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Pipeline"
        descricao="Acompanhe os orçamentos do seu Hub por etapa. Arraste um card para mudar a etapa."
      />
      <PipelineBoard
        cartoes={cartoes}
        etapas={PIPELINE_STAGES}
        ehProprietario={ehProprietario}
        usuarioId={perfil.id}
        responsaveis={responsaveis}
      />
    </div>
  )
}
