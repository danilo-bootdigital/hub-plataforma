'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Identidade/Marca do Hub (DEC-017). Só o Proprietário edita o SEU Hub.
// Usada no cabeçalho/rodapé do PDF de orçamento enviado ao cliente.

export type IdentidadeHub = {
  logo_url: string | null
  telefone: string | null
  email: string | null
  site: string | null
  instagram: string | null
  cnpj: string | null
  endereco: string | null
}

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

export async function atualizarIdentidadeHub(dados: IdentidadeHub): Promise<void> {
  const { supabase, perfil } = await getProprietario()
  const limpar = (v: string | null | undefined) => {
    const s = (v ?? '').trim()
    return s.length ? s : null
  }

  const patch = {
    logo_url: limpar(dados.logo_url),
    telefone: limpar(dados.telefone),
    email: limpar(dados.email),
    site: limpar(dados.site),
    instagram: limpar(dados.instagram),
    cnpj: limpar(dados.cnpj),
    endereco: limpar(dados.endereco),
  }

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
