'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { LeadOrigem, LeadStatus } from '@/types/database'
import { distribuirLead } from '@/lib/distribuicao'
import { criarDealParaLead } from '@/lib/pipeline-lead'

async function getUsuarioEOrg() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()
  if (!perfil) redirect('/login')
  return { supabase, user, perfil }
}

async function registrarAtividade(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    organization_id: string
    autor_id: string
    tipo: string
    descricao: string
    lead_id?: string
    contato_id?: string
  }
) {
  await supabase.from('activities').insert({
    organization_id: params.organization_id,
    autor_id: params.autor_id,
    tipo: params.tipo,
    descricao: params.descricao,
    lead_id: params.lead_id ?? null,
    contato_id: params.contato_id ?? null,
  })
}

export async function criarLead(formData: FormData) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const nome = formData.get('nome') as string | null
  const email = formData.get('email') as string | null
  const telefone = formData.get('telefone') as string | null
  const empresa = formData.get('empresa') as string | null
  const endereco = formData.get('endereco') as string | null
  const cpf_cnpj = formData.get('cpf_cnpj') as string | null
  const origem = (formData.get('origem') as LeadOrigem) ?? 'manual'
  const responsavel_id = formData.get('responsavel_id') as string | null

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      organization_id: perfil.organization_id,
      nome: nome || null,
      email: email || null,
      telefone: telefone || null,
      empresa: empresa || null,
      endereco: endereco || null,
      observacoes: cpf_cnpj || null,
      origem,
      status: 'novo' as LeadStatus,
      responsavel_id: responsavel_id || null,
      ultima_interacao_em: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) throw new Error(`Erro ao criar lead: ${error.message}`)

  await registrarAtividade(supabase, {
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: 'lead_criado',
    descricao: `Lead "${nome ?? telefone ?? 'sem nome'}" criado manualmente.`,
    lead_id: lead.id,
  })

  if (!responsavel_id) {
    await distribuirLead(supabase, lead.id, perfil.organization_id, perfil.id)
  }

  // Buscar responsável atualizado (pode ter sido atribuído pela distribuição)
  const { data: leadAtualizado } = await supabase
    .from('leads')
    .select('responsavel_id')
    .eq('id', lead.id)
    .single()

  await criarDealParaLead(supabase, {
    organization_id: perfil.organization_id,
    lead_id: lead.id,
    lead_nome: nome,
    lead_telefone: telefone,
    responsavel_id: leadAtualizado?.responsavel_id ?? responsavel_id ?? null,
    origem,
    autor_id: perfil.id,
  })

  revalidatePath('/leads')
  revalidatePath('/pipeline')
  redirect(`/leads/${lead.id}`)
}

export async function editarLead(leadId: string, formData: FormData) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const nome = formData.get('nome') as string | null
  const email = formData.get('email') as string | null
  const telefone = formData.get('telefone') as string | null
  const empresa = formData.get('empresa') as string | null
  const endereco = formData.get('endereco') as string | null
  const cpf_cnpj = formData.get('cpf_cnpj') as string | null
  const origem = formData.get('origem') as LeadOrigem
  const responsavel_id = formData.get('responsavel_id') as string | null

  const { error } = await supabase
    .from('leads')
    .update({
      nome: nome || null,
      email: email || null,
      telefone: telefone || null,
      empresa: empresa || null,
      endereco: endereco || null,
      observacoes: cpf_cnpj || null,
      origem,
      responsavel_id: responsavel_id || null,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', leadId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao editar lead: ${error.message}`)

  await registrarAtividade(supabase, {
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: 'lead_editado',
    descricao: 'Informações do lead atualizadas.',
    lead_id: leadId,
  })

  revalidatePath('/leads')
  revalidatePath(`/leads/${leadId}`)
}

export async function atribuirResponsavel(leadId: string, responsavelId: string) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const { data: responsavel } = await supabase
    .from('profiles')
    .select('nome')
    .eq('id', responsavelId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!responsavel) throw new Error('Responsável não encontrado na organização.')

  const { error } = await supabase
    .from('leads')
    .update({ responsavel_id: responsavelId, atualizado_em: new Date().toISOString() })
    .eq('id', leadId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao atribuir responsável: ${error.message}`)

  await registrarAtividade(supabase, {
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: 'responsavel_alterado',
    descricao: `Lead atribuído a ${responsavel?.nome ?? 'usuário desconhecido'}.`,
    lead_id: leadId,
  })

  revalidatePath('/leads')
  revalidatePath(`/leads/${leadId}`)
}

export async function descartarLead(leadId: string, motivo: string) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const { error } = await supabase
    .from('leads')
    .update({ status: 'descartado', atualizado_em: new Date().toISOString() })
    .eq('id', leadId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao descartar lead: ${error.message}`)

  await registrarAtividade(supabase, {
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: 'lead_descartado',
    descricao: `Lead descartado. Motivo: ${motivo}`,
    lead_id: leadId,
  })

  revalidatePath('/leads')
  revalidatePath(`/leads/${leadId}`)
}

export async function adicionarObservacao(leadId: string, texto: string) {
  const { supabase, perfil } = await getUsuarioEOrg()

  await registrarAtividade(supabase, {
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: 'observacao',
    descricao: texto,
    lead_id: leadId,
  })

  await supabase
    .from('leads')
    .update({ ultima_interacao_em: new Date().toISOString(), atualizado_em: new Date().toISOString() })
    .eq('id', leadId)
    .eq('organization_id', perfil.organization_id)

  revalidatePath(`/leads/${leadId}`)
}

export async function converterLeadEmContato(leadId: string, formData: FormData) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const nome = formData.get('nome') as string
  const email = formData.get('email') as string | null
  const telefone = formData.get('telefone') as string | null
  const cargo = formData.get('cargo') as string | null
  const empresa_nome = formData.get('empresa_nome') as string | null

  let empresa_id: string | null = null

  if (empresa_nome) {
    const { data: existente } = await supabase
      .from('companies')
      .select('id')
      .eq('organization_id', perfil.organization_id)
      .ilike('nome', empresa_nome)
      .single()

    if (existente) {
      empresa_id = existente.id
    } else {
      const { data: nova, error: errEmpresa } = await supabase
        .from('companies')
        .insert({ organization_id: perfil.organization_id, nome: empresa_nome })
        .select('id')
        .single()
      if (errEmpresa) throw new Error(`Erro ao criar empresa: ${errEmpresa.message}`)
      empresa_id = nova.id
    }
  }

  const { data: contato, error } = await supabase
    .from('contacts')
    .insert({
      organization_id: perfil.organization_id,
      nome,
      email: email || null,
      telefone: telefone || null,
      cargo: cargo || null,
      empresa_id,
      responsavel_id: perfil.id,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Erro ao criar contato: ${error.message}`)

  await supabase
    .from('leads')
    .update({ status: 'qualificado', atualizado_em: new Date().toISOString() })
    .eq('id', leadId)
    .eq('organization_id', perfil.organization_id)

  await registrarAtividade(supabase, {
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: 'lead_convertido',
    descricao: `Lead convertido em contato "${nome}".`,
    lead_id: leadId,
    contato_id: contato.id,
  })

  revalidatePath('/leads')
  revalidatePath('/contatos')
  redirect(`/contatos/${contato.id}`)
}
