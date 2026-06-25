'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { TaskTipo } from '@/types/database'

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
  return { supabase, perfil }
}

export async function criarTarefa(formData: FormData) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const titulo = (formData.get('titulo') as string)?.trim()
  const tipo = formData.get('tipo') as TaskTipo
  const descricao = (formData.get('descricao') as string | null)?.trim() || null
  const dataVencimentoRaw = formData.get('data_vencimento') as string | null
  const responsavel_id_form = formData.get('responsavel_id') as string | null
  const lead_id = formData.get('lead_id') as string | null
  const contato_id = formData.get('contato_id') as string | null
  const deal_id = formData.get('deal_id') as string | null

  if (!titulo) throw new Error('Título é obrigatório.')
  if (!['ligacao', 'email', 'reuniao', 'whatsapp'].includes(tipo)) {
    throw new Error('Tipo de tarefa inválido.')
  }

  const data_vencimento = dataVencimentoRaw
    ? new Date(dataVencimentoRaw + 'T12:00:00').toISOString()
    : null

  // Vendedor e atendimento só criam para si mesmos
  const responsavel_id =
    perfil.cargo === 'vendedor' || perfil.cargo === 'atendimento'
      ? perfil.id
      : (responsavel_id_form || perfil.id)

  const { data: tarefa, error } = await supabase
    .from('tasks')
    .insert({
      organization_id: perfil.organization_id,
      titulo,
      tipo,
      descricao,
      data_vencimento,
      concluida: false,
      responsavel_id,
      lead_id: lead_id || null,
      contato_id: contato_id || null,
      deal_id: deal_id || null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Erro ao criar tarefa: ${error.message}`)

  await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: 'tarefa_criada',
    descricao: `Tarefa "${titulo}" criada (${tipo}).`,
    lead_id: lead_id || null,
    contato_id: contato_id || null,
    deal_id: deal_id || null,
  })

  revalidatePath('/tarefas')
  if (lead_id) revalidatePath(`/leads/${lead_id}`)
  if (contato_id) revalidatePath(`/contatos/${contato_id}`)
  if (deal_id) revalidatePath('/pipeline')
}

export async function concluirTarefa(tarefaId: string) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const { data: tarefa } = await supabase
    .from('tasks')
    .select('id, titulo, tipo, responsavel_id, lead_id, contato_id, deal_id')
    .eq('id', tarefaId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!tarefa) throw new Error('Tarefa não encontrada.')

  if (['vendedor', 'atendimento'].includes(perfil.cargo) && tarefa.responsavel_id !== perfil.id) {
    throw new Error('Você não tem permissão para concluir esta tarefa.')
  }

  const { error } = await supabase
    .from('tasks')
    .update({ concluida: true, atualizado_em: new Date().toISOString() })
    .eq('id', tarefaId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao concluir tarefa: ${error.message}`)

  await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: 'tarefa_concluida',
    descricao: `Tarefa "${tarefa.titulo}" concluída.`,
    lead_id: tarefa.lead_id,
    contato_id: tarefa.contato_id,
    deal_id: tarefa.deal_id,
  })

  revalidatePath('/tarefas')
  if (tarefa.lead_id) revalidatePath(`/leads/${tarefa.lead_id}`)
  if (tarefa.contato_id) revalidatePath(`/contatos/${tarefa.contato_id}`)
  if (tarefa.deal_id) revalidatePath('/pipeline')
}

export async function reabrirTarefa(tarefaId: string) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const { data: tarefa } = await supabase
    .from('tasks')
    .select('id, responsavel_id, lead_id, contato_id, deal_id')
    .eq('id', tarefaId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!tarefa) throw new Error('Tarefa não encontrada.')

  if (['vendedor', 'atendimento'].includes(perfil.cargo) && tarefa.responsavel_id !== perfil.id) {
    throw new Error('Você não tem permissão para reabrir esta tarefa.')
  }

  const { error } = await supabase
    .from('tasks')
    .update({ concluida: false, atualizado_em: new Date().toISOString() })
    .eq('id', tarefaId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao reabrir tarefa: ${error.message}`)

  revalidatePath('/tarefas')
  if (tarefa.lead_id) revalidatePath(`/leads/${tarefa.lead_id}`)
  if (tarefa.contato_id) revalidatePath(`/contatos/${tarefa.contato_id}`)
  if (tarefa.deal_id) revalidatePath('/pipeline')
}

export async function excluirTarefa(tarefaId: string) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const { data: tarefa } = await supabase
    .from('tasks')
    .select('id, responsavel_id, lead_id, contato_id, deal_id')
    .eq('id', tarefaId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!tarefa) throw new Error('Tarefa não encontrada.')

  const podeExcluir =
    ['admin', 'gestor'].includes(perfil.cargo) || tarefa.responsavel_id === perfil.id

  if (!podeExcluir) throw new Error('Você não tem permissão para excluir esta tarefa.')

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', tarefaId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao excluir tarefa: ${error.message}`)

  revalidatePath('/tarefas')
  if (tarefa.lead_id) revalidatePath(`/leads/${tarefa.lead_id}`)
  if (tarefa.contato_id) revalidatePath(`/contatos/${tarefa.contato_id}`)
  if (tarefa.deal_id) revalidatePath('/pipeline')
}
