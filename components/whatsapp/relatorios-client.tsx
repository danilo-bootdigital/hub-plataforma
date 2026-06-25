'use client'

type Metrica = {
  vendedor_id: string
  vendedor_nome: string
  total_conversas: number
  conversas_finalizadas: number
  conversas_sem_resposta: number
  tempo_medio_primeira_resposta_min: number | null
  total_mensagens_enviadas: number
}

type Props = {
  metricas: Metrica[]
  totalConversas: number
  conversasAbertas: number
  semResposta: number
}

export function RelatoriosWhatsappClient({ metricas, totalConversas, conversasAbertas, semResposta }: Props) {
  const vendedoresComTempo = metricas.filter(m => m.tempo_medio_primeira_resposta_min != null)
  const tempoMedioGeral = vendedoresComTempo.length > 0
    ? vendedoresComTempo.reduce((acc, m) => acc + (m.tempo_medio_primeira_resposta_min ?? 0), 0) / vendedoresComTempo.length
    : null

  return (
    <div className="space-y-6">
      {/* Cards resumo */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <CardKpi label="Total de conversas" valor={totalConversas.toString()} />
        <CardKpi label="Abertas agora" valor={conversasAbertas.toString()} cor="text-blue-600" />
        <CardKpi label="Sem resposta" valor={semResposta.toString()} cor="text-red-600" />
        <CardKpi
          label="Tempo médio 1ª resposta"
          valor={tempoMedioGeral != null ? `${Math.round(tempoMedioGeral)} min` : '—'}
          cor="text-amber-600"
        />
      </div>

      {/* Tabela por vendedor */}
      <div className="rounded-lg border bg-white">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Desempenho por vendedor</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-medium text-slate-500">
                <th className="px-4 py-2">Vendedor</th>
                <th className="px-4 py-2 text-center">Conversas</th>
                <th className="px-4 py-2 text-center">Finalizadas</th>
                <th className="px-4 py-2 text-center">Sem resposta</th>
                <th className="px-4 py-2 text-center">Tempo 1ª resp.</th>
                <th className="px-4 py-2 text-center">Msgs enviadas</th>
                <th className="px-4 py-2 text-center">Taxa resolução</th>
              </tr>
            </thead>
            <tbody>
              {metricas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    Nenhum dado disponível para o período.
                  </td>
                </tr>
              ) : (
                metricas.map((m) => {
                  const taxaResolucao = m.total_conversas > 0
                    ? Math.round((m.conversas_finalizadas / m.total_conversas) * 100)
                    : 0
                  return (
                    <tr key={m.vendedor_id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-700">{m.vendedor_nome}</td>
                      <td className="px-4 py-2.5 text-center">{m.total_conversas}</td>
                      <td className="px-4 py-2.5 text-center text-green-600">{m.conversas_finalizadas}</td>
                      <td className="px-4 py-2.5 text-center text-red-600">{m.conversas_sem_resposta}</td>
                      <td className="px-4 py-2.5 text-center">
                        {m.tempo_medio_primeira_resposta_min != null
                          ? `${Math.round(m.tempo_medio_primeira_resposta_min)} min`
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center">{m.total_mensagens_enviadas}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={taxaResolucao >= 70 ? 'text-green-600' : taxaResolucao >= 40 ? 'text-amber-600' : 'text-red-600'}>
                          {taxaResolucao}%
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function CardKpi({ label, valor, cor = 'text-slate-900' }: { label: string; valor: string; cor?: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${cor}`}>{valor}</p>
    </div>
  )
}
