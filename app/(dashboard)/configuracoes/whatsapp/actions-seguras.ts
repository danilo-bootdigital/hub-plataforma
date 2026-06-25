'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { deletarInstancia } from '@/lib/evolution'

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

/**
 * Exclui uma instância WhatsApp de forma segura, preservando todos os dados comerciais.
 *
 * REGRA: Apenas elementos de comunicação são removidos. Histórico comercial é preservado.
 */
export async function excluirInstanciaSegura(instanceId: string) {
  const { supabase, perfil } = await getSoAdmin()

  // Buscar dados da instância
  const { data: instancia } = await supabase
    .from('whatsapp_instances')
    .select('id, nome, evolution_instance_name, status_conexao')
    .eq('id', instanceId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!instancia) {
    throw new Error('Instância não encontrada.')
  }

  // Validação: Instâncias conectadas não podem ser excluídas
  if (instancia.status_conexao === 'conectado') {
    throw new Error('Não é possível excluir uma instância conectada. Desconecte primeiro.')
  }

  try {
    // 1. Remover da Evolution API (se existir)
    if (instancia.evolution_instance_name) {
      try {
        await deletarInstancia(instancia.evolution_instance_name)
      } catch (error) {
        // Ignorar erros da Evolution API - a exclusão do banco continua
        console.warn(`Falha ao remover instância da Evolution API: ${error}`)
      }
    }

    // 2. Desvincular conversas (preservando histórico)
    await supabase
      .from('conversations')
      .update({
        whatsapp_instance_id: null
      })
      .eq('whatsapp_instance_id', instanceId)
      .eq('organization_id', perfil.organization_id)

    // 3. Desvincular leads (preservando histórico)
    await supabase
      .from('leads')
      .update({
        whatsapp_instance_id: null
      })
      .eq('whatsapp_instance_id', instanceId)
      .eq('organization_id', perfil.organization_id)

    // 4. Remover a instância do banco
    const { error } = await supabase
      .from('whatsapp_instances')
      .delete()
      .eq('id', instanceId)
      .eq('organization_id', perfil.organization_id)

    if (error) {
      throw new Error(`Erro ao remover instância: ${error.message}`)
    }

    // 5. Invalidar cache
    revalidatePath('/configuracoes/whatsapp')
    revalidatePath('/whatsapp')
    revalidatePath('/monitoramento-whatsapp')

    return {
      success: true,
      message: `Instância "${instancia.nome}" removida com sucesso.`,
      preservedData: {
        conversations: true,
        leads: true,
        messages: true
      }
    }

  } catch (error) {
    console.error('Erro na exclusão segura:', error)
    throw error
  }
}

/**
 * Função alternativa para marcar instância como inativa (sem remover do banco)
 * Útil para instâncias que não podem ser excluídas imediatamente
 */
export async function marcarInstanciaInativa(instanceId: string, motivo: string) {
  const { supabase, perfil } = await getSoAdmin()

  const { error } = await supabase
    .from('whatsapp_instances')
    .update({
      status_conexao: 'inativa'
    })
    .eq('id', instanceId)
    .eq('organization_id', perfil.organization_id)

  if (error) {
    throw new Error(`Erro ao marcar instância como inativa: ${error.message}`)
  }

  revalidatePath('/configuracoes/whatsapp')
  return { success: true, message: 'Instância marcada como inativa.' }
}