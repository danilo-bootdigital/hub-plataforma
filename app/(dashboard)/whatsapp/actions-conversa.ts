'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function getPerfilAutenticado() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo, nome')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')
  return { supabase, perfil }
}

// ── Status da conversa ──────────────────────────────────────────

export async function alterarStatusConversa(
  conversaId: string,
  status: 'nao_atendida' | 'em_atendimento' | 'aguardando_cliente' | 'finalizada'
) {
  const { supabase, perfil } = await getPerfilAutenticado()

  await supabase
    .from('conversations')
    .update({ status, atualizado_em: new Date().toISOString() })
    .eq('id', conversaId)
    .eq('organization_id', perfil.organization_id)

  await supabase.from('audit_logs').insert({
    organization_id: perfil.organization_id,
    usuario_id: perfil.id,
    acao: 'conversa_status_alterado',
    tabela_afetada: 'conversations',
    registro_id: conversaId,
    dados_novos: { status },
  })

  revalidatePath('/whatsapp')
}

// ── Atribuir responsável ────────────────────────────────────────

export async function atribuirResponsavel(conversaId: string, responsavelId: string | null) {
  const { supabase, perfil } = await getPerfilAutenticado()

  await supabase
    .from('conversations')
    .update({ responsavel_id: responsavelId, atualizado_em: new Date().toISOString() })
    .eq('id', conversaId)
    .eq('organization_id', perfil.organization_id)

  revalidatePath('/whatsapp')
}

// ── Transferir conversa ─────────────────────────────────────────

export async function transferirConversa(
  conversaId: string,
  paraUsuarioId: string,
  motivo?: string
) {
  const { supabase, perfil } = await getPerfilAutenticado()

  const { data: conversa } = await supabase
    .from('conversations')
    .select('responsavel_id')
    .eq('id', conversaId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!conversa) throw new Error('Conversa não encontrada.')

  await supabase.from('conversation_transfers').insert({
    organization_id: perfil.organization_id,
    conversation_id: conversaId,
    de_usuario_id: (conversa.responsavel_id as string) ?? perfil.id,
    para_usuario_id: paraUsuarioId,
    motivo: motivo || null,
  })

  await supabase
    .from('conversations')
    .update({
      responsavel_id: paraUsuarioId,
      status: 'em_atendimento',
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', conversaId)
    .eq('organization_id', perfil.organization_id)

  await supabase.from('audit_logs').insert({
    organization_id: perfil.organization_id,
    usuario_id: perfil.id,
    acao: 'conversa_transferida',
    tabela_afetada: 'conversations',
    registro_id: conversaId,
    dados_novos: { para_usuario_id: paraUsuarioId, motivo },
  })

  revalidatePath('/whatsapp')
}

// ── Tags ────────────────────────────────────────────────────────

export async function criarTag(nome: string, cor: string = '#6366f1') {
  if (!nome.trim() || nome.trim().length > 50) throw new Error('Nome da tag deve ter entre 1 e 50 caracteres.')
  if (!/^#[0-9a-fA-F]{6}$/.test(cor)) throw new Error('Cor inválida.')

  const { supabase, perfil } = await getPerfilAutenticado()

  const { data, error } = await supabase
    .from('conversation_tags')
    .insert({ organization_id: perfil.organization_id, nome: nome.trim(), cor })
    .select('id, nome, cor')
    .single()

  if (error) throw new Error(error.message.includes('duplicate') ? 'Tag já existe.' : error.message)
  revalidatePath('/whatsapp')
  return data
}

export async function adicionarTagConversa(conversaId: string, tagId: string) {
  const { supabase, perfil } = await getPerfilAutenticado()

  // Verificar que a conversa pertence à org
  const { count } = await supabase
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .eq('id', conversaId)
    .eq('organization_id', perfil.organization_id)

  if (!count) throw new Error('Conversa não encontrada.')

  await supabase
    .from('conversation_tag_links')
    .upsert({ conversation_id: conversaId, tag_id: tagId })

  revalidatePath('/whatsapp')
}

export async function removerTagConversa(conversaId: string, tagId: string) {
  const { supabase, perfil } = await getPerfilAutenticado()

  const { count } = await supabase
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .eq('id', conversaId)
    .eq('organization_id', perfil.organization_id)

  if (!count) throw new Error('Conversa não encontrada.')

  await supabase
    .from('conversation_tag_links')
    .delete()
    .eq('conversation_id', conversaId)
    .eq('tag_id', tagId)

  revalidatePath('/whatsapp')
}

export async function listarTags() {
  const { supabase, perfil } = await getPerfilAutenticado()

  const { data } = await supabase
    .from('conversation_tags')
    .select('id, nome, cor')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  return data ?? []
}

// ── Templates (respostas rápidas) ───────────────────────────────

export async function listarTemplates() {
  const { supabase, perfil } = await getPerfilAutenticado()

  const { data } = await supabase
    .from('message_templates')
    .select('id, nome, conteudo, categoria')
    .eq('organization_id', perfil.organization_id)
    .order('categoria')
    .order('nome')

  return (data ?? []) as { id: string; nome: string; conteudo: string; categoria: string | null }[]
}

export async function criarTemplate(nome: string, conteudo: string, categoria: string | null) {
  if (!nome.trim()) throw new Error('Nome é obrigatório.')
  if (!conteudo.trim()) throw new Error('Conteúdo é obrigatório.')

  const { supabase, perfil } = await getPerfilAutenticado()

  const { data, error } = await supabase
    .from('message_templates')
    .insert({
      organization_id: perfil.organization_id,
      nome: nome.trim(),
      conteudo: conteudo.trim(),
      categoria: categoria?.trim() || null,
      criado_por: perfil.id,
    })
    .select('id, nome, conteudo, categoria')
    .single()

  if (error) throw new Error(`Erro ao criar modelo: ${error.message}`)
  return data as { id: string; nome: string; conteudo: string; categoria: string | null }
}

export async function editarTemplate(id: string, nome: string, conteudo: string, categoria: string | null) {
  if (!nome.trim()) throw new Error('Nome é obrigatório.')
  if (!conteudo.trim()) throw new Error('Conteúdo é obrigatório.')

  const { supabase, perfil } = await getPerfilAutenticado()

  const { error } = await supabase
    .from('message_templates')
    .update({
      nome: nome.trim(),
      conteudo: conteudo.trim(),
      categoria: categoria?.trim() || null,
    })
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao editar modelo: ${error.message}`)
}

export async function excluirTemplate(id: string) {
  const { supabase, perfil } = await getPerfilAutenticado()

  const { error } = await supabase
    .from('message_templates')
    .delete()
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao excluir modelo: ${error.message}`)
}

// ── Anotações internas ──────────────────────────────────────────

export async function criarAnotacao(conversaId: string, conteudo: string) {
  if (!conteudo.trim()) throw new Error('Anotação não pode estar vazia.')
  if (conteudo.trim().length > 5000) throw new Error('Anotação muito longa (máximo 5000 caracteres).')

  const { supabase, perfil } = await getPerfilAutenticado()

  const { data, error } = await supabase
    .from('conversation_notes')
    .insert({
      organization_id: perfil.organization_id,
      conversation_id: conversaId,
      autor_id: perfil.id,
      conteudo: conteudo.trim(),
    })
    .select('id, conteudo, criado_em')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath(`/whatsapp/${conversaId}`)
  return { ...data, autor_nome: perfil.nome }
}

export async function listarAnotacoes(conversaId: string) {
  const { supabase, perfil } = await getPerfilAutenticado()

  const { data } = await supabase
    .from('conversation_notes')
    .select('id, conteudo, criado_em, autor:profiles!autor_id(nome)')
    .eq('conversation_id', conversaId)
    .eq('organization_id', perfil.organization_id)
    .order('criado_em', { ascending: false })

  return (data ?? []).map((n) => ({
    id: n.id as string,
    conteudo: n.conteudo as string,
    criado_em: n.criado_em as string,
    autor_nome: ((Array.isArray(n.autor) ? n.autor[0] : n.autor) as { nome: string } | null)?.nome ?? 'Desconhecido',
  }))
}

// ── Vínculo com Deal ────────────────────────────────────────────

export async function vincularDeal(conversaId: string, dealId: string) {
  const { supabase, perfil } = await getPerfilAutenticado()

  await supabase
    .from('conversations')
    .update({ deal_id: dealId, atualizado_em: new Date().toISOString() })
    .eq('id', conversaId)
    .eq('organization_id', perfil.organization_id)

  await supabase.from('audit_logs').insert({
    organization_id: perfil.organization_id,
    usuario_id: perfil.id,
    acao: 'conversa_deal_vinculado',
    tabela_afetada: 'conversations',
    registro_id: conversaId,
    dados_novos: { deal_id: dealId },
  })

  revalidatePath(`/whatsapp/${conversaId}`)
}

export async function desvincularDeal(conversaId: string) {
  const { supabase, perfil } = await getPerfilAutenticado()

  await supabase
    .from('conversations')
    .update({ deal_id: null, atualizado_em: new Date().toISOString() })
    .eq('id', conversaId)
    .eq('organization_id', perfil.organization_id)

  revalidatePath(`/whatsapp/${conversaId}`)
}

export async function listarDeals() {
  const { supabase, perfil } = await getPerfilAutenticado()

  const { data } = await supabase
    .from('deals')
    .select('id, titulo, valor_estimado, estagio:pipeline_stages!estagio_id(nome)')
    .eq('organization_id', perfil.organization_id)
    .is('ganho', null)
    .order('criado_em', { ascending: false })
    .limit(50)

  return (data ?? []).map((d) => ({
    id: d.id as string,
    titulo: d.titulo as string,
    valor_estimado: d.valor_estimado as number | null,
    estagio_nome: ((Array.isArray(d.estagio) ? d.estagio[0] : d.estagio) as { nome: string } | null)?.nome ?? '',
  }))
}

// ── Editar nome do contato ──────────────────────────────────────

export async function editarNomeConversa(conversaId: string, novoNome: string) {
  if (!novoNome.trim()) throw new Error('Nome não pode estar vazio.')
  if (novoNome.trim().length > 200) throw new Error('Nome muito longo.')

  const { supabase, perfil } = await getPerfilAutenticado()

  // Buscar conversa e lead vinculado
  const { data: conversa } = await supabase
    .from('conversations')
    .select('id, lead_id, telefone_externo, nome_contato, name_source')
    .eq('id', conversaId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!conversa) throw new Error('Conversa não encontrada.')

  // Atualizar nome da conversa (cache)
  await supabase
    .from('conversations')
    .update({
      nome_contato: novoNome.trim(),
      name_source: 'manual',
      is_name_manually_edited: true,
      atualizado_em: new Date().toISOString()
    })
    .eq('id', conversaId)
    .eq('organization_id', perfil.organization_id)

  // Se tem lead vinculado, atualizar também
  if (conversa.lead_id) {
    // Verificar se o lead tem um nome diferente (não genérico)
    const { data: lead } = await supabase
      .from('leads')
      .select('nome')
      .eq('id', conversa.lead_id)
      .single()

    const ehNomeGenerico = !lead?.nome
      || lead.nome === 'Contato WhatsApp'
      || /^\d{8,15}$/.test(lead.nome.replace(/\D/g, ''))

    if (ehNomeGenerico) {
      await supabase
        .from('leads')
        .update({
          nome: novoNome.trim(),
          atualizado_em: new Date().toISOString()
        })
        .eq('id', conversa.lead_id)
        .eq('organization_id', perfil.organization_id)
    }
  } else {
    // Criar lead e vincular à conversa
    const { data: novoLead } = await supabase
      .from('leads')
      .insert({
        organization_id: perfil.organization_id,
        nome: novoNome.trim(),
        telefone: conversa.telefone_externo,
        origem: 'whatsapp',
        status: 'novo',
      })
      .select('id')
      .single()

    if (novoLead) {
      await supabase
        .from('conversations')
        .update({
          lead_id: novoLead.id,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', conversaId)
        .eq('organization_id', perfil.organization_id)
    }
  }

  // Criar atividade de auditoria
  await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    tipo: 'nome_contato_editado',
    descricao: `Nome do contato alterado para "${novoNome.trim()}" na conversa ${conversaId}`,
    conversation_id: conversaId,
    autor_id: perfil.id,
  })

  revalidatePath('/whatsapp')
  revalidatePath(`/whatsapp/${conversaId}`)
}

// ── Log de auditoria ────────────────────────────────────────────

export async function listarAuditLog(conversaId: string) {
  const { supabase, perfil } = await getPerfilAutenticado()

  const { data } = await supabase
    .from('activities')
    .select('id, tipo, descricao, criado_em, autor:profiles!autor_id(nome)')
    .eq('organization_id', perfil.organization_id)
    .or(`conversation_id.eq.${conversaId},lead_id.eq.${conversaId},deal_id.eq.${conversaId}`)
    .order('criado_em', { ascending: false })
    .limit(30)

  return (data ?? []).map((l) => ({
    id: l.id as string,
    acao: l.tipo as string,
    dados_novos: { descricao: l.descricao } as Record<string, unknown> | null,
    criado_em: l.criado_em as string,
    usuario_nome: ((Array.isArray(l.autor) ? l.autor[0] : l.autor) as { nome: string } | null)?.nome ?? 'Sistema',
  }))
}
