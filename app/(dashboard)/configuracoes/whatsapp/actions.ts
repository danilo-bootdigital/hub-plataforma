'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { criarInstancia, deletarInstancia, obterQRCode } from '@/lib/evolution'

async function getSoAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()
  if (!perfil || perfil.cargo !== 'admin') redirect('/painel')
  return { supabase, perfil }
}

export async function adicionarInstancia(formData: FormData) {
  const { supabase, perfil } = await getSoAdmin()

  const nome = (formData.get('nome') as string)?.trim()
  const compartilhado = formData.get('compartilhado') === 'true'
  const vendedor_id = (formData.get('vendedor_id') as string) || null

  if (!nome) throw new Error('Nome é obrigatório.')
  if (!compartilhado && !vendedor_id) throw new Error('Selecione um vendedor para instância individual.')

  // Gerar nome único para Evolution API (sem espaços, letras e números)
  const instanceName = `org${perfil.organization_id.slice(0, 8)}-${Date.now()}`

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET
  if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL não está configurada.')
  if (!webhookSecret) throw new Error('EVOLUTION_WEBHOOK_SECRET não está configurada.')

  const webhookUrl = `${appUrl}/api/webhook/evolution?secret=${webhookSecret}`

  await criarInstancia(instanceName, webhookUrl)

  const { error } = await supabase.from('whatsapp_instances').insert({
    organization_id: perfil.organization_id,
    nome,
    evolution_instance_name: instanceName,
    compartilhado,
    vendedor_id: compartilhado ? null : vendedor_id,
    status_conexao: 'desconectado',
  })

  if (error) throw new Error(`Erro ao salvar instância: ${error.message}`)

  revalidatePath('/configuracoes/whatsapp')
}

export async function excluirInstancia(instanceId: string) {
  const { supabase, perfil } = await getSoAdmin()

  const { data: instancia } = await supabase
    .from('whatsapp_instances')
    .select('id, evolution_instance_name, status_conexao')
    .eq('id', instanceId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!instancia) throw new Error('Instância não encontrada.')

  // Impedir exclusão se estiver conectada
  if (instancia.status_conexao === 'conectado') {
    throw new Error('Desconecte a instância antes de excluí-la.')
  }

  if (instancia.evolution_instance_name) {
    try { await deletarInstancia(instancia.evolution_instance_name) } catch { /* ignorar se não existir na API */ }
  }

  // Desvincular conversas antes de excluir (evita foreign key constraint)
  await supabase
    .from('conversations')
    .update({ whatsapp_instance_id: null })
    .eq('whatsapp_instance_id', instanceId)
    .eq('organization_id', perfil.organization_id)

  const { error } = await supabase
    .from('whatsapp_instances')
    .delete()
    .eq('id', instanceId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao excluir instância: ${error.message}`)

  revalidatePath('/configuracoes/whatsapp')
}

export async function fetchVendedores(): Promise<{ id: string; nome: string }[]> {
  const { supabase, perfil } = await getSoAdmin()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, nome')
    .eq('organization_id', perfil.organization_id)
    .eq('cargo', 'vendedor')
    .order('nome')

  if (error) throw new Error(`Erro ao buscar vendedores: ${error.message}`)

  return (data || []).map(p => ({ id: p.id, nome: p.nome }))
}

export async function verificarQRCode(instanceId: string): Promise<
  | { estado: 'conectado' }
  | { estado: 'qr'; base64: string }
  | { estado: 'aguardando' }
  | { estado: 'erro'; mensagem: string }
> {
  const { supabase, perfil } = await getSoAdmin()

  const { data: instancia } = await supabase
    .from('whatsapp_instances')
    .select('evolution_instance_name, status_conexao')
    .eq('id', instanceId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!instancia?.evolution_instance_name) return { estado: 'aguardando' }

  if (instancia.status_conexao === 'conectado') return { estado: 'conectado' }

  const resultado = await obterQRCode(instancia.evolution_instance_name)

  if (resultado === 'not_found') {
    // Instância não existe mais na Evolution — recriar automaticamente
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET
    if (!appUrl || !webhookSecret) {
      return { estado: 'erro', mensagem: 'Configuração do servidor incompleta. Contate o suporte.' }
    }
    const webhookUrl = `${appUrl}/api/webhook/evolution?secret=${webhookSecret}`
    try {
      await criarInstancia(instancia.evolution_instance_name, webhookUrl)
      return { estado: 'aguardando' }
    } catch {
      return { estado: 'erro', mensagem: 'Não foi possível recriar a instância. Exclua e crie uma nova.' }
    }
  }

  if (resultado) return { estado: 'qr', base64: resultado }
  return { estado: 'aguardando' }
}
