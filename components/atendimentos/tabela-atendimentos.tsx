'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'
import { criarOrcamento } from '@/app/(dashboard)/assistente/orcamentos/actions'

// Tabela de Atendimentos do Assistente (Fatia 11) + ação "Criar Orçamento" (Fatia 12).
export type AtendimentoRow = {
  id: string
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
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function criar(atendimentoId: string) {
    startTransition(async () => {
      try {
        await criarOrcamento(atendimentoId)
        toast.success('Orçamento criado (rascunho).')
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao criar Orçamento.')
      }
    })
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left">
            <th className="px-4 py-3 font-medium text-slate-600">Cliente</th>
            <th className="px-4 py-3 font-medium text-slate-600">Carteira</th>
            <th className="px-4 py-3 font-medium text-slate-600">Etapa</th>
            <th className="px-4 py-3 font-medium text-slate-600">Criado em</th>
            <th className="px-4 py-3 font-medium text-slate-600">Responsável</th>
            <th className="px-4 py-3 w-44">Ação</th>
          </tr>
        </thead>
        <tbody>
          {atendimentos.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                Nenhum Atendimento criado por você.
              </td>
            </tr>
          )}
          {atendimentos.map((a) => (
            <tr key={a.id} className="border-b last:border-0">
              <td className="px-4 py-3 font-medium text-slate-800">{a.cliente_nome}</td>
              <td className="px-4 py-3 text-slate-600">{a.carteira_nome}</td>
              <td className="px-4 py-3 text-slate-600">{a.etapa}</td>
              <td className="px-4 py-3 text-slate-500">{formatarData(a.criado_em)}</td>
              <td className="px-4 py-3 text-slate-600">{a.responsavel_nome}</td>
              <td className="px-4 py-3">
                <Button size="sm" variant="outline" className="gap-1.5" disabled={isPending} onClick={() => criar(a.id)}>
                  <FileText className="h-4 w-4" />
                  Criar Orçamento
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
