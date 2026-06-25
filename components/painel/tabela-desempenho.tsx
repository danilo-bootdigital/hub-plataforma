import { formatarMoeda } from '@/lib/utils'

type VendedorDesempenho = {
  nome: string
  deals_ganhos: number
  valor_total: number
}

type Props = { dados: VendedorDesempenho[] }

export function TabelaDesempenho({ dados }: Props) {
  if (dados.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">Sem dados no período.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs font-medium text-slate-500">
            <th className="pb-2 pr-4">#</th>
            <th className="pb-2 pr-4">Vendedor</th>
            <th className="pb-2 pr-4 text-right">Deals ganhos</th>
            <th className="pb-2 text-right">Valor total</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((v, i) => (
            <tr key={v.nome} className="border-b last:border-0">
              <td className="py-2 pr-4 font-medium text-slate-400">{i + 1}</td>
              <td className="py-2 pr-4 font-medium text-slate-900">{v.nome}</td>
              <td className="py-2 pr-4 text-right text-slate-700">{v.deals_ganhos}</td>
              <td className="py-2 text-right font-medium text-slate-900">{formatarMoeda(v.valor_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
