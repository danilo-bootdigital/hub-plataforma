'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function entrar(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const senha = formData.get('senha') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

  if (error) {
    if (error.code === 'invalid_credentials') {
      redirect('/login?erro=credenciais-invalidas')
    }
    redirect('/login?erro=erro-inesperado')
  }

  redirect('/painel')
}
