'use client'

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import { formatarMoeda } from '@/lib/utils'

type DadoMensal = { mes: string; valor: number }

type Props = { dados: DadoMensal[] }

export function GraficoVendasMensal({ dados }: Props) {
  if (dados.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">Sem dados no período.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={dados} margin={{ left: 20, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatarMoeda(v)} />
        <Tooltip formatter={(v) => formatarMoeda(Number(v))} labelFormatter={(l) => `Mês: ${l}`} />
        <Line type="monotone" dataKey="valor" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
