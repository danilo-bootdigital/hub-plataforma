import Link from 'next/link'
import { formatarMoeda } from '@/lib/utils'
import { CartaoTabela, tabela } from '@/components/layout/listagem'

// Tabela de Orçamentos do HUB (área operacional /hub/orcamentos).
// Escopo já garantido no servidor por hub_id — aqui é só apresentação.
export type OrcamentoHubRow = {
  id: string
  numero: number | null
  cliente_nome: string
  portfolio_nome: string
  status: string
  valor_total: number | null
  criado_em: string
  responsavel_nome: string
}

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  aguardando_aprovacao_interna: 'Aguardando aprovação interna',
  aprovado_internamente: 'Aprovado internamente',
  rejeitado_internamente: 'Rejeitado internamente',
  enviado_ao_cliente: 'Enviado ao cliente',
  aguardando_confirmacao_vendedor: 'Aguardando confirmação',
  aprovado_pelo_cliente: 'Aprovado pelo cliente',
  recusado_pelo_cliente: 'Recusado pelo cliente',
}

// Status em que o orçamento do Hub ainda pode ser editado (espelha o backend).
const STATUS_EDITAVEIS = new Set(['rascunho', 'rejeitado_internamente', 'aguardando_aprovacao_interna'])

const STATUS_CLASSE: Record<string, string> = {
  rascunho: 'bg-slate-100 text-slate-600',
  aguardando_aprovacao_interna: 'bg-amber-100 text-amber-700',
  aprovado_internamente: 'bg-emerald-100 text-emerald-700',
  rejeitado_internamente: 'bg-red-100 text-red-700',
  enviado_ao_cliente: 'bg-blue-100 text-blue-700',
  aprovado_pelo_cliente: 'bg-emerald-100 text-emerald-700',
  recusado_pelo_cliente: 'bg-red-100 text-red-700',
}

function formatarData(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR')
  } catch {
    return '—'
  }
}

export function TabelaOrcamentosHub({ orcamentos }: { orcamentos: OrcamentoHubRow[] }) {
  return (
    <CartaoTabela>
      <table className={tabela.root}>
        <thead>
          <tr className={tabela.theadTr}>
            <th className={tabela.th}>Nº</th>
            <th className={tabela.th}>Cliente</th>
            <th className={tabela.th}>Portfólio</th>
            <th className={tabela.th}>Status</th>
            <th className={`${tabela.th} text-right`}>Valor</th>
            <th className={tabela.th}>Criado em</th>
            <th className={tabela.th}>Responsável</th>
            <th className={`${tabela.th} w-32`}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {orcamentos.length === 0 && (
            <tr>
              <td colSpan={8} className={tabela.vazio}>
                Nenhum orçamento no seu Hub ainda.
              </td>
            </tr>
          )}
          {orcamentos.map((o) => (
            <tr key={o.id} className={tabela.tr}>
              <td className={`${tabela.td} text-slate-700`}>{o.numero ?? '—'}</td>
              <td className={`${tabela.td} font-medium text-slate-800`}>{o.cliente_nome}</td>
              <td className={`${tabela.td} text-slate-600`}>{o.portfolio_nome}</td>
              <td className={tabela.td}>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASSE[o.status] ?? 'bg-slate-100 text-slate-600'}`}>
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
              </td>
              <td className={`${tabela.td} text-right text-slate-700`}>{formatarMoeda(o.valor_total)}</td>
              <td className={`${tabela.td} text-slate-500`}>{formatarData(o.criado_em)}</td>
              <td className={`${tabela.td} text-slate-600`}>{o.responsavel_nome}</td>
              <td className={tabela.td}>
                <div className="flex items-center gap-3">
                  <Link href={`/orcamentos/${o.id}`} className="text-emerald-700 hover:underline">
                    Abrir
                  </Link>
                  {STATUS_EDITAVEIS.has(o.status) && (
                    <Link href={`/hub/orcamentos/${o.id}/editar`} className="text-slate-500 hover:underline">
                      Editar
                    </Link>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </CartaoTabela>
  )
}
