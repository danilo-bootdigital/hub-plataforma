import { createClient } from '@/lib/supabase/server'
import { backfillNomesConversas } from '@/lib/nome-contato'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, cargo, organization_id')
    .eq('id', user.id)
    .single()

  if (!perfil || perfil.cargo !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado. Somente administradores podem executar migração.' }, { status: 403 })
  }

  try {
    const result = await backfillNomesConversas(perfil.organization_id)

    // Log da migração
    await supabase.from('audit_logs').insert({
      organization_id: perfil.organization_id,
      usuario_id: perfil.id,
      acao: 'migracao_nomes_conversas',
      tabela_afetada: 'conversations',
      registro_id: 'backfill',
      dados_novos: {
        updated: result.updated,
        errors: result.errors.length
      },
    })

    return NextResponse.json({
      success: true,
      message: `Migração concluída. ${result.updated} conversas atualizadas.`,
      errors: result.errors
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Erro ao executar migração.',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}