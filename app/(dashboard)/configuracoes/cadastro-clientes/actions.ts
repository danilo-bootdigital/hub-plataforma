'use server'

// DEC-020 — Cadastro de Clientes (área da INDÚSTRIA: admin/gestor). Decisão exclusiva da
// Indústria (aprovar/reprovar/solicitar correção) + conversão em Cliente ativo (contacts).
// Wrappers finos das RPCs SECURITY DEFINER (authz por cargo no banco).

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

const ROTA = '/configuracoes/cadastro-clientes'

async function exigirIndustria() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('profiles').select('cargo').eq('id', user.id).single()
  if (!perfil || !['admin', 'gestor'].includes(perfil.cargo)) {
    throw new Error('Ação exclusiva da Indústria.')
  }
}

// Opções de filtro para a Indústria (hubs com cadastros).
export async function filtrosIndustria(): Promise<{ hubs: { id: string; nome: string }[] }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('onboarding_filtros')
  if (error) throw new Error(error.message)
  return data as { hubs: { id: string; nome: string }[] }
}

export async function solicitarCorrecao(id: string, observacao: string): Promise<void> {
  await exigirIndustria()
  const supabase = await createClient()
  const { error } = await supabase.rpc('industria_onboarding_decidir', {
    p_id: id, p_acao: 'solicitar_correcao', p_texto: observacao,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`${ROTA}/${id}`); revalidatePath(ROTA)
}

export async function aprovarCadastro(id: string): Promise<void> {
  await exigirIndustria()
  const supabase = await createClient()
  const { error } = await supabase.rpc('industria_onboarding_decidir', {
    p_id: id, p_acao: 'aprovar', p_texto: null,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`${ROTA}/${id}`); revalidatePath(ROTA)
}

export async function reprovarCadastro(id: string, motivo: string): Promise<void> {
  await exigirIndustria()
  const supabase = await createClient()
  const { error } = await supabase.rpc('industria_onboarding_decidir', {
    p_id: id, p_acao: 'reprovar', p_texto: motivo,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`${ROTA}/${id}`); revalidatePath(ROTA)
}

export async function converterEmCliente(id: string): Promise<string> {
  await exigirIndustria()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('industria_onboarding_converter', { p_id: id })
  if (error) throw new Error(error.message)
  revalidatePath(`${ROTA}/${id}`); revalidatePath(ROTA)
  return data as string
}
