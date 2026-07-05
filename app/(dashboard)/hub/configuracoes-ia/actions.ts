'use server'

// Assistente de IA comercial do Hub (DEC-021, Config-3). Wrappers das RPCs
// SECURITY DEFINER (hub_ia_config_get/salvar). Escopo/authz vivem no banco.

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { IaComercial } from './ia-comercial'

export async function getIaComercial(): Promise<IaComercial> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('hub_ia_config_get')
  const d = (data ?? {}) as Partial<Record<keyof IaComercial, string | null>>
  return {
    prompt_mestre: d.prompt_mestre ?? '', objetivo: d.objetivo ?? '', regras: d.regras ?? '',
    tom_de_voz: d.tom_de_voz ?? '', restricoes: d.restricoes ?? '', contexto_negocio: d.contexto_negocio ?? '',
    produtos_prioritarios: d.produtos_prioritarios ?? '', informacoes_proibidas: d.informacoes_proibidas ?? '',
    observacoes: d.observacoes ?? '',
  }
}

export async function salvarIaComercial(dados: IaComercial): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('hub_ia_config_salvar', { p_dados: dados })
  if (error) throw new Error(error.message)
  revalidatePath('/hub/configuracoes-ia')
}
