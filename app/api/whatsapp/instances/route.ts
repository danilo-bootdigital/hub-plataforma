'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adicionarInstancia } from '@/app/(dashboard)/configuracoes/whatsapp/actions'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error('Erro de autenticação:', authError)
      return NextResponse.json({ error: 'Erro de autenticação', instancias: [] }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado', instancias: [] }, { status: 401 })
    }

    const { data: perfil, error: perfilError } = await supabase
      .from('profiles')
      .select('id, organization_id, cargo')
      .eq('id', user.id)
      .single()

    if (perfilError) {
      console.error('Erro ao buscar perfil:', perfilError)
      return NextResponse.json({ error: 'Erro ao buscar perfil', instancias: [] }, { status: 400 })
    }

    if (!perfil || perfil.cargo !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado', instancias: [] }, { status: 403 })
    }

    const { data: instancias, error: instanciasError } = await supabase
      .from('whatsapp_instances')
      .select(`
        id,
        nome,
        numero,
        status_conexao,
        compartilhado,
        vendedor_id,
        vendedor:profiles!vendedor_id(id, nome)
      `)
      .eq('organization_id', perfil.organization_id)
      .order('nome')

    if (instanciasError) {
      console.error('Erro ao listar instâncias:', instanciasError)
      // Em caso de erro, retornar array vazio em vez de quebrar
      return NextResponse.json({ instancias: [] })
    }

    // Normalizar dados para segurança
    const instanciasSeguras = (instancias || []).map(inst => ({
      ...inst,
      nome: inst.nome || 'Instância sem nome',
      vendedor: inst.vendedor || null,
    }))

    return NextResponse.json({ instancias: instanciasSeguras })
  } catch (error) {
    console.error('Erro inesperado ao listar instâncias:', error)
    // Sempre retornar sucesso com array vazio para evitar quebra da página
    return NextResponse.json({ instancias: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    await adicionarInstancia(formData)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao criar instância:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 400 }
    )
  }
}