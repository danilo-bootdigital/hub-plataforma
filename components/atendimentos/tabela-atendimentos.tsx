'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'
import { CartaoTabela, tabela } from '@/components/layout/listagem'

// Tabela de Atendimentos do Assistente. "Criar Orçamento" leva ao fluxo OFICIAL do
// Hub (/orcamentos/novo → criarOrcamentoHub), preservando cliente (contato) e
// atendimento (deal). NÃO cria mais orçamento pelo fluxo legado (que nascia sem
// hub_id/portfolio_id e ficava invisível em /hub/orcamentos).
export type AtendimentoRow = {
  id: string
  contato_id: string | null
  cliente_nome: string
  carteira_nome: string
  etapa: string
  criado_em: string
  responsavel_nome: string
}

function formatarData(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR')
  } catch {
    return '—'
  }
}

export function TabelaAtendimentos({ atendimentos }: { atendimentos: AtendimentoRow[] }) {
  const router = useRouter()

  // Vai para o fluxo oficial do Hub, preservando cliente e atendimento na URL.
  function novoOrcamento(a: AtendimentoRow) {
    const params = new URLSearchParams()
    if (a.contato_id) params.set('contato_id', a.contato_id)
    params.set('deal_id', a.id)
    router.push(`/orcamentos/novo?${params.toString()}`)
  }

  return (
    <CartaoTabela>
      <table className={tabela.root}>
        <thead>
          <tr className={tabela.theadTr}>
            <th className={tabela.th}>Cliente</th>
            <th className={tabela.th}>Carteira</th>
            <th className={tabela.th}>Etapa</th>
            <th className={tabela.th}>Criado em</th>
            <th className={tabela.th}>Responsável</th>
            <th className={`${tabela.th} w-44`}>Ação</th>
          </tr>
        </thead>
        <tbody>
          {atendimentos.length === 0 && (
            <tr>
              <td colSpan={6} className={tabela.vazio}>
                Nenhum Atendimento criado por você.
              </td>
            </tr>
          )}
          {atendimentos.map((a) => (
            <tr key={a.id} className={tabela.tr}>
              <td className={`${tabela.td} font-medium text-slate-800`}>{a.cliente_nome}</td>
              <td className={`${tabela.td} text-slate-600`}>{a.carteira_nome}</td>
              <td className={`${tabela.td} text-slate-600`}>{a.etapa}</td>
              <td className={`${tabela.td} text-slate-500`}>{formatarData(a.criado_em)}</td>
              <td className={`${tabela.td} text-slate-600`}>{a.responsavel_nome}</td>
              <td className={tabela.td}>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => novoOrcamento(a)}>
                  <FileText className="h-4 w-4" />
                  Criar Orçamento
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </CartaoTabela>
  )
}
