import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

// Branding efetivo do usuário logado (white-label — DEC-021 Config-2).
// Usuário do Hub (proprietario_hub/assistente) → marca do próprio Hub.
// Indústria (admin/gestor/legado) → logo da organização, sem theming.
// cache() dedupa a busca dentro do mesmo request (layout + generateMetadata).
export type HubBranding = {
  hubNome: string | null
  logoUrl: string | null
  faviconUrl: string | null
  corPrimaria: string | null
  ehHub: boolean
}

export const getBrandingAtual = cache(async (): Promise<HubBranding> => {
  const vazio: HubBranding = { hubNome: null, logoUrl: null, faviconUrl: null, corPrimaria: null, ehHub: false }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return vazio

  const { data: perfil } = await supabase
    .from('profiles').select('cargo, hub_id, organization_id').eq('id', user.id).single()
  if (!perfil) return vazio

  const ehHub = perfil.cargo === 'proprietario_hub' || perfil.cargo === 'assistente'
  if (ehHub && perfil.hub_id) {
    const { data: hub } = await supabase
      .from('hubs').select('nome, logo_url, favicon_url, cor_primaria').eq('id', perfil.hub_id).single()
    return {
      hubNome: hub?.nome ?? null,
      logoUrl: hub?.logo_url ?? null,
      faviconUrl: hub?.favicon_url ?? null,
      corPrimaria: hub?.cor_primaria ?? null,
      ehHub: true,
    }
  }

  // Indústria / perfis legados: logo da organização (comportamento atual).
  let logoUrl: string | null = null
  if (perfil.organization_id) {
    const { data: org } = await supabase
      .from('organizations').select('logo_url').eq('id', perfil.organization_id).single()
    logoUrl = org?.logo_url ?? null
  }
  return { ...vazio, logoUrl }
})
