'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function getPerfil() {
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

const CARGOS_GERENCIAM_MODELOS = ['admin', 'gestor']

export async function criarModelo(formData: FormData) {
  const { supabase, perfil } = await getPerfil()
  if (!CARGOS_GERENCIAM_MODELOS.includes(perfil.cargo)) {
    throw new Error('Apenas administradores e gestores podem gerenciar modelos.')
  }

  const nome = (formData.get('nome') as string)?.trim()
  const conteudo = (formData.get('conteudo') as string)?.trim()
  const categoria = (formData.get('categoria') as string)?.trim() || null

  if (!nome) throw new Error('Nome é obrigatório.')
  if (!conteudo) throw new Error('Conteúdo é obrigatório.')

  const { error } = await supabase.from('message_templates').insert({
    organization_id: perfil.organization_id,
    nome,
    conteudo,
    categoria,
    criado_por: perfil.id,
  })

  if (error) throw new Error(`Erro ao criar modelo: ${error.message}`)
  revalidatePath('/whatsapp/modelos')
}

export async function editarModelo(modeloId: string, formData: FormData) {
  const { supabase, perfil } = await getPerfil()
  if (!CARGOS_GERENCIAM_MODELOS.includes(perfil.cargo)) {
    throw new Error('Apenas administradores e gestores podem gerenciar modelos.')
  }

  const nome = (formData.get('nome') as string)?.trim()
  const conteudo = (formData.get('conteudo') as string)?.trim()
  const categoria = (formData.get('categoria') as string)?.trim() || null

  if (!nome) throw new Error('Nome é obrigatório.')
  if (!conteudo) throw new Error('Conteúdo é obrigatório.')

  const { error } = await supabase
    .from('message_templates')
    .update({ nome, conteudo, categoria, atualizado_em: new Date().toISOString() })
    .eq('id', modeloId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao editar modelo: ${error.message}`)
  revalidatePath('/whatsapp/modelos')
}

export async function excluirModelo(modeloId: string) {
  const { supabase, perfil } = await getPerfil()
  if (!CARGOS_GERENCIAM_MODELOS.includes(perfil.cargo)) {
    throw new Error('Apenas administradores e gestores podem gerenciar modelos.')
  }

  const { error } = await supabase
    .from('message_templates')
    .delete()
    .eq('id', modeloId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao excluir modelo: ${error.message}`)
  revalidatePath('/whatsapp/modelos')
}
