'use client'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { formatarMoeda } from '@/lib/utils'

type DadoVendedor = { nome: string; valor: number; deals: number }

type Props = { dados: DadoVendedor[] }

export function GraficoVendasVendedor({ dados }: Props) {
  if (dados.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">Sem vendas no período.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={dados} layout="vertical" margin={{ left: 100 }}>
        <XAxis type="number" tickFormatter={(v) => formatarMoeda(v)} tick={{ fontSize: 10 }} />
        <YAxis type="category" dataKey="nome" width={100} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value) => [formatarMoeda(Number(value)), 'Valor']} />
        <Bar dataKey="valor" fill="#10b981" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
