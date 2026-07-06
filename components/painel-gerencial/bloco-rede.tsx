import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { formatarMoeda } from '@/lib/utils'
import { CartaoTabela, tabela } from '@/components/layout/listagem'
import { SecaoPainel, Selo, tomDoStatusHub } from './secao'
import { formatarNumero, formatarDataRelativa } from './formato'
import type { HubPerformance } from '@/app/(dashboard)/painel/dados'

/**
 * BLOCO 2 — Performance da Rede.
 * Ranking dos Hubs (ordenado por faturamento). A Indústria ACOMPANHA — o botão
 * "Visualizar Hub" leva à página de gestão do Hub; nenhuma ação operacional.
 */
export function BlocoRede({ rede }: { rede: HubPerformance[] }) {
  return (
    <SecaoPainel titulo="Performance da Rede" descricao="Ranking dos Hubs por faturamento">
      <CartaoTabela>
        <div className="overflow-x-auto">
          <table className={tabela.root}>
            <thead>
              <tr className={tabela.theadTr}>
                <th className={tabela.th}>Hub</th>
                <th className={tabela.th}>Cidade</th>
                <th className={`${tabela.th} text-right`}>Clientes</th>
                <th className={`${tabela.th} text-right`}>Orçamentos</th>
                <th className={`${tabela.th} text-right`}>Pedidos</th>
                <th className={`${tabela.th} text-right`}>Faturamento</th>
                <th className={tabela.th}>Último acesso</th>
                <th className={tabela.th}>Status</th>
                <th className={`${tabela.th} text-right`}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rede.length === 0 && (
                <tr>
                  <td className={tabela.vazio} colSpan={9}>
                    Nenhum Hub cadastrado ainda.
                  </td>
                </tr>
              )}
              {rede.map((h) => (
                <tr key={h.id} className={tabela.tr}>
                  <td className={`${tabela.td} font-medium text-slate-900`}>{h.nome}</td>
                  {/* TODO(backend): cidade/uf não existem em `hubs` — placeholder. */}
                  <td className={`${tabela.td} text-slate-400`}>{h.cidade ?? '—'}</td>
                  <td className={`${tabela.td} text-right tabular-nums text-slate-700`}>{formatarNumero(h.clientes)}</td>
                  <td className={`${tabela.td} text-right tabular-nums text-slate-700`}>{formatarNumero(h.orcamentos)}</td>
                  <td className={`${tabela.td} text-right tabular-nums text-slate-700`}>{formatarNumero(h.pedidos)}</td>
                  <td className={`${tabela.td} text-right tabular-nums font-medium text-slate-900`}>{formatarMoeda(h.faturamento)}</td>
                  <td className={`${tabela.td} text-slate-500`}>{formatarDataRelativa(h.ultimoAcesso)}</td>
                  <td className={tabela.td}>
                    <Selo tom={tomDoStatusHub(h.status)}>{(h.status ?? '').toUpperCase() || '—'}</Selo>
                  </td>
                  <td className={`${tabela.td} text-right`}>
                    <Link
                      href={`/configuracoes/hubs/${h.id}`}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 transition-colors hover:bg-slate-50 hover:text-slate-900"
                    >
                      Visualizar Hub
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CartaoTabela>
    </SecaoPainel>
  )
}
