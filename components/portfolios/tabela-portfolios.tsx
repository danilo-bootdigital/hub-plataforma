'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ModalNovoPortfolio } from './modal-novo-portfolio'
import { alternarAtivoPortfolio, excluirPortfolio } from '@/app/(dashboard)/configuracoes/portfolios/actions'
import { Trash2, Search, FolderTree } from 'lucide-react'
import type { Portfolio } from '@/types/database'

type Props = {
  portfolios: Portfolio[]
}

export function TabelaPortfolios({ portfolios }: Props) {
  const [isPending, startTransition] = useTransition()
  const [busca, setBusca] = useState('')
  const router = useRouter()

  const filtrados = useMemo(() => {
    if (!busca) return portfolios
    const termo = busca.toLowerCase()
    return portfolios.filter((p) => p.nome.toLowerCase().includes(termo))
  }, [portfolios, busca])

  function handleAlternarAtivo(id: string, ativoAtual: boolean) {
    startTransition(async () => {
      try {
        await alternarAtivoPortfolio(id, !ativoAtual)
        router.refresh()
      } catch {
        toast.error('Erro ao alterar status do portfólio.')
      }
    })
  }

  function handleExcluir(id: string, nome: string) {
    if (!window.confirm(`Excluir "${nome}"? Esta ação não pode ser desfeita.`)) return
    startTransition(async () => {
      try {
        await excluirPortfolio(id)
        toast.success('Portfólio excluído.')
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao excluir.')
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar por nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left">
              <th className="px-4 py-3 font-medium text-slate-600">Nome</th>
              <th className="px-4 py-3 font-medium text-slate-600">Descrição</th>
              <th className="px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 font-medium text-slate-600">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Nenhum portfólio encontrado.
                </td>
              </tr>
            )}
            {filtrados.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium text-slate-900">
                  <Link href={`/configuracoes/portfolios/${p.id}`} className="hover:text-emerald-600 hover:underline">
                    {p.nome}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{p.descricao ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Link href={`/configuracoes/portfolios/${p.id}`}>
                      <Button variant="ghost" size="sm" className="gap-1 text-xs">
                        <FolderTree className="h-3.5 w-3.5" /> Categorias
                      </Button>
                    </Link>
                    <ModalNovoPortfolio portfolio={p} />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleAlternarAtivo(p.id, p.ativo)}
                      disabled={isPending}
                    >
                      {p.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-400 hover:text-red-600"
                      onClick={() => handleExcluir(p.id, p.nome)}
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
    </div>
  )
}
