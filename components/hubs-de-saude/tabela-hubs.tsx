'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Trash2, ImageIcon } from 'lucide-react'
import { excluirHub } from '@/app/(dashboard)/configuracoes/hubs-de-saude/actions'
import { ModalEditarHub } from './modal-editar-hub'

type Hub = {
  id: string
  nome: string
  status: string
  logo_url: string | null
  criado_em: string
}

type Props = {
  hubs: Hub[]
  fornecedoresPorHub: Record<string, number>
}

export function TabelaHubs({ hubs, fornecedoresPorHub }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleExcluir(id: string, nome: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!window.confirm(`Excluir hub "${nome}"?`)) return
    startTransition(async () => {
      try {
        await excluirHub(id)
        toast.success('Hub excluído.')
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
            <th className="px-4 py-3 font-medium text-slate-600 w-16">Logo</th>
            <th className="px-4 py-3 font-medium text-slate-600">Nome</th>
            <th className="px-4 py-3 font-medium text-slate-600">Status</th>
            <th className="px-4 py-3 font-medium text-slate-600">Fornecedores</th>
            <th className="px-4 py-3 w-24">Ações</th>
          </tr>
        </thead>
        <tbody>
          {hubs.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                Nenhum hub de saúde cadastrado.
              </td>
            </tr>
          )}
          {hubs.map((hub) => (
            <tr
              key={hub.id}
              className="border-b last:border-0 hover:bg-slate-50"
            >
              <td className="px-4 py-3">
                {hub.logo_url ? (
                  <img
                    src={hub.logo_url}
                    alt={hub.nome}
                    className="h-10 w-10 rounded-lg object-cover border"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-lg border border-dashed border-slate-300 flex items-center justify-center bg-slate-50">
                    <ImageIcon className="h-5 w-5 text-slate-300" />
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="font-medium text-slate-900">{hub.nome}</span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  hub.status === 'ativo'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {hub.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600">
                {fornecedoresPorHub[hub.id] || 0}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <ModalEditarHub hub={hub} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:text-red-700"
                    onClick={(e) => handleExcluir(hub.id, hub.nome, e)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
