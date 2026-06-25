import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export interface AuthData {
  user: {
    id: string
    email: string
  } | null
  profile: {
    id: string
    nome: string
    cargo: string
    organization_id: string
    disponivel?: boolean
  } | null
}

export async function getAuthData(): Promise<AuthData> {
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

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      user: null,
      profile: null
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nome, cargo, organization_id, disponivel')
    .eq('id', user.id)
    .single()

  return {
    user: {
      id: user.id,
      email: user.email!
    },
    profile
  }
}

export async function requireAuth(): Promise<AuthData> {
  const auth = await getAuthData()

  if (!auth.user || !auth.profile) {
    redirect('/login')
  }

  return auth
}