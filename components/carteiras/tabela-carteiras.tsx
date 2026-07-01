'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Check, X } from 'lucide-react'
import { editarCarteira, alterarStatusCarteira, autorizarCarteiraHub } from '@/app/(dashboard)/configuracoes/carteiras/actions'
import type { Carteira } from '@/types/database'

type HubOpcao = { id: string; nome: string }

function formatarData(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR')
  } catch {
    return '—'
  }
}

export function TabelaCarteiras({ carteiras, hubs, contagens = {} }: { carteiras: Carteira[]; hubs: HubOpcao[]; contagens?: Record<string, number> }) {
  const [isPending, startTransition] = useTransition()
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editDescricao, setEditDescricao] = useState('')
  const [editObs, setEditObs] = useState('')
  const router = useRouter()

  function iniciarEdicao(c: Carteira) {
    setEditandoId(c.id)
    setEditNome(c.nome)
    setEditDescricao(c.descricao ?? '')
    setEditObs(c.observacoes ?? '')
  }

  function salvarEdicao(id: string) {
    if (!editNome.trim()) {
      toast.error('Nome é obrigatório.')
      return
    }
    startTransition(async () => {
      try {
        await editarCarteira(id, editNome.trim(), editDescricao.trim() || null, editObs.trim() || null)
        toast.success('Carteira atualizada.')
        setEditandoId(null)
        router.refresh()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao editar.')
      }
    })
  }

  function trocarStatus(id: string, ativo: boolean) {
    startTransition(async () => {
      try {
        await alterarStatusCarteira(id, ativo)
        toast.success('Status atualizado.')
        router.refresh()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao alterar status.')
      }
    })
  }

  function autorizarHub(id: string, hubId: string) {
    startTransition(async () => {
      try {
        await autorizarCarteiraHub(id, hubId || null)
        toast.success(hubId ? 'Hub autorizado.' : 'Autorização removida.')
        router.refresh()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao autorizar Hub.')
      }
    })
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left">
            <th className="px-4 py-3 font-medium text-slate-600">Nome</th>
            <th className="px-4 py-3 font-medium text-slate-600">Clientes</th>
            <th className="px-4 py-3 font-medium text-slate-600">Descrição</th>
            <th className="px-4 py-3 font-medium text-slate-600">Observações</th>
            <th className="px-4 py-3 font-medium text-slate-600">Ordem</th>
            <th className="px-4 py-3 font-medium text-slate-600">Status</th>
            <th className="px-4 py-3 font-medium text-slate-600">Hub autorizado</th>
            <th className="px-4 py-3 font-medium text-slate-600">Criada em</th>
            <th className="px-4 py-3 font-medium text-slate-600">Atualizada em</th>
            <th className="px-4 py-3 w-20">Ações</th>
          </tr>
        </thead>
        <tbody>
          {carteiras.length === 0 && (
            <tr>
              <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                Nenhuma Carteira cadastrada.
              </td>
            </tr>
          )}
          {carteiras.map((c) => {
            const emEdicao = editandoId === c.id
            return (
              <tr key={c.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  {emEdicao ? (
                    <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} className="h-8" />
                  ) : (
                    <span className="font-medium text-slate-800">{c.nome}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{contagens[c.id] ?? 0}</td>
                <td className="px-4 py-3 text-slate-600">
                  {emEdicao ? (
                    <Input value={editDescricao} onChange={(e) => setEditDescricao(e.target.value)} className="h-8" />
                  ) : (
                    c.descricao || '—'
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {emEdicao ? (
                    <Input value={editObs} onChange={(e) => setEditObs(e.target.value)} className="h-8" />
                  ) : (
                    c.observacoes || '—'
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">{c.ordem}</td>
                <td className="px-4 py-3">
                  <select
                    value={c.ativo ? 'true' : 'false'}
                    disabled={isPending}
                    onChange={(e) => trocarStatus(c.id, e.target.value === 'true')}
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                  >
                    <option value="true">Ativa</option>
                    <option value="false">Inativa</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={c.hub_id ?? ''}
                    disabled={isPending}
                    onChange={(e) => autorizarHub(c.id, e.target.value)}
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                  >
                    <option value="">— Nenhum —</option>
                    {hubs.map((h) => (
                      <option key={h.id} value={h.id}>{h.nome}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-slate-500">{formatarData(c.criado_em)}</td>
                <td className="px-4 py-3 text-slate-500">{formatarData(c.atualizado_em)}</td>
                <td className="px-4 py-3">
                  {emEdicao ? (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" disabled={isPending} onClick={() => salvarEdicao(c.id)}>
                        <Check className="h-4 w-4 text-emerald-600" />
                      </Button>
                      <Button size="icon" variant="ghost" disabled={isPending} onClick={() => setEditandoId(null)}>
                        <X className="h-4 w-4 text-slate-500" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="icon" variant="ghost" onClick={() => iniciarEdicao(c)}>
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
