import { createClient } from '@/lib/supabase/server'

// RBAC (DEC-015): resolve as permissões efetivas do usuário logado via RPC
// `minhas_permissoes()` (admin/proprietário=total; gestor=fixo; assistente=Função).
// Server-only. Aplicação da 1ª entrega: menu + middleware + server actions.

export type PermissoesResolvidas = {
  perfil: string
  total: boolean
  permissoes: Record<string, string[]>
  funcao_id?: string | null
  funcao_nome?: string | null
}

export async function resolverPermissoes(): Promise<PermissoesResolvidas | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('minhas_permissoes')
    if (error || !data) return null
    return data as PermissoesResolvidas
  } catch {
    return null // fail-open: sem dados, não restringe (preserva comportamento atual)
  }
}

export function podeVer(perm: PermissoesResolvidas | null | undefined, modulo: string): boolean {
  if (!perm) return true
  if (perm.total) return true
  return (perm.permissoes?.[modulo] ?? []).includes('visualizar')
}

export function podeAcao(
  perm: PermissoesResolvidas | null | undefined,
  modulo: string,
  acao: 'visualizar' | 'criar' | 'editar' | 'excluir'
): boolean {
  if (!perm) return true
  if (perm.total) return true
  return (perm.permissoes?.[modulo] ?? []).includes(acao)
}
