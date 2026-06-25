import { formatarMoeda } from '@/lib/utils'

type DadoVendedor = { nome: string; valor: number; deals: number }

type Props = { dados: DadoVendedor[] }

export function TabelaResumoVendas({ dados }: Props) {
  if (dados.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">Sem vendas no período.</p>
  }

  const totalValor = dados.reduce((acc, d) => acc + d.valor, 0)
  const totalDeals = dados.reduce((acc, d) => acc + d.deals, 0)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs font-medium text-slate-500">
            <th className="pb-2 pr-4">#</th>
            <th className="pb-2 pr-4">Vendedor</th>
            <th className="pb-2 pr-4 text-right">Deals ganhos</th>
            <th className="pb-2 pr-4 text-right">Valor total</th>
            <th className="pb-2 text-right">Ticket médio</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((v, i) => (
            <tr key={v.nome} className="border-b last:border-0">
              <td className="py-2 pr-4 font-medium text-slate-400">{i + 1}</td>
              <td className="py-2 pr-4 font-medium text-slate-900">{v.nome}</td>
              <td className="py-2 pr-4 text-right text-slate-700">{v.deals}</td>
              <td className="py-2 pr-4 text-right font-medium text-slate-900">{formatarMoeda(v.valor)}</td>
              <td className="py-2 text-right text-slate-700">{formatarMoeda(v.deals > 0 ? v.valor / v.deals : 0)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t font-bold">
            <td className="pt-2 pr-4" colSpan={2}>Total</td>
            <td className="pt-2 pr-4 text-right">{totalDeals}</td>
            <td className="pt-2 pr-4 text-right">{formatarMoeda(totalValor)}</td>
            <td className="pt-2 text-right">{formatarMoeda(totalDeals > 0 ? totalValor / totalDeals : 0)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
