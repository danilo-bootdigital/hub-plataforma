import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Criar cliente do Supabase server-side
    const supabase = await createClient()

    // 1. Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Usuário não autenticado',
        user: null,
        perfil: null,
        instancias: [],
        envVars: {},
        timestamp: new Date().toISOString()
      }, { status: 401 })
    }

    // 2. Verificar perfil
    const { data: perfil, error: perfilError } = await supabase
      .from('profiles')
      .select('id, organization_id, cargo')
      .eq('id', user.id)
      .single()
    if (perfilError || !perfil) {
      return NextResponse.json({
        success: false,
        error: 'Perfil não encontrado',
        user: { id: user.id, email: user.email },
        perfil: null,
        instancias: [],
        envVars: {},
        timestamp: new Date().toISOString()
      }, { status: 404 })
    }

    // 3. Verificar instâncias
    const { data: instancias, error: instanciasError } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('organization_id', perfil.organization_id)
    if (instanciasError) {
      return NextResponse.json({
        success: false,
        error: 'Erro ao buscar instâncias',
        user: { id: user.id, email: user.email },
        perfil: { id: perfil.id, cargo: perfil.cargo, organization_id: perfil.organization_id },
        instancias: [],
        envVars: {},
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    // 4. Verificar variáveis de ambiente (sem expor valores)
    const envVars = {
      EVOLUTION_API_URL: process.env.EVOLUTION_API_URL ? 'OK' : 'Faltando',
      EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY ? 'OK' : 'Faltando',
      EVOLUTION_WEBHOOK_SECRET: process.env.EVOLUTION_WEBHOOK_SECRET ? 'OK' : 'Faltando',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ? 'OK' : 'Faltando',
    }

    // 5. Testar conexão com a Evolution API (se as variáveis estiverem OK)
    let evolutionStatus = 'Não testado'
    if (process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY) {
      try {
        const response = await fetch(`${process.env.EVOLUTION_API_URL}/api/status`, {
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.EVOLUTION_API_KEY
          },
          signal: AbortSignal.timeout(10000) // 10 segundos de timeout
        })

        evolutionStatus = response.ok ? 'OK' : `Erro: ${response.status}`
      } catch (error) {
        evolutionStatus = `Erro: ${error instanceof Error ? error.message : 'Desconhecido'}`
      }
    }

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email },
      perfil: { id: perfil.id, cargo: perfil.cargo, organization_id: perfil.organization_id },
      instancias: instancias || [],
      envVars,
      evolutionStatus,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[WhatsApp Debug API Error]:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      user: null,
      perfil: null,
      instancias: [],
      envVars: {},
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}