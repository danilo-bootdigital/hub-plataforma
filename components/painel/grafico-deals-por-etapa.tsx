'use client'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'

type DadoEtapa = { nome: string; cor: string; total: number }

type Props = { dados: DadoEtapa[] }

export function GraficoDealsPorEtapa({ dados }: Props) {
  if (dados.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">Sem dados no período.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={dados} layout="vertical" margin={{ left: 80 }}>
        <XAxis type="number" allowDecimals={false} />
        <YAxis type="category" dataKey="nome" width={75} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="total" radius={[0, 4, 4, 0]}>
          {dados.map((d, i) => (
            <Cell key={i} fill={d.cor || '#3b82f6'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
