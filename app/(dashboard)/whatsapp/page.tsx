import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Forçar renderização no servidor para sempre receber searchParams atualizados
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { listarConversas, type FiltrosConversa, type ConversaResumo } from '@/lib/queries/conversas'
import { buscarKPIsWhatsApp } from '@/lib/queries/kpis-whatsapp'
import { buscarTotaisCliente } from '@/lib/queries/totais-cliente'
import { WhatsappShell } from '@/components/whatsapp/whatsapp-shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Settings } from 'lucide-react'
import type {
  CentralSearchParams,
  WhatsappInstanciaResumo,
  ConversaCompleta,
  PerfilCentral,
  UsuarioResumo,
  TagConversa,
} from '@/types/whatsapp-central'
import type { ConversaStatus, WhatsappStatus } from '@/types/database'

// Helper para formatar data no server (evita hydration mismatch)
function formatarDataServer(dataIso: string | null): string | null {
  if (!dataIso) return null
  return new Date(dataIso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

// Helper para carregar conversa ativa (com dados completos: notas, deal, tags, mensagens)
async function carregarConversaAtiva(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  conversaId: string,
): Promise<{
  conversa: ConversaCompleta | null
  totais: Awaited<ReturnType<typeof buscarTotaisCliente>> | null
  notas: Array<{ id: string; conteudo: string; criado_em: string; autor_nome: string | null }>
  deal: { id: string; titulo: string; valor_estimado: number | null; estagio_nome: string | null } | null
  tags: TagConversa[]
  mensagensIniciais: Array<{
    id: string
    conteudo: string | null
    direcao: 'enviada' | 'recebida'
    tipo_midia: string
    url_midia: string | null
    enviado_em: string
  }>
}> {
  // 1) Carrega conversa base (com JOINs) + totais em paralelo
  const [convRes, totais] = await Promise.all([
    supabase
      .from('conversations')
      .select(`
        id, organization_id, whatsapp_instance_id, lead_id, contato_id,
        telefone_externo, status, responsavel_id, ultima_mensagem_em,
        nao_lidas, arquivada_em, nome_contato, name_source,
        whatsapp_push_name, is_name_manually_edited,
        criado_em, atualizado_em,
        responsavel:profiles!conversations_responsavel_id_fkey(id, nome),
        lead:leads!conversations_lead_id_fkey(id, nome, telefone, email),
        contato:contacts!conversations_contato_id_fkey(id, nome, telefone, email),
        instancia:whatsapp_instances!conversations_whatsapp_instance_id_fkey(id, nome)
      `)
      .eq('id', conversaId)
      .eq('organization_id', orgId)
      .maybeSingle(),
    buscarTotaisCliente(orgId, conversaId),
  ])

  const raw = convRes.data as any
  if (!raw) {
    return { conversa: null, totais, notas: [], deal: null, tags: [], mensagensIniciais: [] }
  }

  const conversa: ConversaCompleta = {
    id: raw.id,
    organization_id: raw.organization_id,
    whatsapp_instance_id: raw.whatsapp_instance_id,
    lead_id: raw.lead_id,
    contato_id: raw.contato_id,
    telefone_externo: raw.telefone_externo,
    status: raw.status,
    responsavel_id: raw.responsavel_id,
    ultima_mensagem_em: raw.ultima_mensagem_em,
    nao_lidas: raw.nao_lidas,
    arquivada_em: raw.arquivada_em,
    nome_contato: raw.nome_contato,
    name_source: raw.name_source,
    whatsapp_push_name: raw.whatsapp_push_name,
    is_name_manually_edited: raw.is_name_manually_edited,
    criado_em: raw.criado_em,
    atualizado_em: raw.atualizado_em,
    responsavel: Array.isArray(raw.responsavel) ? raw.responsavel[0] ?? null : raw.responsavel ?? null,
    lead: Array.isArray(raw.lead) ? raw.lead[0] ?? null : raw.lead ?? null,
    contato: Array.isArray(raw.contato) ? raw.contato[0] ?? null : raw.contato ?? null,
    instancia: Array.isArray(raw.instancia) ? raw.instancia[0] ?? null : raw.instancia ?? null,
  }

  // Resolução de nome IDÊNTICA à da lista (listarConversas) para evitar
  // divergência entre a lista lateral e o cabeçalho do chat.
  // Prioridade: manual -> contato.nome -> lead.nome -> nome_contato -> telefone.
  // Nunca usa responsável/atendente/vendedor.
  conversa.nome_contato =
    conversa.name_source === 'manual' && conversa.nome_contato
      ? conversa.nome_contato
      : conversa.contato?.nome
        ? conversa.contato.nome
        : conversa.lead?.nome
          ? conversa.lead.nome
          : conversa.nome_contato
            ? conversa.nome_contato
            : conversa.telefone_externo

  // 2) Carrega dados complementares em paralelo
  //    IMPORTANTE: deals NAO tem conversation_id. Usamos lead_id da conversa.
  //    Se conversa nao tem lead, dealPromise resolve com null sem query.
  const leadIdParaDeal = conversa.lead_id
  const dealPromise = leadIdParaDeal
    ? supabase
        .from('deals')
        .select(`
          id, titulo, valor_estimado,
          estagio:pipeline_stages!deals_estagio_id_fkey(id, nome)
        `)
        .eq('lead_id', leadIdParaDeal)
        .eq('organization_id', orgId)
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle()
    : (async () => ({ data: null, error: null }))()

  const [notasRes, dealRes, tagsRes, msgsRes] = await Promise.all([
    supabase
      .from('conversation_notes')
      .select(`
        id, conteudo, criado_em,
        autor:profiles!conversation_notes_autor_id_fkey(id, nome)
      `)
      .eq('conversation_id', conversaId)
      .eq('organization_id', orgId)
      .order('criado_em', { ascending: false }),
    dealPromise,
    supabase
      .from('conversation_tag_links')
      .select(`
        tag:conversation_tags!conversation_tag_links_tag_id_fkey(id, nome, cor)
      `)
      .eq('conversation_id', conversaId),
    supabase
      .from('messages')
      .select('id, conteudo, direcao, tipo_midia, url_midia, enviado_em')
      .eq('conversation_id', conversaId)
      .order('enviado_em', { ascending: false })
      .limit(30), // seed leve p/ deep-link; ThreadMensagens pagina o restante no scroll
  ])

  const notas = (notasRes.data ?? []).map((n: any) => ({
    id: n.id,
    conteudo: n.conteudo,
    criado_em: n.criado_em,
    autor_nome: Array.isArray(n.autor) ? n.autor[0]?.nome ?? null : n.autor?.nome ?? null,
  }))

  const dealRaw = dealRes.data as any
  const deal = dealRaw
    ? {
        id: dealRaw.id,
        titulo: dealRaw.titulo,
        valor_estimado: dealRaw.valor_estimado,
        estagio_nome: Array.isArray(dealRaw.estagio) ? dealRaw.estagio[0]?.nome ?? null : dealRaw.estagio?.nome ?? null,
      }
    : null

  const tags: TagConversa[] = (tagsRes.data ?? []).map((t: any) => {
    const tag = Array.isArray(t.tag) ? t.tag[0] : t.tag
    return { id: tag.id, nome: tag.nome, cor: tag.cor }
  })

  // Mensagens: inverter ordem para ficar cronologica (ThreadMensagens espera assim)
  const mensagensIniciais = (msgsRes.data ?? []).slice().reverse()

  return { conversa, totais, notas, deal, tags, mensagensIniciais }
}

// Helper para buscar ultima mensagem por conversa (formato antigo)
async function buscarUltimasMensagens(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  conversaIds: string[],
): Promise<Record<string, { conteudo: string | null; enviado_em: string | null; formatada: string | null }>> {
  if (conversaIds.length === 0) return {}
  try {
    const { data } = await supabase.rpc('ultimas_mensagens_por_conversa', {
      p_conversation_ids: conversaIds,
      p_org_id: orgId,
    })
    const result: Record<string, { conteudo: string | null; enviado_em: string | null; formatada: string | null }> = {}
    ;(data ?? []).forEach((m: { conversation_id: string; conteudo: string | null; enviado_em: string | null }) => {
      result[m.conversation_id] = {
        conteudo: m.conteudo,
        enviado_em: m.enviado_em,
        formatada: formatarDataServer(m.enviado_em),
      }
    })
    return result
  } catch (error) {
    console.error('Erro ao buscar ultimas mensagens:', error)
    return {}
  }
}

export default async function WhatsappPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<CentralSearchParams>
}) {
  const supabase = await createClient()

  // Next 16: searchParams é assíncrono. Sem o await, searchParams.conversaId
  // (e demais filtros) ficavam undefined e a conversa nunca abria no painel.
  const searchParams = await searchParamsPromise

  // 1) Autenticacao
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, cargo, organization_id, nome')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const perfilCentral: PerfilCentral = {
    id: perfil.id,
    cargo: perfil.cargo as 'admin' | 'gestor' | 'vendedor' | 'atendimento' | 'financeiro' | 'suporte',
    organization_id: perfil.organization_id,
    nome: perfil.nome,
  }

  // 2) Parse dos filtros da URL
  const offset = parseInt(searchParams.offset ?? '0', 10)
  const limite = 40

  const filtros: FiltrosConversa = {
    busca: searchParams.busca,
    status: (searchParams.status as FiltrosConversa['status']) ?? null,
    responsavelId: searchParams.responsavelId ?? null,
    instanciaId: searchParams.instanciaId ?? null,
    somenteNaoLidas: searchParams.somenteNaoLidas === '1',
    semResponsavel: searchParams.semResponsavel === '1',
    comLead: searchParams.comLead === 'true' ? true
          : searchParams.comLead === 'false' ? false : null,
    comContato: searchParams.comContato === 'true' ? true
              : searchParams.comContato === 'false' ? false : null,
  }

  // 3) Buscar dados principais em paralelo (independentes)
  const [instanciasRes, conversasRes, kpisRes, usuariosRes, tagsRes] = await Promise.all([
    supabase
      .from('whatsapp_instances')
      .select('id, nome, status_conexao, evolution_instance_name, numero, vendedor_id, compartilhado')
      .eq('organization_id', perfil.organization_id),
    listarConversas(perfil.organization_id, perfil.id, perfil.cargo, filtros, { limite, offset }),
    buscarKPIsWhatsApp(perfil.organization_id, perfil.id, perfil.cargo),
    supabase
      .from('profiles')
      .select('id, nome')
      .eq('organization_id', perfil.organization_id)
      .eq('ativo', true)
      .order('nome'),
    supabase
      .from('conversation_tags')
      .select('id, nome, cor')
      .eq('organization_id', perfil.organization_id)
      .order('nome'),
  ])

  const instancias: WhatsappInstanciaResumo[] = (instanciasRes.data ?? []).map((i: any) => ({
    id: i.id,
    nome: i.nome,
    status_conexao: i.status_conexao as WhatsappStatus,
    numero: i.numero,
    vendedor_id: i.vendedor_id,
    compartilhado: i.compartilhado,
  }))

  // 4) Extrair conversas e debug do resultado
  const conversasRaw = conversasRes
  const conversasResult = Array.isArray(conversasRaw) ? conversasRaw : (conversasRaw?.conversas ?? [])
  const debugConversas = Array.isArray(conversasRaw) ? null : (conversasRaw?.debug ?? { minCount: 0, queryError: null })

  // 4) Buscar ultimas mensagens (apenas conteudo) - data vem de conversations.ultima_mensagem_em
  const conversaIds = conversasResult.map((c: any) => c.id)
  const ultimasMensagensMap = await buscarUltimasMensagens(
    supabase,
    perfil.organization_id,
    conversaIds,
  )

  // 5) Enriquecer conversas com ultima mensagem (conteudo via RPC) + data formatada (via conversations.ultima_mensagem_em)
  const conversas: ConversaResumo[] = conversasResult.map((c: any) => ({
    ...c,
    ultima_mensagem: ultimasMensagensMap[c.id]?.conteudo ?? '',
    ultima_mensagem_em_formatada: formatarDataServer(c.ultima_mensagem_em),
  }))

  const kpis = kpisRes
  const usuarios: UsuarioResumo[] = (usuariosRes.data ?? []).map((u: any) => ({ id: u.id, nome: u.nome }))
  const tags: TagConversa[] = (tagsRes.data ?? []).map((t: any) => ({ id: t.id, nome: t.nome, cor: t.cor }))

  // 6) Empty state: sem instancias
  if (instancias.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-2">WhatsApp</h1>
        <p className="text-muted-foreground mb-8">Gerencie suas conversas do WhatsApp</p>
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span>Nenhuma instancia configurada</span>
            </CardTitle>
            <CardDescription>Para comecar, configure uma instancia do WhatsApp.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/configuracoes-whatsapp">
              <Button>
                <Settings className="h-4 w-4 mr-2" />
                Configurar WhatsApp
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 7) Vendedor sem instancia atribuida
  if (perfil.cargo === 'vendedor' || perfil.cargo === 'atendimento') {
    const temAcesso = instancias.some(
      (i) => i.vendedor_id === perfil.id || i.compartilhado
    )
    if (!temAcesso) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma instancia atribuida</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Voce nao tem acesso a nenhuma instancia.
            </p>
            <Link href="/configuracoes-whatsapp">
              <Button>Solicitar Acesso</Button>
            </Link>
          </div>
        </div>
      )
    }
  }

  // 8) Se conversaId ativo, carregar conversa + dados complementares
  let conversaAtiva: ConversaCompleta | null = null
  let totais: Awaited<ReturnType<typeof buscarTotaisCliente>> | null = null
  let notasAtivas: Array<{ id: string; conteudo: string; criado_em: string; autor_nome: string | null }> = []
  let dealAtivo: { id: string; titulo: string; valor_estimado: number | null; estagio_nome: string | null } | null = null
  let tagsAtivas: TagConversa[] = []
  let mensagensIniciais: Array<{
    id: string; conteudo: string | null; direcao: 'enviada' | 'recebida'
    tipo_midia: string; url_midia: string | null; enviado_em: string
  }> = []

  if (searchParams.conversaId) {
    const resultado = await carregarConversaAtiva(
      supabase,
      perfil.organization_id,
      searchParams.conversaId,
    )
    conversaAtiva = resultado.conversa
    totais = resultado.totais
    notasAtivas = resultado.notas
    dealAtivo = resultado.deal
    tagsAtivas = resultado.tags
    mensagensIniciais = resultado.mensagensIniciais
  }

  // 9) Renderiza a Central de Atendimento
  return (
    <WhatsappShell
      instancias={instancias}
      conversas={conversas}
      kpis={kpis}
      usuarios={usuarios}
      tags={tags}
      perfil={perfilCentral}
      conversaAtiva={conversaAtiva}
      totais={totais}
      painelAberto={searchParams.painel === '1'}
      notasAtivas={notasAtivas}
      dealAtivo={dealAtivo}
      tagsAtivas={tagsAtivas}
      mensagensIniciais={mensagensIniciais}
      pagination={{ offset, limite, total: kpis.abertas }}
    />
  )
}
