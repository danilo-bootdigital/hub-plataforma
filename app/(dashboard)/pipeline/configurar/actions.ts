'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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

async function getMaxOrdem(supabase: Awaited<ReturnType<typeof createClient>>, pipelineId: string): Promise<number> {
  const { data } = await supabase
    .from('pipeline_stages')
    .select('ordem')
    .eq('pipeline_id', pipelineId)
    .order('ordem', { ascending: false })
    .limit(1)
    .single()

  return data?.ordem ?? 0
}

export async function adicionarEtapa(formData: FormData) {
  const { supabase, perfil } = await getAdminOuGestor()

  const nome = (formData.get('nome') as string)?.trim()
  const cor = (formData.get('cor') as string) ?? '#6366f1'
  const pipeline_id = formData.get('pipeline_id') as string

  if (!nome) throw new Error('Nome da etapa é obrigatório.')
  if (!pipeline_id) throw new Error('Pipeline não identificado.')

  const maxOrdem = await getMaxOrdem(supabase, pipeline_id)

  const { error } = await supabase.from('pipeline_stages').insert({
    organization_id: perfil.organization_id,
    pipeline_id,
    nome,
    cor,
    ordem: maxOrdem + 1,
    oculto: false,
  })

  if (error) throw new Error(`Erro ao adicionar etapa: ${error.message}`)

  revalidatePath('/pipeline')
  revalidatePath('/pipeline/configurar')
}

export async function renomearEtapa(estagioId: string, novoNome: string) {
  const { supabase, perfil } = await getAdminOuGestor()

  const nome = novoNome.trim()
  if (!nome) throw new Error('Nome não pode estar vazio.')

  const { error } = await supabase
    .from('pipeline_stages')
    .update({ nome, atualizado_em: new Date().toISOString() })
    .eq('id', estagioId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao renomear etapa: ${error.message}`)

  revalidatePath('/pipeline')
  revalidatePath('/pipeline/configurar')
}

export async function alterarCorEtapa(estagioId: string, novaCor: string) {
  const { supabase, perfil } = await getAdminOuGestor()

  const { error } = await supabase
    .from('pipeline_stages')
    .update({ cor: novaCor, atualizado_em: new Date().toISOString() })
    .eq('id', estagioId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao alterar cor: ${error.message}`)

  revalidatePath('/pipeline')
  revalidatePath('/pipeline/configurar')
}

export async function alternarOculto(estagioId: string, oculto: boolean) {
  const { supabase, perfil } = await getAdminOuGestor()

  const { error } = await supabase
    .from('pipeline_stages')
    .update({ oculto, atualizado_em: new Date().toISOString() })
    .eq('id', estagioId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao alterar visibilidade: ${error.message}`)

  revalidatePath('/pipeline')
  revalidatePath('/pipeline/configurar')
}

export async function moverEtapa(estagioId: string, direcao: 'cima' | 'baixo') {
  const { supabase, perfil } = await getAdminOuGestor()

  const { data: etapa } = await supabase
    .from('pipeline_stages')
    .select('id, ordem, pipeline_id')
    .eq('id', estagioId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!etapa) throw new Error('Etapa não encontrada.')

  const ordemAlvo = direcao === 'cima' ? etapa.ordem - 1 : etapa.ordem + 1

  const { data: vizinha } = await supabase
    .from('pipeline_stages')
    .select('id, ordem')
    .eq('pipeline_id', etapa.pipeline_id)
    .eq('organization_id', perfil.organization_id)
    .eq('ordem', ordemAlvo)
    .single()

  if (!vizinha) return // já é primeiro ou último

  const { error } = await supabase.rpc('trocar_ordem_etapas', {
    p_etapa_a: estagioId,
    p_etapa_b: vizinha.id,
    p_org_id: perfil.organization_id,
  })

  if (error) throw new Error(`Erro ao reordenar etapas: ${error.message}`)

  revalidatePath('/pipeline')
  revalidatePath('/pipeline/configurar')
}

export async function excluirEtapa(estagioId: string, estagioDestinoId: string | null) {
  const { supabase, perfil } = await getAdminOuGestor()

  // Verificar se há deals nesta etapa
  const { count } = await supabase
    .from('deals')
    .select('id', { count: 'exact', head: true })
    .eq('estagio_id', estagioId)
    .eq('organization_id', perfil.organization_id)

  if ((count ?? 0) > 0) {
    if (!estagioDestinoId) {
      throw new Error(`Esta etapa possui ${count} negociação(ões). Informe a etapa de destino para migrá-las.`)
    }
    // Migrar deals para o destino
    const { error: errMigrar } = await supabase
      .from('deals')
      .update({ estagio_id: estagioDestinoId, atualizado_em: new Date().toISOString() })
      .eq('estagio_id', estagioId)
      .eq('organization_id', perfil.organization_id)

    if (errMigrar) throw new Error(`Erro ao migrar negociações: ${errMigrar.message}`)
  }

  const { error } = await supabase
    .from('pipeline_stages')
    .delete()
    .eq('id', estagioId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao excluir etapa: ${error.message}`)

  revalidatePath('/pipeline')
  revalidatePath('/pipeline/configurar')
}
