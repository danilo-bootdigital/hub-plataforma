'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Client com service role para operações de storage
function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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
  if (perfil.cargo !== 'admin' && perfil.cargo !== 'gestor') {
    throw new Error('Sem permissão.')
  }
  return { supabase, perfil }
}

export async function criarHub(formData: FormData) {
  const { supabase, perfil } = await getAdminOuGestor()

  const nome = formData.get('nome') as string
  if (!nome?.trim()) throw new Error('Nome é obrigatório.')

  const { data, error } = await supabase.from('health_hubs').insert({
    organization_id: perfil.organization_id,
    nome: nome.trim(),
    status: 'ativo',
  }).select('id, nome').single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Já existe um hub com este nome.')
    }
    throw new Error(`Erro ao criar hub: ${error.message}`)
  }
  revalidatePath('/configuracoes/hubs-de-saude')
  return { id: data.id, nome: data.nome }
}

export async function editarHub(id: string, formData: FormData) {
  const { supabase, perfil } = await getAdminOuGestor()

  const nome = formData.get('nome') as string
  const status = formData.get('status') as string

  if (!nome?.trim()) throw new Error('Nome é obrigatório.')

  // Verificar se hub existe e pertence à organização
  const { data: hubExistente } = await supabase
    .from('health_hubs')
    .select('id')
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!hubExistente) throw new Error('Hub não encontrado.')

  const { error } = await supabase
    .from('health_hubs')
    .update({
      nome: nome.trim(),
      status: status || 'ativo',
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)

  if (error) {
    if (error.code === '23505') {
      throw new Error('Já existe um hub com este nome.')
    }
    throw new Error(`Erro ao editar hub: ${error.message}`)
  }
  revalidatePath('/configuracoes/hubs-de-saude')
}

export async function excluirHub(id: string) {
  const { supabase, perfil } = await getAdminOuGestor()

  // Verificar se hub existe e pertence à organização
  const { data: hub } = await supabase
    .from('health_hubs')
    .select('id, nome')
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!hub) throw new Error('Hub não encontrado.')

  // Verificar se há fornecedores vinculados
  const { count } = await supabase
    .from('suppliers')
    .select('id', { count: 'exact', head: true })
    .eq('hub_id', id)
    .eq('organization_id', perfil.organization_id)

  if (count && count > 0) {
    throw new Error(`Não é possível excluir: ${count} fornecedor(es) vinculado(s) a este hub. Remova o vínculo primeiro.`)
  }

  const { error } = await supabase
    .from('health_hubs')
    .delete()
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao excluir hub: ${error.message}`)
  revalidatePath('/configuracoes/hubs-de-saude')
}

export async function uploadLogoHub(hubId: string, formData: FormData) {
  const { supabase, perfil } = await getAdminOuGestor()
  const adminClient = createAdminClient()

  const file = formData.get('file') as File
  if (!file || file.size === 0) throw new Error('Nenhum arquivo selecionado.')

  // Validar tipo de arquivo
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Formato inválido. Use PNG, JPG ou WEBP.')
  }

  // Validar tamanho (5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Arquivo muito grande. Máximo 5MB.')
  }

  // Verificar se hub existe e pertence à organização
  const { data: hub } = await supabase
    .from('health_hubs')
    .select('id')
    .eq('id', hubId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!hub) throw new Error('Hub não encontrado.')

  // Determinar extensão pelo tipo MIME
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `health-hubs/${perfil.organization_id}/${hubId}/logo.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  // Upload para o storage
  const { error: uploadError } = await adminClient.storage
    .from('public-assets')
    .upload(path, buffer, { upsert: true, contentType: file.type })

  if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`)

  // Obter URL pública
  const { data: { publicUrl } } = adminClient.storage
    .from('public-assets')
    .getPublicUrl(path)

  // Atualizar logo_url no banco
  const { error } = await supabase
    .from('health_hubs')
    .update({ logo_url: publicUrl, atualizado_em: new Date().toISOString() })
    .eq('id', hubId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao salvar logo: ${error.message}`)
  revalidatePath('/configuracoes/hubs-de-saude')
  return { url: publicUrl }
}

export async function removerLogoHub(hubId: string) {
  const { supabase, perfil } = await getAdminOuGestor()
  const adminClient = createAdminClient()

  // Verificar se hub existe e pertence à organização
  const { data: hub } = await supabase
    .from('health_hubs')
    .select('id, logo_url')
    .eq('id', hubId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!hub) throw new Error('Hub não encontrado.')

  // Se tiver logo, remover do storage
  if (hub.logo_url) {
    // Extrair path da URL
    const urlParts = hub.logo_url.split('/public-assets/')
    if (urlParts.length > 1) {
      const path = urlParts[1]
      await adminClient.storage.from('public-assets').remove([path])
    }
  }

  // Atualizar logo_url para null
  const { error } = await supabase
    .from('health_hubs')
    .update({ logo_url: null, atualizado_em: new Date().toISOString() })
    .eq('id', hubId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao remover logo: ${error.message}`)
  revalidatePath('/configuracoes/hubs-de-saude')
}
