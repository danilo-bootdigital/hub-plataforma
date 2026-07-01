'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// CRUD de Funções (Roles) do Hub — DEC-015. Via RPCs SECURITY DEFINER
// (funcoes/funcao_permissoes têm RLS sem policies). Só o Proprietário do Hub.

export type PermItem = { modulo: string; acao: string }
export type FuncaoPayload = {
  id?: string | null
  nome: string
  descricao?: string | null
  ativo?: boolean
  permissoes: PermItem[]
}

export type FuncaoLista = {
  id: string
  nome: string
  descricao: string | null
  ativo: boolean
  usuarios: number
  permissoes: Record<string, string[]>
}

export async function listarFuncoes(): Promise<FuncaoLista[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('funcoes_listar')
  if (error) throw new Error(error.message)
  return (data ?? []) as FuncaoLista[]
}

export async function salvarFuncao(p: FuncaoPayload): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('funcao_salvar', {
    p_id: p.id ?? null,
    p_nome: p.nome,
    p_descricao: p.descricao ?? null,
    p_ativo: p.ativo ?? true,
    p_permissoes: p.permissoes,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/hub/funcoes')
  return data as string
}

export async function excluirFuncao(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('funcao_excluir', { p_id: id })
  if (error) throw new Error(error.message)
  revalidatePath('/hub/funcoes')
}
