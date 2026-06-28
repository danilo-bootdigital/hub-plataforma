import { formatarMoeda } from '@/lib/utils'
import { BotaoGerarPedido } from '@/components/prepedidos/botao-gerar-pedido'

// Listagem mínima de Pré-pedidos do Assistente (Fatia 16).
// Pré-pedido = orders@pendente derivado de um Orçamento aprovado pelo Cliente.
export type PrePedidoRow = {
  id: string
  cliente_nome: string
  orcamento_numero: number | null
  atendimento_titulo: string
  valor_total: number
  status: string
  criado_em: string
}

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pré-pedido',
  em_producao: 'Em produção',
  pronto: 'Pronto',
  enviado: 'Enviado',
  entregue: 'Entregue',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

function formatarData(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR')
  } catch {
    return '—'
  }
}

export function TabelaPrePedidos({ prepedidos }: { prepedidos: PrePedidoRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left">
            <th className="px-4 py-3 font-medium text-slate-600">Cliente</th>
            <th className="px-4 py-3 font-medium text-slate-600">Orçamento de origem</th>
            <th className="px-4 py-3 font-medium text-slate-600">Atendimento</th>
            <th className="px-4 py-3 font-medium text-slate-600">Valor total</th>
            <th className="px-4 py-3 font-medium text-slate-600">Status</th>
            <th className="px-4 py-3 font-medium text-slate-600">Criado em</th>
            <th className="px-4 py-3 font-medium text-slate-600">Ações</th>
          </tr>
        </thead>
        <tbody>
          {prepedidos.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                Nenhum Pré-pedido criado por você.
              </td>
            </tr>
          )}
          {prepedidos.map((p) => (
            <tr key={p.id} className="border-b last:border-0">
              <td className="px-4 py-3 font-medium text-slate-800">{p.cliente_nome}</td>
              <td className="px-4 py-3 text-slate-600">{p.orcamento_numero ? `Orçamento #${p.orcamento_numero}` : '—'}</td>
              <td className="px-4 py-3 text-slate-600">{p.atendimento_titulo}</td>
              <td className="px-4 py-3 text-slate-700 tabular-nums">{formatarMoeda(Number(p.valor_total))}</td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                  {STATUS_LABEL[p.status] ?? p.status}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-500">{formatarData(p.criado_em)}</td>
              <td className="px-4 py-3">
                <BotaoGerarPedido orderId={p.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
