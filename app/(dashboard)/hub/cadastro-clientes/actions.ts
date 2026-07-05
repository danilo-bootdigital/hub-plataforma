'use server'

// DEC-020 — Cadastro de Clientes (área do HUB). Server actions = wrappers finos das
// RPCs SECURITY DEFINER (authz/escopo/validação/transição vivem no banco). Uploads no
// bucket PRIVADO 'client-onboarding-docs' via service role; visualização por signed URL.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import {
  TIPOS_ARQUIVO_ACEITOS,
  TAMANHO_MAX_ARQUIVO,
  type LinhaCadastro,
  type DetalheCadastro,
} from '@/lib/cadastro-clientes/documentos'
import type { TipoPessoaOnboarding, TipoDocumentoOnboarding } from '@/types/database'

const BUCKET = 'client-onboarding-docs'
const ROTA = '/hub/cadastro-clientes'

type DadosCadastro = Record<string, string | string[] | undefined>

async function exigirAcessoHub() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('profiles').select('cargo').eq('id', user.id).single()
  if (!perfil) redirect('/login')
  // Proprietário do Hub e Assistente fazem o cadastro (DEC-020). A autorização fina
  // (escopo por Hub, transições) é aplicada nas RPCs SECURITY DEFINER.
  if (!['proprietario_hub', 'assistente'].includes(perfil.cargo)) {
    throw new Error('Sem acesso ao Cadastro de Clientes.')
  }
}

// ---------------------------------------------------------------- leituras
export async function listarCadastros(filtros: {
  status?: string | null; busca?: string | null; cpf?: string | null; cnpj?: string | null
  conselho?: string | null; email?: string | null; hubId?: string | null
  limit?: number; offset?: number
} = {}): Promise<{ total: number; rows: LinhaCadastro[] }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('onboarding_listar', {
    p_status: filtros.status || null,
    p_busca: filtros.busca?.trim() || null,
    p_cpf: filtros.cpf?.trim() || null,
    p_cnpj: filtros.cnpj?.trim() || null,
    p_conselho: filtros.conselho?.trim() || null,
    p_email: filtros.email?.trim() || null,
    p_hub_id: filtros.hubId || null,
    p_limit: filtros.limit ?? 25,
    p_offset: filtros.offset ?? 0,
  })
  if (error) throw new Error(error.message)
  return data as { total: number; rows: LinhaCadastro[] }
}

export async function detalheCadastro(id: string): Promise<DetalheCadastro> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('onboarding_detalhe', { p_id: id })
  if (error) throw new Error(error.message)
  return data as DetalheCadastro
}

// URL assinada de um documento (bucket privado). Valida o acesso ao cadastro (RPC aplica
// escopo) E que o path pertence a este cadastro — impede acesso a arquivos de terceiros.
export async function urlAssinadaDocumento(id: string, storagePath: string): Promise<string> {
  const supabase = await createClient()
  // Checagem leve de escopo (RPC valida perfil + que o path pertence ao cadastro).
  // Fallback para o detalhe completo caso a migration 066 ainda não esteja aplicada.
  let pertence = false
  const { data, error } = await supabase.rpc('onboarding_arquivo_valido', { p_id: id, p_path: storagePath })
  if (!error) {
    pertence = data === true
  } else {
    const detalhe = await detalheCadastro(id)
    pertence = detalhe.arquivos.some((a) => a.storage_path === storagePath)
  }
  if (!pertence) throw new Error('Documento não pertence a este cadastro.')
  const admin = createAdminClient()
  const { data: sig, error: sigErr } = await admin.storage.from(BUCKET).createSignedUrl(storagePath, 60 * 10)
  if (sigErr || !sig) throw new Error(sigErr?.message || 'Falha ao gerar link do documento.')
  return sig.signedUrl
}

// ---------------------------------------------------------------- escrita (Hub)
export async function criarCadastro(tipoPessoa: TipoPessoaOnboarding, dados: DadosCadastro): Promise<string> {
  await exigirAcessoHub()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('hub_onboarding_criar', {
    p_tipo_pessoa: tipoPessoa,
    p_dados: dados,
  })
  if (error) throw new Error(error.message)
  revalidatePath(ROTA)
  return data as string
}

export async function salvarCadastro(id: string, dados: DadosCadastro): Promise<void> {
  await exigirAcessoHub()
  const supabase = await createClient()
  const { error } = await supabase.rpc('hub_onboarding_salvar', { p_id: id, p_dados: dados })
  if (error) throw new Error(error.message)
  revalidatePath(`${ROTA}/${id}`)
}

export async function anexarDocumento(formData: FormData): Promise<void> {
  await exigirAcessoHub()
  const onboardingId = String(formData.get('onboardingId') || '')
  const tipoDocumento = String(formData.get('tipoDocumento') || '') as TipoDocumentoOnboarding
  const file = formData.get('file') as File | null
  if (!onboardingId || !tipoDocumento) throw new Error('Cadastro/documento inválido.')
  if (!file || file.size === 0) throw new Error('Selecione um arquivo.')
  if (!TIPOS_ARQUIVO_ACEITOS.includes(file.type)) throw new Error('Arquivo deve ser PDF ou imagem (PNG/JPG/WEBP).')
  if (file.size > TAMANHO_MAX_ARQUIVO) throw new Error('Arquivo deve ter no máximo 10MB.')

  // Escopo do cadastro (garante que o usuário é dono antes de subir ao storage)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('profiles').select('hub_id').eq('id', user.id).single()

  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const path = `${perfil?.hub_id ?? 'sem-hub'}/${onboardingId}/${tipoDocumento}-${file.name.replace(/[^\w.-]/g, '_')}`

  // Path anterior deste tipo de documento (para apagar o órfão se o nome do arquivo mudar;
  // o upsert só sobrescreve quando o path é idêntico). RLS restringe ao dono do Hub.
  const { data: anterior } = await supabase
    .from('hub_client_onboarding_files')
    .select('storage_path')
    .eq('onboarding_id', onboardingId)
    .eq('tipo_documento', tipoDocumento)
    .maybeSingle()

  const admin = createAdminClient()
  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type, upsert: true,
  })
  if (upErr) throw new Error(`Falha no upload: ${upErr.message}`)

  // Metadado + evento via RPC (roda como o usuário; valida escopo/status)
  const { error } = await supabase.rpc('hub_onboarding_anexar', {
    p_onboarding_id: onboardingId,
    p_tipo_documento: tipoDocumento,
    p_nome: file.name,
    p_path: path,
    p_mime: file.type,
    p_tamanho: file.size,
  })
  if (error) {
    // rollback do arquivo órfão
    await admin.storage.from(BUCKET).remove([path]).catch(() => {})
    throw new Error(error.message)
  }
  // Substituição com nome diferente: remove o objeto antigo (não referenciado mais).
  if (anterior?.storage_path && anterior.storage_path !== path) {
    await admin.storage.from(BUCKET).remove([anterior.storage_path]).catch(() => {})
  }
  void ext
  revalidatePath(`${ROTA}/${onboardingId}`)
}

export async function removerDocumento(onboardingId: string, fileId: string): Promise<void> {
  await exigirAcessoHub()
  const supabase = await createClient()
  const { data: path, error } = await supabase.rpc('hub_onboarding_remover_arquivo', { p_file_id: fileId })
  if (error) throw new Error(error.message)
  if (path) {
    const admin = createAdminClient()
    await admin.storage.from(BUCKET).remove([path as string]).catch(() => {})
  }
  revalidatePath(`${ROTA}/${onboardingId}`)
}

export async function enviarParaIndustria(id: string): Promise<void> {
  await exigirAcessoHub()
  const supabase = await createClient()
  const { error } = await supabase.rpc('hub_onboarding_enviar', { p_id: id })
  if (error) throw new Error(error.message)
  revalidatePath(ROTA)
  revalidatePath(`${ROTA}/${id}`)
}
