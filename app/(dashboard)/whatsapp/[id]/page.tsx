import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ConversaLayout } from '@/components/whatsapp/conversa-layout'
import { nomeExibicao } from '@/lib/telefone'

export default async function ConversaPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, nome')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const { data: conversa } = await supabase
    .from('conversations')
    .select('id, telefone_externo, status, responsavel_id, deal_id, lead_id, whatsapp_instance_id')
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!conversa) notFound()

  // Instância (busca separada)
  let instancia: { nome: string; status_conexao: string } | null = null
  if (conversa.whatsapp_instance_id) {
    const { data: instRaw } = await supabase
      .from('whatsapp_instances')
      .select('nome, status_conexao')
      .eq('id', conversa.whatsapp_instance_id as string)
      .single()
    instancia = instRaw ?? null
  }

  // Lead (busca separada para não crashar se lead foi excluído)
  let leadData: { id: string; nome: string | null } | null = null
  if (conversa.lead_id) {
    const { data: leadRaw } = await supabase
      .from('leads')
      .select('id, nome')
      .eq('id', conversa.lead_id as string)
      .single()
    leadData = leadRaw ?? null
  }

  // Mensagens (sem join no responsavel para evitar crash)
  const { data: mensagensRaw } = await supabase
    .from('messages')
    .select('id, direcao, conteudo, tipo_midia, url_midia, enviado_em, responsavel_id')
    .eq('conversation_id', id)
    .eq('organization_id', perfil.organization_id)
    .order('enviado_em', { ascending: true })
    .limit(200)

  // Usuários da org (para transferência e nomes nas mensagens)
  const { data: usuariosRaw } = await supabase
    .from('profiles')
    .select('id, nome')
    .eq('organization_id', perfil.organization_id)
    .eq('ativo', true)
    .order('nome')

  const usuarios = (usuariosRaw ?? []) as { id: string; nome: string }[]
  const usuariosMap = new Map(usuarios.map((u) => [u.id, u.nome]))

  const mensagens = (mensagensRaw ?? []).map((m) => ({
    id: m.id as string,
    direcao: m.direcao as 'enviada' | 'recebida',
    conteudo: m.conteudo as string | null,
    tipo_midia: (m.tipo_midia as string) ?? 'texto',
    url_midia: m.url_midia as string | null,
    enviado_em: m.enviado_em as string,
    responsavel: m.responsavel_id ? { nome: usuariosMap.get(m.responsavel_id as string) ?? 'Desconhecido' } : null,
  }))

  // Tags da conversa
  const { data: tagLinksRaw } = await supabase
    .from('conversation_tag_links')
    .select('tag:conversation_tags!tag_id(id, nome, cor)')
    .eq('conversation_id', id)

  const tags = (tagLinksRaw ?? []).map((l) => {
    const t = (Array.isArray(l.tag) ? l.tag[0] : l.tag) as { id: string; nome: string; cor: string } | null
    return t
  }).filter(Boolean) as { id: string; nome: string; cor: string }[]

  // Todas as tags da org
  const { data: todasTagsRaw } = await supabase
    .from('conversation_tags')
    .select('id, nome, cor')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  const todasTags = (todasTagsRaw ?? []) as { id: string; nome: string; cor: string }[]

  // Anotações (sem join no autor para evitar crash)
  const { data: notasRaw } = await supabase
    .from('conversation_notes')
    .select('id, conteudo, criado_em, autor_id')
    .eq('conversation_id', id)
    .eq('organization_id', perfil.organization_id)
    .order('criado_em', { ascending: false })
    .limit(50)

  const notas = (notasRaw ?? []).map((n) => ({
    id: n.id as string,
    conteudo: n.conteudo as string,
    criado_em: n.criado_em as string,
    autor_nome: usuariosMap.get(n.autor_id as string) ?? 'Desconhecido',
  }))

  // Deal vinculado (busca separada para não crashar se deal/estágio foi excluído)
  let dealVinculado: { id: string; titulo: string; valor_estimado: number | null; estagio_nome: string } | null = null
  if (conversa.deal_id) {
    const { data: dealRaw } = await supabase
      .from('deals')
      .select('id, titulo, valor_estimado, estagio_id')
      .eq('id', conversa.deal_id as string)
      .eq('organization_id', perfil.organization_id)
      .single()
    if (dealRaw) {
      let estagioNome = ''
      if (dealRaw.estagio_id) {
        const { data: estagioRaw } = await supabase
          .from('pipeline_stages')
          .select('nome')
          .eq('id', dealRaw.estagio_id)
          .single()
        estagioNome = estagioRaw?.nome ?? ''
      }
      dealVinculado = {
        id: dealRaw.id as string,
        titulo: dealRaw.titulo as string,
        valor_estimado: dealRaw.valor_estimado as number | null,
        estagio_nome: estagioNome,
      }
    }
  }

  // Responsável
  let responsavel: { id: string; nome: string } | null = null
  if (conversa.responsavel_id) {
    responsavel = usuarios.find((u) => u.id === (conversa.responsavel_id as string)) ?? null
  }

  const titulo = nomeExibicao(leadData?.nome ?? null, (conversa.telefone_externo as string) ?? '')

  return (
    <ConversaLayout
      conversaId={id}
      titulo={titulo}
      telefone={(conversa.telefone_externo as string) ?? ''}
      instanciaNome={instancia?.nome ?? null}
      instanciaConectada={instancia?.status_conexao === 'conectado'}
      leadId={leadData?.id ?? null}
      status={(conversa.status as 'nao_atendida' | 'em_atendimento' | 'aguardando_cliente' | 'finalizada') ?? 'nao_atendida'}
      responsavel={responsavel}
      tags={tags}
      todasTags={todasTags}
      notas={notas}
      usuarios={usuarios}
      dealVinculado={dealVinculado}
      mensagens={mensagens}
      organizationId={perfil.organization_id}
      perfilId={perfil.id}
      perfilNome={perfil.nome as string}
    />
  )
}
