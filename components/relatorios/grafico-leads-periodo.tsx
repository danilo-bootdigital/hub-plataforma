'use client'

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'

type DadoSemana = { semana: string; total: number }

type Props = { dados: DadoSemana[] }

export function GraficoLeadsPeriodo({ dados }: Props) {
  if (dados.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">Sem dados no período.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} name="Leads" />
      </LineChart>
    </ResponsiveContainer>
  )
}
