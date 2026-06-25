'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BadgeStatusOrcamento } from './badge-status-orcamento'
import { formatarMoeda } from '@/lib/utils'
import { excluirOrcamento } from '@/app/(dashboard)/orcamentos/actions'
import { Trash2, Search } from 'lucide-react'
import type { QuoteStatus } from '@/types/database'

type OrcamentoLista = {
  id: string
  numero: number
  status: QuoteStatus
  valor_total: number
  criado_em: string
  responsavel: { nome: string } | null
  lead: { nome: string | null } | null
  contato: { nome: string } | null
  deal: { titulo: string } | null
}

type Props = { orcamentos: OrcamentoLista[] }

export function TabelaOrcamentos({ orcamentos }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [busca, setBusca] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  // Função para lidar com duplo clique
  const handleDoubleClick = (orcamentoId: string) => {
    router.push(`/orcamentos/${orcamentoId}`)
  }

  // Função para lidar com clique simples (opcional - pode ser usado para seleção)
  const handleSingleClick = (orcamentoId: string) => {
    // Pode ser usado para seleção visual ou outras ações
    console.log('Orçamento selecionado:', orcamentoId)
  }

  // Filtrar
  const filtrados = orcamentos.filter((o) => {
    // Filtro por texto (nome do lead/contato ou número)
    if (busca) {
      const termo = busca.toLowerCase()
      const matchNome = o.lead?.nome?.toLowerCase().includes(termo)
      const matchContato = o.contato?.nome?.toLowerCase().includes(termo)
      const matchNumero = o.numero.toString().includes(termo)
      const matchDeal = o.deal?.titulo?.toLowerCase().includes(termo)
      if (!matchNome && !matchContato && !matchNumero && !matchDeal) return false
    }
    // Filtro por data
    if (dataInicio) {
      const inicio = new Date(dataInicio + 'T00:00:00')
      if (new Date(o.criado_em) < inicio) return false
    }
    if (dataFim) {
      const fim = new Date(dataFim + 'T23:59:59')
      if (new Date(o.criado_em) > fim) return false
    }
    return true
  })

  function handleExcluir(id: string, numero: number, e: React.MouseEvent) {
    e.stopPropagation()
    const confirmar = window.confirm(`Excluir orçamento #${numero}? Esta ação não pode ser desfeita.`)
    if (!confirmar) return

    startTransition(async () => {
      try {
        await excluirOrcamento(id)
        toast.success(`Orçamento #${numero} excluído.`)
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao excluir.')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por cliente, negociação ou número..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-10 rounded-xl border-slate-200 bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="w-36 h-10 rounded-xl border-slate-200 bg-white"
          />
          <span className="text-sm text-slate-400">até</span>
          <Input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="w-36 h-10 rounded-xl border-slate-200 bg-white"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50 text-left">
              <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cliente / Lead</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Negociação</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Responsável</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</th>
              <th className="px-5 py-3.5 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                  Nenhum orçamento encontrado.
                </td>
              </tr>
            )}
            {filtrados.map((o) => (
              <tr
                key={o.id}
                className="border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50/50 cursor-pointer"
                onDoubleClick={() => handleDoubleClick(o.id)}
                onClick={() => handleSingleClick(o.id)}
              >
                <td className="px-5 py-4">
                  <span className="font-semibold text-slate-700">#{o.numero.toString().padStart(3, '0')}</span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-semibold text-emerald-700">
                      {(o.contato?.nome ?? o.lead?.nome ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-slate-700">{o.contato?.nome ?? o.lead?.nome ?? '—'}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-500">{o.deal?.titulo ?? '—'}</td>
                <td className="px-5 py-4">
                  <span className="font-semibold text-slate-800">{formatarMoeda(o.valor_total)}</span>
                </td>
                <td className="px-5 py-4"><BadgeStatusOrcamento status={o.status} /></td>
                <td className="px-5 py-4 text-slate-500">{o.responsavel?.nome ?? '—'}</td>
                <td className="px-5 py-4 text-slate-400 text-sm">
                  {format(new Date(o.criado_em), 'dd/MM/yyyy', { locale: ptBR })}
                </td>
                <td className="px-5 py-4">
                  {(o.status === 'rascunho' || o.status === 'rejeitado_internamente') && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                      onClick={(e) => handleExcluir(o.id, o.numero, e)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {busca || dataInicio || dataFim ? (
        <p className="text-xs text-slate-400">
          Mostrando {filtrados.length} de {orcamentos.length} orçamentos
        </p>
      ) : null}
    </div>
  )
}
