'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { DistribuicaoModo } from '@/types/database'

async function getAdminOuGestor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'admin' && perfil.cargo !== 'gestor') redirect('/painel')

  return { supabase, perfil }
}

export async function salvarConfigDistribuicao(formData: FormData) {
  const { supabase, perfil } = await getAdminOuGestor()

  const modo = formData.get('modo') as DistribuicaoModo
  const apenasDisponiveisRaw = formData.get('apenas_disponiveis')
  const limiteBruto = formData.get('limite_por_vendedor') as string | null

  const apenas_disponiveis = apenasDisponiveisRaw === 'on'
  const limite_por_vendedor =
    limiteBruto && limiteBruto.trim() !== '' ? parseInt(limiteBruto, 10) : null

  if (!['manual', 'rotativo', 'por_carga'].includes(modo)) {
    throw new Error('Modo de distribuição inválido.')
  }

  if (limite_por_vendedor !== null && (isNaN(limite_por_vendedor) || limite_por_vendedor < 1)) {
    throw new Error('Limite por vendedor deve ser um número inteiro maior que zero.')
  }

  const { error } = await supabase
    .from('lead_distribution_config')
    .upsert(
      {
        organization_id: perfil.organization_id,
        modo,
        apenas_disponiveis,
        limite_por_vendedor,
        atualizado_por: perfil.id,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: 'organization_id' }
    )

  if (error) throw new Error(`Erro ao salvar configuração: ${error.message}`)

  revalidatePath('/configuracoes/distribuicao')
}

export async function alternarDisponibilidade() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, cargo, disponivel')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  if (perfil.cargo !== 'vendedor' && perfil.cargo !== 'atendimento') {
    throw new Error('Apenas vendedores e atendimento podem alterar disponibilidade.')
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      disponivel: !perfil.disponivel,
      ultimo_status_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', perfil.id)

  if (error) throw new Error(`Erro ao alterar disponibilidade: ${error.message}`)

  revalidatePath('/', 'layout')
  revalidatePath('/leads')
  revalidatePath('/configuracoes/distribuicao')
}
