import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import { KanbanBoard } from '@/components/pipeline/kanban-board'
import type { UserRole, LeadOrigem } from '@/types/database'

export default async function PipelinePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, cargo, organization_id')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')
  if (!['admin', 'gestor', 'vendedor'].includes(perfil.cargo)) redirect('/painel')

  const { data: pipeline } = await supabase
    .from('pipelines')
    .select('id, nome')
    .eq('organization_id', perfil.organization_id)
    .eq('padrao', true)
    .single()

  if (!pipeline) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        Nenhum pipeline configurado.
      </div>
    )
  }

  const { data: etapas } = await supabase
    .from('pipeline_stages')
    .select('id, nome, cor, ordem, tipo_especial')
    .eq('pipeline_id', pipeline.id)
    .eq('oculto', false)
    .order('ordem')

  // Vendedor vê apenas os próprios deals
  let dealsQuery = supabase
    .from('deals')
    .select(`
      id,
      titulo,
      valor_estimado,
      estagio_id,
      ganho,
      motivo_perda,
      data_fechamento_prevista,
      origem_lead,
      atualizado_em,
      contato:contato_id(id, nome),
      responsavel:responsavel_id(id, nome),
      lead:lead_id(id, nome, telefone, foto_perfil_url, origem, status)
    `)
    .eq('pipeline_id', pipeline.id)
    .eq('organization_id', perfil.organization_id)
    .is('ganho', null)
    .order('atualizado_em', { ascending: false })

  if (perfil.cargo === 'vendedor') {
    dealsQuery = dealsQuery.eq('responsavel_id', perfil.id)
  }

  const { data: dealsRaw } = await dealsQuery

  // Buscar última mensagem e tags para cada deal com lead vinculado
  const leadIds = (dealsRaw ?? [])
    .map((d) => {
      const lead = Array.isArray(d.lead) ? d.lead[0] : d.lead
      return lead?.id
    })
    .filter(Boolean) as string[]

  // Buscar conversas com última mensagem para os leads
  const { data: conversasRaw } = leadIds.length > 0
    ? await supabase
        .from('conversations')
        .select(`
          id,
          lead_id,
          ultima_mensagem_em,
          status
        `)
        .in('lead_id', leadIds)
        .eq('organization_id', perfil.organization_id)
        .order('ultima_mensagem_em', { ascending: false })
    : { data: [] }

  // Buscar últimas 3 mensagens de cada conversa
  const conversaIds = (conversasRaw ?? []).map((c) => c.id)
  const ultimasMensagensMap = new Map<string, { conteudo: string | null; direcao: string; enviado_em: string }[]>()
  if (conversaIds.length > 0) {
    // Antes: 1 query por conversa (N+1) via conversaIds.map + Promise.all.
    // Agora: 1 única query com .in(), ordenada por mais recente, e o "máx. 3
    // por conversa" é aplicado em memória — reproduzindo exatamente o resultado
    // anterior (limit(3) por conversa + reverse() para ordem ascendente).
    const { data: mensagens } = await supabase
      .from('messages')
      .select('conversation_id, conteudo, direcao, enviado_em')
      .in('conversation_id', conversaIds)
      .order('enviado_em', { ascending: false })

    for (const m of mensagens ?? []) {
      const cId = m.conversation_id as string
      const lista = ultimasMensagensMap.get(cId) ?? []
      if (lista.length < 3) {
        lista.push({
          conteudo: m.conteudo as string | null,
          direcao: m.direcao as string,
          enviado_em: m.enviado_em as string,
        })
        ultimasMensagensMap.set(cId, lista)
      }
    }
    // As mensagens foram inseridas em ordem decrescente; inverte para ascendente
    // (mesmo formato que o .reverse() produzia por conversa).
    for (const lista of ultimasMensagensMap.values()) {
      lista.reverse()
    }
  }

  // Buscar tags das conversas
  const { data: tagsLinks } = conversaIds.length > 0
    ? await supabase
        .from('conversation_tag_links')
        .select('conversation_id, tag:tag_id(id, nome, cor)')
        .in('conversation_id', conversaIds)
    : { data: [] }

  // Mapear por lead_id
  const conversaPorLead = new Map<string, { conversa_id: string; ultima_mensagem: string | null; ultima_mensagem_em: string | null; ultimas_mensagens: { conteudo: string | null; direcao: string; enviado_em: string }[]; status_conversa: string; tags: { id: string; nome: string; cor: string }[] }>()
  for (const conv of conversasRaw ?? []) {
    if (!conv.lead_id || conversaPorLead.has(conv.lead_id)) continue
    const msgs = ultimasMensagensMap.get(conv.id) ?? []
    const ultimaMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null
    const tags = (tagsLinks ?? [])
      .filter((t) => t.conversation_id === conv.id)
      .map((t) => {
        const tag = Array.isArray(t.tag) ? t.tag[0] : t.tag
        return tag as { id: string; nome: string; cor: string }
      })
      .filter(Boolean)
    conversaPorLead.set(conv.lead_id, {
      conversa_id: conv.id,
      ultima_mensagem: ultimaMsg?.conteudo ?? null,
      ultima_mensagem_em: ultimaMsg?.enviado_em ?? conv.ultima_mensagem_em,
      ultimas_mensagens: msgs,
      status_conversa: conv.status,
      tags,
    })
  }

  const deals = (dealsRaw ?? []).map((d) => {
    const lead = Array.isArray(d.lead) ? d.lead[0] ?? null : d.lead as { id: string; nome: string; telefone: string | null; foto_perfil_url: string | null; origem: LeadOrigem; status: string } | null
    const conversaInfo = lead ? conversaPorLead.get(lead.id) ?? null : null
    return {
      id: d.id as string,
      titulo: d.titulo as string,
      valor_estimado: d.valor_estimado as number | null,
      estagio_id: d.estagio_id as string,
      ganho: d.ganho as boolean | null,
      motivo_perda: d.motivo_perda as string | null,
      data_fechamento_prevista: d.data_fechamento_prevista as string | null,
      atualizado_em: d.atualizado_em as string,
      contato: Array.isArray(d.contato) ? d.contato[0] ?? null : d.contato as { id: string; nome: string } | null,
      responsavel: Array.isArray(d.responsavel) ? d.responsavel[0] ?? null : d.responsavel as { id: string; nome: string } | null,
      lead: lead ? {
        id: lead.id,
        nome: lead.nome,
        telefone: lead.telefone,
        foto_perfil_url: lead.foto_perfil_url,
        origem: lead.origem as LeadOrigem,
        status: lead.status,
      } : null,
      ultima_mensagem: conversaInfo?.ultima_mensagem ?? null,
      ultima_mensagem_em: conversaInfo?.ultima_mensagem_em ?? null,
      ultimas_mensagens: (conversaInfo?.ultimas_mensagens ?? []).map(msg => ({
        ...msg,
        id: msg.conteudo?.substring(0, 36) || Date.now().toString()
      })),
      status_conversa: conversaInfo?.status_conversa ?? null,
      conversa_id: conversaInfo?.conversa_id ?? null,
      tags: conversaInfo?.tags ?? [],
    }
  })

  const podeEditarEtapas = perfil.cargo === 'admin' || perfil.cargo === 'gestor'

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pipeline de Vendas</h1>
          <p className="mt-0.5 text-sm text-slate-500">{pipeline.nome}</p>
        </div>
        {podeEditarEtapas && (
          <Link
            href="/pipeline/configurar"
            className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            <Settings className="h-4 w-4" />
            Configurar etapas
          </Link>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          pipelineId={pipeline.id}
          etapas={etapas ?? []}
          dealsIniciais={deals}
          cargo={perfil.cargo as UserRole}
          organizationId={perfil.organization_id}
        />
      </div>
    </div>
  )
}
