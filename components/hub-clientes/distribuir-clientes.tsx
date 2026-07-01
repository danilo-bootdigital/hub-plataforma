'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { definirResponsavelOperacional } from '@/app/(dashboard)/hub/clientes/actions'

export type ClienteHub = {
  id: string
  nome: string
  telefone: string | null
  carteira_id: string | null
  carteira_nome: string | null
  responsavel_operacional_id: string | null
  responsavel_nome: string | null
}
type Assistente = { id: string; nome: string }

export function DistribuirClientes({ clientes, assistentes }: { clientes: ClienteHub[]; assistentes: Assistente[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [busca, setBusca] = useState('')

  const filtrados = useMemo(
    () => clientes.filter((c) => !busca || c.nome.toLowerCase().includes(busca.toLowerCase())),
    [clientes, busca]
  )

  function definir(contatoId: string, assistenteId: string) {
    startTransition(async () => {
      try {
        await definirResponsavelOperacional(contatoId, assistenteId || null)
        toast.success('Responsável operacional atualizado.')
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao definir responsável.')
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input placeholder="Buscar cliente..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left">
              <th className="px-4 py-3 font-medium text-slate-600">Cliente</th>
              <th className="px-4 py-3 font-medium text-slate-600">Carteira (Indústria)</th>
              <th className="px-4 py-3 font-medium text-slate-600">Responsável operacional (Hub)</th>
              <th className="px-4 py-3 font-medium text-slate-600">Telefone</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                {clientes.length === 0 ? 'Nenhum cliente nas Carteiras operadas pelo seu Hub.' : 'Nenhum cliente encontrado.'}
              </td></tr>
            )}
            {filtrados.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium text-slate-900">{c.nome}</td>
                <td className="px-4 py-3 text-slate-600">{c.carteira_nome ?? '—'}</td>
                <td className="px-4 py-3">
                  <select
                    value={c.responsavel_operacional_id ?? ''}
                    disabled={isPending || assistentes.length === 0}
                    onChange={(e) => definir(c.id, e.target.value)}
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                  >
                    <option value="">Sem responsável</option>
                    {assistentes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-slate-600">{c.telefone ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {assistentes.length === 0 && (
        <p className="text-xs text-amber-600">Nenhum Assistente ativo no seu Hub — crie Assistentes em “Assistentes”.</p>
      )}
    </div>
  )
}
