'use client'

import { createBrowserClient } from '@supabase/ssr'

// Criar uma função que acessa as variáveis de ambiente do lado do cliente
const getEnv = () => {
  // Verificar se estamos no navegador
  if (typeof window !== 'undefined') {
    // As variáveis são injetadas pelo Next.js no script do cliente
    try {
      return {
        NEXT_PUBLIC_SUPABASE_URL: (window as any).env?.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: (window as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      }
    } catch {
      // Fallback para as variáveis de ambiente padrão
      return {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      }
    }
  }

  // No servidor durante SSR
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }
}

export function createClient() {
  const env = getEnv()

  // Verificar se as variáveis estão disponíveis
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Variáveis de ambiente do Supabase não estão disponíveis')
  }

  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
