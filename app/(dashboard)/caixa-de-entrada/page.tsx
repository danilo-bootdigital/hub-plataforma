import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ListaItensInbox } from '@/components/caixa-de-entrada/lista-itens-inbox'

export default async function CaixaDeEntradaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const orgId = perfil.organization_id
  const isVendedor = perfil.cargo === 'vendedor'
  const isAtendimento = perfil.cargo === 'atendimento'

  // Calcular datas de forma pura
  const agora = new Date()
  const hoje = agora.toISOString()
  const ontem = new Date(agora.getTime() - 24 * 60 * 60 * 1000).toISOString()

  // Query 1: Mensagens não respondidas (RPC)
  const queryMensagens = supabase.rpc('mensagens_nao_respondidas', {
    p_org_id: orgId,
    p_limit: 50,
  })

  // Query 2: Tarefas vencidas ou para hoje
  let queryTarefas = supabase
    .from('tasks')
    .select('id, titulo, tipo, data_vencimento, responsavel:profiles!responsavel_id(nome), lead:leads!lead_id(id, nome)')
    .eq('organization_id', orgId)
    .eq('concluida', false)
    .lte('data_vencimento', hoje)
    .order('data_vencimento')
    .limit(50)

  if (isVendedor || isAtendimento) {
    queryTarefas = queryTarefas.eq('responsavel_id', perfil.id)
  }

  // Query 3: Atividades recentes (24h)
  let queryAtividades = supabase
    .from('activities')
    .select('id, tipo, descricao, criado_em, lead:leads!lead_id(id, nome)')
    .eq('organization_id', orgId)
    .gte('criado_em', ontem)
    .order('criado_em', { ascending: false })
    .limit(30)

  if (isVendedor) {
    // Vendedor vê apenas atividades dos seus leads
    const { data: leadsIds } = await supabase
      .from('leads')
      .select('id')
      .eq('organization_id', orgId)
      .eq('responsavel_id', perfil.id)

    const ids = (leadsIds ?? []).map((l) => l.id)
    if (ids.length > 0) {
      queryAtividades = queryAtividades.in('lead_id', ids)
    } else {
      queryAtividades = queryAtividades.eq('autor_id', perfil.id)
    }
  }

  const [
    { data: mensagensRaw },
    { data: tarefasRaw },
    { data: atividadesRaw },
  ] = await Promise.all([queryMensagens, queryTarefas, queryAtividades])

  // Filtrar mensagens por instância do vendedor se necessário
  let mensagens = (mensagensRaw ?? []) as {
    conversa_id: string
    telefone_externo: string
    lead_nome: string | null
    lead_id: string | null
    conteudo: string | null
    enviado_em: string
  }[]

  if (isVendedor || isAtendimento) {
    const { data: instancias } = await supabase
      .from('whatsapp_instances')
      .select('id')
      .eq('organization_id', orgId)
      .or(`vendedor_id.eq.${perfil.id},compartilhado.eq.true`)

    if (instancias && instancias.length > 0) {
      const instanciaIds = instancias.map((i) => i.id)
      const { data: conversasDoVendedor } = await supabase
        .from('conversations')
        .select('id')
        .eq('organization_id', orgId)
        .in('whatsapp_instance_id', instanciaIds)

      const conversaIds = new Set((conversasDoVendedor ?? []).map((c) => c.id))
      mensagens = mensagens.filter((m) => conversaIds.has(m.conversa_id))
    } else {
      mensagens = []
    }
  }

  const tarefas = (tarefasRaw ?? []).map((t) => ({
    id: t.id as string,
    titulo: t.titulo as string,
    data_vencimento: t.data_vencimento as string | null,
    responsavel: (Array.isArray(t.responsavel) ? t.responsavel[0] : t.responsavel) as { nome: string } | null,
    lead: (Array.isArray(t.lead) ? t.lead[0] : t.lead) as { id: string; nome: string | null } | null,
  }))

  const atividades = (atividadesRaw ?? []).map((a) => ({
    id: a.id as string,
    tipo: a.tipo as string,
    descricao: a.descricao as string,
    criado_em: a.criado_em as string,
    lead: (Array.isArray(a.lead) ? a.lead[0] : a.lead) as { id: string; nome: string | null } | null,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Caixa de Entrada</h1>
        <p className="mt-1 text-sm text-slate-500">
          Mensagens pendentes, tarefas vencidas e atividades recentes.
        </p>
      </div>
      <ListaItensInbox
        mensagens={mensagens}
        tarefas={tarefas}
        atividades={atividades}
      />
    </div>
  )
}
