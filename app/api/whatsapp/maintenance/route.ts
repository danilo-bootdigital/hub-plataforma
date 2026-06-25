import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { limparMidiaAntiga, verificarSaudeInstancias, monitorarUsoMidia } from '@/lib/whatsapp-utils'

export async function POST(req: NextRequest) {
  try {
    // Verificar se é uma requisição autorizada (pode adicionar auth se necessário)
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Executar as funções de manutenção
    await limparMidiaAntiga()
    await verificarSaudeInstancias()
    await monitorarUsoMidia()

    return NextResponse.json({
      success: true,
      message: 'Manutenção do WhatsApp concluída',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Erro na manutenção do WhatsApp:', error)
    return NextResponse.json({
      error: 'Falha na manutenção',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Função para agendar execução recorrente
export async function agendarManutencao() {
  // Esta função pode ser chamada por um cron job ou scheduler
  console.log('Executando manutenção programada do WhatsApp...')

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/maintenance`, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${process.env.INTERNAL_API_SECRET}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    console.log('Manutenção concluída:', result)
  } catch (error) {
    console.error('Falha na execução da manutenção:', error)
  }
}