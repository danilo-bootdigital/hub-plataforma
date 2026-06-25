'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Pencil, Check, X } from 'lucide-react'
import { excluirFornecedor, editarFornecedor } from '@/app/(dashboard)/configuracoes/fornecedores/actions'
import type { Supplier } from '@/types/database'

type FornecedorComHub = Supplier & {
  hub_id: string | null
  health_hubs?: {
    id: string
    nome: string
  } | null
}

export function TabelaFornecedores({ fornecedores }: { fornecedores: FornecedorComHub[] }) {
  const [isPending, startTransition] = useTransition()
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const router = useRouter()

  function iniciarEdicao(f: FornecedorComHub, e: React.MouseEvent) {
    e.stopPropagation()
    setEditandoId(f.id)
    setEditNome(f.nome)
  }

  function cancelarEdicao(e: React.MouseEvent) {
    e.stopPropagation()
    setEditandoId(null)
  }

  function salvarEdicao(id: string, hubId: string | null, e: React.MouseEvent) {
    e.stopPropagation()
    if (!editNome.trim()) {
      toast.error('Nome é obrigatório.')
      return
    }
    startTransition(async () => {
      try {
        await editarFornecedor(id, editNome.trim(), hubId)
        toast.success('Fornecedor atualizado.')
        setEditandoId(null)
        router.refresh()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao editar.')
      }
    })
  }

  function handleExcluir(id: string, nome: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!window.confirm(`Excluir fornecedor "${nome}"? Só é possível se não houver produtos vinculados.`)) return
    startTransition(async () => {
      try {
        await excluirFornecedor(id)
        toast.success('Fornecedor excluído.')
        router.refresh()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao excluir.')
      }
    })
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left">
            <th className="px-4 py-3 font-medium text-slate-600">Nome</th>
            <th className="px-4 py-3 font-medium text-slate-600">CNPJ</th>
            <th className="px-4 py-3 font-medium text-slate-600">Hub</th>
            <th className="px-4 py-3 font-medium text-slate-600">Telefone</th>
            <th className="px-4 py-3 font-medium text-slate-600">E-mail</th>
            <th className="px-4 py-3 w-24">Ações</th>
          </tr>
        </thead>
        <tbody>
          {fornecedores.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                Nenhum fornecedor cadastrado.
              </td>
            </tr>
          )}
          {fornecedores.map((f) => (
            <tr
              key={f.id}
              className="border-b last:border-0 hover:bg-slate-50 cursor-pointer"
              onClick={() => { if (editandoId !== f.id) router.push(`/configuracoes/fornecedores/${f.id}`) }}
            >
              <td className="px-4 py-3">
                {editandoId === f.id ? (
                  <Input
                    className="h-8 text-sm"
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => { if (e.key === 'Enter') salvarEdicao(f.id, f.hub_id, e as unknown as React.MouseEvent); if (e.key === 'Escape') setEditandoId(null) }}
                    autoFocus
                  />
                ) : (
                  <span className="font-medium text-slate-900">{f.nome}</span>
                )}
              </td>
              <td className="px-4 py-3 text-slate-600">{f.cnpj ?? '—'}</td>
              <td className="px-4 py-3 text-slate-600">
                {f.health_hubs?.nome ?? '—'}
              </td>
              <td className="px-4 py-3 text-slate-600">{f.telefone ?? '—'}</td>
              <td className="px-4 py-3 text-slate-600">{f.email ?? '—'}</td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  {editandoId === f.id ? (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={(e) => salvarEdicao(f.id, f.hub_id, e)} disabled={isPending}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={cancelarEdicao}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600" onClick={(e) => iniciarEdicao(f, e)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={(e) => handleExcluir(f.id, f.nome, e)} disabled={isPending}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
