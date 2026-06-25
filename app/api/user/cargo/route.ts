import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: perfil } = await supabase
      .from('profiles')
      .select('cargo')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      cargo: perfil?.cargo || null
    })
  } catch (error: any) {
    console.error('Erro ao obter cargo do usuário:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}