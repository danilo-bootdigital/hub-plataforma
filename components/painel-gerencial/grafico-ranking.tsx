'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatarMoeda } from '@/lib/utils'
import { formatarNumero } from './formato'
import type { RankingItem } from '@/app/(dashboard)/painel/dados'

/**
 * Gráfico de ranking (barras horizontais) reutilizado nos três rankings do
 * Bloco 3 — produtos, categorias e portfólios. `formato` decide a formatação
 * do valor (quantidade vs. moeda). Paleta contida: um único azul.
 */
export function GraficoRanking({
  dados,
  formato = 'numero',
}: {
  dados: RankingItem[]
  formato?: 'numero' | 'moeda'
}) {
  const fmt = (v: number) => (formato === 'moeda' ? formatarMoeda(v) : formatarNumero(v))

  if (dados.length === 0) {
    return <p className="py-12 text-center text-sm text-slate-400">Sem dados no período.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, dados.length * 44)}>
      <BarChart data={dados} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="nome"
          width={120}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: '#64748b' }}
        />
        <Tooltip
          formatter={(v) => fmt(Number(v))}
          cursor={{ fill: '#f1f5f9' }}
          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
        />
        <Bar dataKey="valor" radius={[0, 6, 6, 0]} maxBarSize={26}>
          {dados.map((_, i) => (
            <Cell key={i} fill="#2563eb" fillOpacity={1 - i * 0.1} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
