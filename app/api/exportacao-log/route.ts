import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('id', user.id)
    .single()

  if (!perfil) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { conversaId, formato, totalMensagens, leadId } = body as {
    conversaId: string
    formato: 'txt' | 'png'
    totalMensagens: number
    leadId: string | null
  }

  await supabase.from('conversation_exports').insert({
    organization_id: perfil.organization_id,
    conversation_id: conversaId,
    lead_id: leadId ?? null,
    exportado_por: perfil.id,
    formato,
    total_mensagens: totalMensagens,
  })

  return NextResponse.json({ ok: true })
}
