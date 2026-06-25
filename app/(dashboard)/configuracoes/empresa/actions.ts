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

async function getAdmin() {
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

export async function atualizarEmpresa(formData: FormData) {
  const { supabase, perfil } = await getAdmin()

  const nome_fantasia = (formData.get('nome_fantasia') as string)?.trim() || null
  const cnpj = (formData.get('cnpj') as string)?.trim() || null
  const telefone = (formData.get('telefone') as string)?.trim() || null
  const email = (formData.get('email') as string)?.trim() || null
  const endereco = (formData.get('endereco') as string)?.trim() || null
  const site = (formData.get('site') as string)?.trim() || null
  const instagram = (formData.get('instagram') as string)?.trim() || null

  const { error } = await supabase
    .from('organizations')
    .update({ nome_fantasia, cnpj, telefone, email, endereco, site, instagram })
    .eq('id', perfil.organization_id)

  if (error) throw new Error(`Erro ao salvar: ${error.message}`)
  revalidatePath('/configuracoes/empresa')
}

export async function atualizarLogo(formData: FormData) {
  const { supabase, perfil } = await getAdmin()
  const adminClient = createAdminClient()

  const file = formData.get('file') as File
  if (!file || file.size === 0) throw new Error('Nenhum arquivo selecionado.')
  if (!file.type.startsWith('image/')) throw new Error('Selecione um arquivo de imagem.')
  if (file.size > 2 * 1024 * 1024) throw new Error('Imagem deve ter no máximo 2MB.')

  const ext = file.name.split('.').pop() || 'png'
  const path = `logos/${perfil.organization_id}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await adminClient.storage
    .from('public-assets')
    .upload(path, buffer, { upsert: true, contentType: file.type })

  if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`)

  const { data: { publicUrl } } = adminClient.storage
    .from('public-assets')
    .getPublicUrl(path)

  const { error } = await supabase
    .from('organizations')
    .update({ logo_url: publicUrl })
    .eq('id', perfil.organization_id)

  if (error) throw new Error(`Erro ao salvar logo: ${error.message}`)
  revalidatePath('/configuracoes/empresa')
  return { url: publicUrl }
}
