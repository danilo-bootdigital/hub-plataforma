import type { createClient } from '@/lib/supabase/server'
import type { ClienteHubRow } from '@/components/hub-clientes/tabela-clientes-hub'

export type CarteiraAcessivel = {
  id: string
  nome: string
  modo: 'ABERTA' | 'DISTRIBUIDA'
  responsavel_id: string | null
}

// Monta as linhas de Clientes visíveis a partir das Carteiras já filtradas por papel/regra.
// Read-only: apenas leitura de `contacts` existentes. Não cria/edita nada.
export async function montarClientesVisiveis(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  carteirasAcessiveis: CarteiraAcessivel[]
): Promise<ClienteHubRow[]> {
  const ids = carteirasAcessiveis.map((c) => c.id)
  if (ids.length === 0) return []

  const { data: contatos } = await supabase
    .from('contacts')
    .select('id, nome, telefone, email, carteira_id')
    .eq('organization_id', organizationId)
    .in('carteira_id', ids)
    .order('nome')

  // Resolve nomes dos responsáveis (apenas das Carteiras DISTRIBUÍDAS acessíveis).
  const respIds = Array.from(
    new Set(carteirasAcessiveis.map((c) => c.responsavel_id).filter((v): v is string => !!v))
  )
  const respMap = new Map<string, string>()
  if (respIds.length) {
    const { data: profs } = await supabase.from('profiles').select('id, nome').in('id', respIds)
    ;(profs ?? []).forEach((p: { id: string; nome: string }) => respMap.set(p.id, p.nome))
  }

  const cartMap = new Map(carteirasAcessiveis.map((c) => [c.id, c]))

  return (contatos ?? []).map((ct: {
    id: string; nome: string; telefone: string | null; email: string | null; carteira_id: string
  }) => {
    const cart = cartMap.get(ct.carteira_id)!
    return {
      id: ct.id,
      nome: ct.nome,
      telefone: ct.telefone ?? null,
      email: ct.email ?? null,
      carteira_nome: cart.nome,
      modo: cart.modo,
      responsavel_nome:
        cart.modo === 'DISTRIBUIDA' && cart.responsavel_id
          ? respMap.get(cart.responsavel_id) ?? '—'
          : null,
    }
  })
}
