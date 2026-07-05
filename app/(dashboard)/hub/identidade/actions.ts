'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Identidade/Marca do Hub (DEC-017 / DEC-021). Só o Proprietário edita o SEU Hub.
// Usada no PDF de orçamento e, na Config-2, no theming white-label da Aplicação Web.

export type RedesSociais = { facebook?: string; linkedin?: string; youtube?: string; tiktok?: string }

export type IdentidadeHub = {
  nome: string
  nome_fantasia: string | null
  logo_url: string | null
  favicon_url: string | null
  cor_primaria: string | null
  cor_secundaria: string | null
  whatsapp: string | null
  telefone: string | null
  email: string | null
  site: string | null
  instagram: string | null
  redes_sociais: RedesSociais
  cnpj: string | null
  endereco: string | null
}

const BUCKET_BRANDING = 'public-assets'
const TIPOS_IMAGEM = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']
const TAMANHO_MAX = 2 * 1024 * 1024 // 2MB

async function getProprietario() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase
    .from('profiles').select('id, organization_id, cargo, hub_id').eq('id', user.id).single()
  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'proprietario_hub') {
    throw new Error('Apenas o Proprietário do Hub pode editar a identidade.')
  }
  if (!perfil.hub_id) throw new Error('Você ainda não está vinculado a um Hub.')
  return { supabase, perfil: perfil as { id: string; organization_id: string; cargo: string; hub_id: string } }
}

// Upload de logo/favicon para o bucket público de branding. Retorna a URL pública.
export async function uploadBrandingAsset(formData: FormData): Promise<string> {
  const { perfil } = await getProprietario()
  const tipo = String(formData.get('tipo') || '') // 'logo' | 'favicon'
  const file = formData.get('file') as File | null
  if (tipo !== 'logo' && tipo !== 'favicon') throw new Error('Tipo de imagem inválido.')
  if (!file || file.size === 0) throw new Error('Selecione um arquivo.')
  if (!TIPOS_IMAGEM.includes(file.type)) throw new Error('Arquivo deve ser imagem (PNG, JPG, WEBP, SVG ou ICO).')
  if (file.size > TAMANHO_MAX) throw new Error('Imagem deve ter no máximo 2MB.')

  const nomeLimpo = file.name.replace(/[^\w.-]/g, '_')
  const path = `hubs/${perfil.hub_id}/${tipo}-${Date.now()}-${nomeLimpo}`
  const admin = createAdminClient()
  const buffer = Buffer.from(await file.arrayBuffer())
  const { error } = await admin.storage.from(BUCKET_BRANDING).upload(path, buffer, {
    contentType: file.type, upsert: true,
  })
  if (error) throw new Error(`Falha no upload: ${error.message}`)
  const { data } = admin.storage.from(BUCKET_BRANDING).getPublicUrl(path)
  return data.publicUrl
}

export async function atualizarIdentidadeHub(dados: IdentidadeHub): Promise<void> {
  const { supabase, perfil } = await getProprietario()
  const limpar = (v: string | null | undefined) => {
    const s = (v ?? '').trim()
    return s.length ? s : null
  }
  // Redes sociais: guarda só as chaves preenchidas.
  const redes: RedesSociais = {}
  for (const k of ['facebook', 'linkedin', 'youtube', 'tiktok'] as const) {
    const v = limpar(dados.redes_sociais?.[k])
    if (v) redes[k] = v
  }

  const patch: Record<string, unknown> = {
    nome_fantasia: limpar(dados.nome_fantasia),
    logo_url: limpar(dados.logo_url),
    favicon_url: limpar(dados.favicon_url),
    cor_primaria: limpar(dados.cor_primaria),
    cor_secundaria: limpar(dados.cor_secundaria),
    whatsapp: limpar(dados.whatsapp),
    telefone: limpar(dados.telefone),
    email: limpar(dados.email),
    site: limpar(dados.site),
    instagram: limpar(dados.instagram),
    redes_sociais: redes,
    cnpj: limpar(dados.cnpj),
    endereco: limpar(dados.endereco),
  }
  // Nome do Hub é NOT NULL — só atualiza quando informado.
  const nome = limpar(dados.nome)
  if (nome) patch.nome = nome

  // Escopo server-side: só o próprio Hub do usuário (não confia em id do front).
  const { error } = await supabase
    .from('hubs')
    .update(patch)
    .eq('id', perfil.hub_id)
    .eq('organization_id', perfil.organization_id)
  if (error) throw new Error(`Erro ao salvar identidade: ${error.message}`)

  await supabase.from('audit_logs').insert({
    organization_id: perfil.organization_id, usuario_id: perfil.id,
    acao: 'ALTERACAO_IDENTIDADE_HUB', tabela_afetada: 'hubs', registro_id: perfil.hub_id,
    dados_anteriores: null, dados_novos: patch,
  })

  revalidatePath('/hub/identidade')
}
