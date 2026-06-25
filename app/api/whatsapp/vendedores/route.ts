'use server'

import { NextResponse } from 'next/server'
import { fetchVendedores } from '@/app/(dashboard)/configuracoes/whatsapp/actions'

export async function GET() {
  try {
    const vendedores = await fetchVendedores()
    return NextResponse.json({ vendedores: vendedores || [] })
  } catch (error) {
    console.error('Erro ao buscar vendedores:', error)
    // Em caso de erro, retornar array vazio
    return NextResponse.json({ vendedores: [] })
  }
}