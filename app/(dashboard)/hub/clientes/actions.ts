'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// DEC-017: no Hub, o Proprietário distribui clientes entre Assistentes (define o
// RESPONSÁVEL OPERACIONAL). NÃO altera a Carteira (governança da Indústria).
async function getProprietario() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase
    .from('profiles').select('id, organization_id, cargo, hub_id').eq('id', user.id).single()
  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'proprietario_hub') throw new Error('Apenas o Proprietário do Hub distribui clientes.')
  if (!perfil.hub_id) throw new Error('Você ainda não está vinculado a um Hub.')
  return { supabase, perfil }
}

export async function definirResponsavelOperacional(contatoId: string, assistenteId: string | null) {
  const { supabase, perfil } = await getProprietario()
  const admin = createAdminClient()

  // O cliente precisa estar numa Carteira que o Hub opera.
  const { data: contato } = await admin
    .from('contacts')
    .select('id, carteira_id, carteiras:carteira_id(hub_id)')
    .eq('id', contatoId)
    .eq('organization_id', perfil.organization_id)
    .single() as unknown as { data: { id: string; carteira_id: string | null; carteiras: { hub_id: string | null } | null } | null }
  if (!contato || contato.carteiras?.hub_id !== perfil.hub_id) {
    throw new Error('Cliente não pertence a uma Carteira operada pelo seu Hub.')
  }

  // O responsável (se informado) precisa ser Assistente do próprio Hub.
  if (assistenteId) {
    const { data: assist } = await admin
      .from('profiles').select('id')
      .eq('id', assistenteId).eq('cargo', 'assistente').eq('hub_id', perfil.hub_id).single()
    if (!assist) throw new Error('Responsável inválido (precisa ser Assistente do seu Hub).')
  }

  const { error } = await admin
    .from('contacts')
    .update({ responsavel_operacional_id: assistenteId })
    .eq('id', contatoId)
  if (error) throw new Error(`Erro ao definir responsável: ${error.message}`)

  await admin.from('audit_logs').insert({
    organization_id: perfil.organization_id, usuario_id: perfil.id,
    acao: 'DEFINICAO_RESPONSAVEL_OPERACIONAL', tabela_afetada: 'contacts', registro_id: contatoId,
    dados_anteriores: null, dados_novos: { responsavel_operacional_id: assistenteId },
  })
  revalidatePath('/hub/clientes')
}
