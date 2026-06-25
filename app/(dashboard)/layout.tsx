import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { requireAuth } from '@/lib/auth/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile } = await requireAuth()

  // Buscar logo da organização
  let logoUrl: string | null = null
  if (profile) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Server Component — cookies só podem ser setados em Server Actions
            }
          },
        },
      }
    )

    const { data: organization } = await supabase
      .from('organizations')
      .select('logo_url')
      .eq('id', profile.organization_id)
      .single()

    logoUrl = organization?.logo_url || null
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar logoUrl={logoUrl} />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header logoUrl={logoUrl} />
        <main className="flex-1 overflow-y-auto p-5 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
