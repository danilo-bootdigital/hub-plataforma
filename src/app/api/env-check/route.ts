import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Verificar se as variáveis de ambiente estão configuradas
    const envVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configurada' : '❌ Não configurada',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ Não configurada',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configurada' : '❌ Não configurada',
      EVOLUTION_API_URL: process.env.EVOLUTION_API_URL ? '✅ Configurada' : '❌ Não configurada',
      EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY ? '✅ Configurada' : '❌ Não configurada',
      EVOLUTION_WEBHOOK_SECRET: process.env.EVOLUTION_WEBHOOK_SECRET ? '✅ Configurada' : '❌ Não configurada',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ? '✅ Configurada' : '❌ Não configurada',
      NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED ? '✅ Configurada' : '❌ Não configurada',
    };

    const status = Object.values(envVars).every(status => status === '✅ Configurada');

    return NextResponse.json({
      status: status ? 'success' : 'error',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      variables: envVars,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Erro ao verificar variáveis de ambiente',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}