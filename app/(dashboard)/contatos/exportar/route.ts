import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function escapeCsv(valor: unknown): string {
  const str = String(valor ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('id', user.id)
    .single()

  if (!perfil) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })

  const { data: contatos } = await supabase
    .from('contacts')
    .select('nome, email, telefone, cargo, endereco, observacoes, criado_em, empresa:companies!empresa_id(nome)')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  let csv = 'Nome,Email,Telefone,Cargo,Empresa,Endereco,Observacoes,Criado Em\n'
  ;(contatos ?? []).forEach((c) => {
    const empresa = Array.isArray(c.empresa) ? c.empresa[0] : c.empresa
    csv += [
      escapeCsv(c.nome),
      escapeCsv(c.email ?? ''),
      escapeCsv(c.telefone ?? ''),
      escapeCsv(c.cargo ?? ''),
      escapeCsv(empresa?.nome ?? ''),
      escapeCsv(c.endereco ?? ''),
      escapeCsv(c.observacoes ?? ''),
      c.criado_em,
    ].join(',') + '\n'
  })

  const bom = '﻿'
  return new NextResponse(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="contatos-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
