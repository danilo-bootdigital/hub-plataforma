'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Pencil, Check, X } from 'lucide-react'
import { definirModoCarteira } from '@/app/(dashboard)/hub/carteiras/actions'

export type CarteiraHub = {
  id: string
  nome: string
  modo: 'ABERTA' | 'DISTRIBUIDA'
  responsavel_id: string | null
}
type AssistenteOpcao = { id: string; nome: string }

export function TabelaConfigCarteiras({
  carteiras,
  assistentes,
}: {
  carteiras: CarteiraHub[]
  assistentes: AssistenteOpcao[]
}) {
  const [isPending, startTransition] = useTransition()
  const [editId, setEditId] = useState<string | null>(null)
  const [modo, setModo] = useState<'ABERTA' | 'DISTRIBUIDA'>('ABERTA')
  const [resp, setResp] = useState('')
  const router = useRouter()

  const nomeAssistente = (id: string | null) =>
    id ? assistentes.find((a) => a.id === id)?.nome ?? '—' : '—'

  function iniciar(c: CarteiraHub) {
    setEditId(c.id)
    setModo(c.modo)
    setResp(c.responsavel_id ?? '')
  }

  function salvar(id: string) {
    if (modo === 'DISTRIBUIDA' && !resp) {
      toast.error('Selecione um Assistente responsável.')
      return
    }
    startTransition(async () => {
      try {
        await definirModoCarteira(id, modo, modo === 'DISTRIBUIDA' ? resp : null)
        toast.success('Configuração salva.')
        setEditId(null)
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao salvar.')
      }
    })
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left">
            <th className="px-4 py-3 font-medium text-slate-600">Carteira</th>
            <th className="px-4 py-3 font-medium text-slate-600">Modo</th>
            <th className="px-4 py-3 font-medium text-slate-600">Responsável</th>
            <th className="px-4 py-3 w-24">Ações</th>
          </tr>
        </thead>
        <tbody>
          {carteiras.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                Nenhuma Carteira autorizada ao seu Hub.
              </td>
            </tr>
          )}
          {carteiras.map((c) => {
            const emEdicao = editId === c.id
            return (
              <tr key={c.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium text-slate-800">{c.nome}</td>
                <td className="px-4 py-3">
                  {emEdicao ? (
                    <select
                      value={modo}
                      disabled={isPending}
                      onChange={(e) => setModo(e.target.value as 'ABERTA' | 'DISTRIBUIDA')}
                      className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                    >
                      <option value="ABERTA">Aberta</option>
                      <option value="DISTRIBUIDA">Distribuída</option>
                    </select>
                  ) : (
                    <span className={c.modo === 'ABERTA' ? 'text-emerald-700' : 'text-blue-700'}>
                      {c.modo === 'ABERTA' ? 'Aberta' : 'Distribuída'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {emEdicao ? (
                    modo === 'DISTRIBUIDA' ? (
                      <select
                        value={resp}
                        disabled={isPending}
                        onChange={(e) => setResp(e.target.value)}
                        className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                      >
                        <option value="">— Selecione —</option>
                        {assistentes.map((a) => (
                          <option key={a.id} value={a.id}>{a.nome}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-slate-400">— (aberta)</span>
                    )
                  ) : (
                    nomeAssistente(c.responsavel_id)
                  )}
                </td>
                <td className="px-4 py-3">
                  {emEdicao ? (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" disabled={isPending} onClick={() => salvar(c.id)}>
                        <Check className="h-4 w-4 text-emerald-600" />
                      </Button>
                      <Button size="icon" variant="ghost" disabled={isPending} onClick={() => setEditId(null)}>
                        <X className="h-4 w-4 text-slate-500" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="icon" variant="ghost" onClick={() => iniciar(c)}>
                      <Pencil className="h-4 w-4 text-slate-500" />
                    </Button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
