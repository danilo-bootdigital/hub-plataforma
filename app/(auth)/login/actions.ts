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

  // Roteia o usuário para sua área inicial conforme o perfil (Fatia 03).
  // Papéis legados continuam indo para /painel (comportamento inalterado).
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: perfil } = await supabase
      .from('profiles')
      .select('cargo')
      .eq('id', user.id)
      .single()
    if (perfil?.cargo === 'proprietario_hub') redirect('/hub')
    if (perfil?.cargo === 'assistente') redirect('/assistente')
  }

  redirect('/painel')
}
