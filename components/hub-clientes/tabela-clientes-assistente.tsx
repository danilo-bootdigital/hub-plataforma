'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { criarAtendimento } from '@/app/(dashboard)/assistente/atendimentos/actions'
import type { ClienteHubRow } from '@/components/hub-clientes/tabela-clientes-hub'

export function TabelaClientesAssistente({ clientes }: { clientes: ClienteHubRow[] }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function criar(clienteId: string) {
    startTransition(async () => {
      try {
        await criarAtendimento(clienteId)
        toast.success('Atendimento criado.')
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao criar Atendimento.')
      }
    })
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left">
            <th className="px-4 py-3 font-medium text-slate-600">Cliente</th>
            <th className="px-4 py-3 font-medium text-slate-600">Telefone</th>
            <th className="px-4 py-3 font-medium text-slate-600">E-mail</th>
            <th className="px-4 py-3 font-medium text-slate-600">Carteira</th>
            <th className="px-4 py-3 font-medium text-slate-600">Modo</th>
            <th className="px-4 py-3 w-44">Ação</th>
          </tr>
        </thead>
        <tbody>
          {clientes.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                Nenhum Cliente disponível para você no momento.
              </td>
            </tr>
          )}
          {clientes.map((c) => (
            <tr key={c.id} className="border-b last:border-0">
              <td className="px-4 py-3 font-medium text-slate-800">{c.nome}</td>
              <td className="px-4 py-3 text-slate-600">{c.telefone || '—'}</td>
              <td className="px-4 py-3 text-slate-600">{c.email || '—'}</td>
              <td className="px-4 py-3 text-slate-600">{c.carteira_nome}</td>
              <td className="px-4 py-3">
                <span className={c.modo === 'ABERTA' ? 'text-emerald-700' : 'text-blue-700'}>
                  {c.modo === 'ABERTA' ? 'Aberta' : 'Distribuída'}
                </span>
              </td>
              <td className="px-4 py-3">
                <Button size="sm" variant="outline" className="gap-1.5" disabled={isPending} onClick={() => criar(c.id)}>
                  <Plus className="h-4 w-4" />
                  Criar Atendimento
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
