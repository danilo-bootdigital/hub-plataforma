'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

type DadoOrigem = { origem: string; total: number }

type Props = { dados: DadoOrigem[] }

const CORES = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1']

const LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  instagram_lead_ad: 'Instagram',
  facebook_lead_ad: 'Facebook',
  site: 'Site',
  indicacao: 'Indicação',
  evento: 'Evento',
  manual: 'Manual',
}

export function GraficoLeadsPorOrigem({ dados }: Props) {
  if (dados.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">Sem dados no período.</p>
  }

  const dadosFormatados = dados.map((d) => ({
    name: LABELS[d.origem] ?? d.origem,
    value: d.total,
  }))

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={dadosFormatados}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={90}
          dataKey="value"
          paddingAngle={2}
        >
          {dadosFormatados.map((_, i) => (
            <Cell key={i} fill={CORES[i % CORES.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
