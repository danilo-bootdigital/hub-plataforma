'use client'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'

type DadoFunil = { nome: string; cor: string; total: number }

type Props = { dados: DadoFunil[] }

export function GraficoFunil({ dados }: Props) {
  if (dados.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">Sem dados de pipeline.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={dados} layout="vertical" margin={{ left: 80 }}>
        <XAxis type="number" />
        <YAxis type="category" dataKey="nome" width={80} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value) => [`${value} deals`, 'Quantidade']} />
        <Bar dataKey="total" radius={[0, 4, 4, 0]}>
          {dados.map((d, i) => (
            <Cell key={i} fill={d.cor} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
