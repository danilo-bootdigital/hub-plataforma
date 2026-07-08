import type { Metadata } from 'next'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { requireAuth } from '@/lib/auth/server'
import { resolverPermissoes } from '@/lib/rbac'
import { getBrandingAtual } from '@/lib/hub-branding'
import { estiloMarca, estiloIndustria } from '@/lib/branding'

// Título + favicon dinâmicos por Hub (white-label — DEC-021 Config-2).
export async function generateMetadata(): Promise<Metadata> {
  const b = await getBrandingAtual()
  return {
    title: b.hubNome ? `${b.hubNome} · Hub Plataforma` : 'Hub Plataforma',
    ...(b.faviconUrl ? { icons: { icon: b.faviconUrl } } : {}),
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await requireAuth()

  // Permissões efetivas (DEC-015) — usadas para filtrar o menu do Assistente.
  const permissoes = await resolverPermissoes()

  // Branding efetivo: marca do Hub (logo + cor) para usuários do Hub;
  // logo da organização para a Indústria. Ver lib/hub-branding.ts.
  const branding = await getBrandingAtual()

  return (
    <div
      className="flex h-screen bg-slate-50"
      style={branding.ehHub ? estiloMarca(branding.corPrimaria) : estiloIndustria()}
    >
      <Sidebar logoUrl={branding.logoUrl} cargo={profile?.cargo} permissoes={permissoes} />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header logoUrl={branding.logoUrl} permissoes={permissoes} />
        <main className="flex-1 overflow-y-auto p-5 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
