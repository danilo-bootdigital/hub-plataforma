'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  last_sign_in_at?: string
}

interface Profile {
  id: string
  nome: string
  cargo: string
  organization_id: string
  disponivel?: boolean
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  error: null,
})

interface AuthProviderProps {
  children: ReactNode
  initialUser?: User | null
  initialProfile?: Profile | null
}

export function AuthProvider({ children, initialUser, initialProfile }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser || null)
  const [profile, setProfile] = useState<Profile | null>(initialProfile || null)
  const [loading, setLoading] = useState(!initialUser || !initialProfile)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Efeito para garantir que os dados estão carregados
  useEffect(() => {
    if (initialUser && initialProfile) {
      setUser(initialUser)
      setProfile(initialProfile)
      setLoading(false)
    }
  }, [initialUser, initialProfile])

  const supabase = createClient()

  // Efeito para lidar com mudanças de autenticação
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user as any)
        // Buscar profile do usuário
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        setProfile(profileData || null)
        setLoading(false)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (initialUser && initialProfile) {
      setUser(initialUser)
      setProfile(initialProfile)
      setLoading(false)
      return
    }

    let mounted = true

    async function loadAuth() {
      try {
        const supabase = createClient()

        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()

        if (userError) {
          throw userError
        }

        if (!currentUser) {
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, nome, cargo, organization_id, disponivel')
          .eq('id', currentUser.id)
          .single()

        if (profileError) {
          throw profileError
        }

        if (!mounted) return

        setUser({
          id: currentUser.id,
          email: currentUser.email!,
          last_sign_in_at: currentUser.last_sign_in_at
        })
        setProfile(profileData)
        setError(null)
      } catch (err: any) {
        if (!mounted) return
        console.error('Erro ao carregar autenticação:', err)
        setError(err.message || 'Erro de autenticação')
        setUser(null)
        setProfile(null)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadAuth()

    return () => {
      mounted = false
    }
  }, [])

  const value = {
    user,
    profile,
    loading,
    error
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}