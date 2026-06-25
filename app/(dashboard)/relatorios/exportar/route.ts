import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { subDays } from 'date-fns'

function calcularPeriodo(periodo: string | null, inicioCustom: string | null, fimCustom: string | null) {
  const agora = new Date()
  let fim = agora.toISOString()
  let inicio: string

  switch (periodo) {
    case '7': inicio = subDays(agora, 7).toISOString(); break
    case '90': inicio = subDays(agora, 90).toISOString(); break
    case '365': inicio = subDays(agora, 365).toISOString(); break
    case 'custom':
      inicio = inicioCustom ? new Date(inicioCustom).toISOString() : subDays(agora, 30).toISOString()
      fim = fimCustom ? new Date(`${fimCustom}T23:59:59`).toISOString() : agora.toISOString()
      break
    default: inicio = subDays(agora, 30).toISOString()
  }

  return { inicio, fim }
}

function escapeCsv(valor: unknown): string {
  const str = String(valor ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })

  const params = request.nextUrl.searchParams
  const tipo = params.get('tipo') ?? 'deals'
  const { inicio, fim } = calcularPeriodo(params.get('periodo'), params.get('inicio'), params.get('fim'))
  const responsavelFiltro = params.get('responsavel') ?? null

  const orgId = perfil.organization_id
  const isVendedor = perfil.cargo === 'vendedor'
  const filtroResp = responsavelFiltro || (isVendedor ? perfil.id : null)

  let csv = ''

  if (tipo === 'deals') {
    let query = supabase
      .from('deals')
      .select('titulo, valor_estimado, ganho, criado_em, atualizado_em, responsavel:profiles!responsavel_id(nome)')
      .eq('organization_id', orgId)
      .gte('criado_em', inicio)
      .lte('criado_em', fim)
      .order('criado_em', { ascending: false })

    if (filtroResp) query = query.eq('responsavel_id', filtroResp)

    const { data: deals } = await query

    csv = 'Titulo,Valor Estimado,Status,Responsavel,Criado Em,Atualizado Em\n'
    ;(deals ?? []).forEach((d) => {
      const resp = Array.isArray(d.responsavel) ? d.responsavel[0] : d.responsavel
      const status = d.ganho === true ? 'Ganho' : d.ganho === false ? 'Perdido' : 'Em andamento'
      csv += [
        escapeCsv(d.titulo),
        d.valor_estimado ?? 0,
        status,
        escapeCsv(resp?.nome ?? ''),
        d.criado_em,
        d.atualizado_em,
      ].join(',') + '\n'
    })
  } else if (tipo === 'leads') {
    let query = supabase
      .from('leads')
      .select('nome, telefone, email, origem, status, criado_em, responsavel:profiles!responsavel_id(nome)')
      .eq('organization_id', orgId)
      .gte('criado_em', inicio)
      .lte('criado_em', fim)
      .order('criado_em', { ascending: false })

    if (filtroResp) query = query.eq('responsavel_id', filtroResp)

    const { data: leads } = await query

    csv = 'Nome,Telefone,Email,Origem,Status,Responsavel,Criado Em\n'
    ;(leads ?? []).forEach((l) => {
      const resp = Array.isArray(l.responsavel) ? l.responsavel[0] : l.responsavel
      csv += [
        escapeCsv(l.nome),
        escapeCsv(l.telefone),
        escapeCsv(l.email ?? ''),
        l.origem,
        l.status,
        escapeCsv(resp?.nome ?? ''),
        l.criado_em,
      ].join(',') + '\n'
    })
  } else if (tipo === 'tarefas') {
    let query = supabase
      .from('tasks')
      .select('titulo, tipo, concluida, data_vencimento, criado_em, responsavel:profiles!responsavel_id(nome)')
      .eq('organization_id', orgId)
      .gte('criado_em', inicio)
      .lte('criado_em', fim)
      .order('criado_em', { ascending: false })

    if (filtroResp) query = query.eq('responsavel_id', filtroResp)

    const { data: tarefas } = await query

    csv = 'Titulo,Tipo,Concluida,Vencimento,Responsavel,Criado Em\n'
    ;(tarefas ?? []).forEach((t) => {
      const resp = Array.isArray(t.responsavel) ? t.responsavel[0] : t.responsavel
      csv += [
        escapeCsv(t.titulo),
        t.tipo,
        t.concluida ? 'Sim' : 'Não',
        t.data_vencimento ?? '',
        escapeCsv(resp?.nome ?? ''),
        t.criado_em,
      ].join(',') + '\n'
    })
  } else {
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  }

  // BOM para Excel reconhecer UTF-8
  const bom = '﻿'
  return new NextResponse(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="relatorio-${tipo}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
