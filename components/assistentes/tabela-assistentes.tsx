'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Check, X } from 'lucide-react'
import { editarAssistente, alterarStatusAssistente, atribuirFuncaoAssistente } from '@/app/(dashboard)/hub/assistentes/actions'

export type AssistenteRow = {
  id: string
  nome: string
  email: string | null
  telefone: string | null
  ativo: boolean
  criado_em: string
  funcao_id: string | null
}
type FuncaoOpcao = { id: string; nome: string }

function formatarData(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR')
  } catch {
    return '—'
  }
}

export function TabelaAssistentes({ assistentes, funcoes }: { assistentes: AssistenteRow[]; funcoes: FuncaoOpcao[] }) {
  const [isPending, startTransition] = useTransition()
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editTelefone, setEditTelefone] = useState('')
  const router = useRouter()

  function iniciarEdicao(a: AssistenteRow) {
    setEditandoId(a.id)
    setEditNome(a.nome)
    setEditTelefone(a.telefone ?? '')
  }

  function salvarEdicao(id: string) {
    if (!editNome.trim()) {
      toast.error('Nome é obrigatório.')
      return
    }
    startTransition(async () => {
      try {
        await editarAssistente(id, editNome.trim(), editTelefone.trim() || null)
        toast.success('Assistente atualizado.')
        setEditandoId(null)
        router.refresh()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao editar.')
      }
    })
  }

  function trocarFuncao(id: string, funcaoId: string) {
    startTransition(async () => {
      try {
        await atribuirFuncaoAssistente(id, funcaoId || null)
        toast.success('Função atualizada.')
        router.refresh()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao atribuir função.')
      }
    })
  }

  function trocarStatus(id: string, ativo: boolean) {
    startTransition(async () => {
      try {
        await alterarStatusAssistente(id, ativo)
        toast.success('Status atualizado.')
        router.refresh()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao alterar status.')
      }
    })
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left">
            <th className="px-4 py-3 font-medium text-slate-600">Nome</th>
            <th className="px-4 py-3 font-medium text-slate-600">E-mail</th>
            <th className="px-4 py-3 font-medium text-slate-600">Telefone</th>
            <th className="px-4 py-3 font-medium text-slate-600">Função</th>
            <th className="px-4 py-3 font-medium text-slate-600">Status</th>
            <th className="px-4 py-3 font-medium text-slate-600">Criado em</th>
            <th className="px-4 py-3 w-20">Ações</th>
          </tr>
        </thead>
        <tbody>
          {assistentes.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                Nenhum Assistente cadastrado.
              </td>
            </tr>
          )}
          {assistentes.map((a) => {
            const emEdicao = editandoId === a.id
            return (
              <tr key={a.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  {emEdicao ? (
                    <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} className="h-8" />
                  ) : (
                    <span className="font-medium text-slate-800">{a.nome}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{a.email || '—'}</td>
                <td className="px-4 py-3 text-slate-600">
                  {emEdicao ? (
                    <Input value={editTelefone} onChange={(e) => setEditTelefone(e.target.value)} className="h-8" />
                  ) : (
                    a.telefone || '—'
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={a.funcao_id ?? ''}
                    disabled={isPending || funcoes.length === 0}
                    onChange={(e) => trocarFuncao(a.id, e.target.value)}
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                  >
                    <option value="">Sem função</option>
                    {funcoes.map((f) => (
                      <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={a.ativo ? 'true' : 'false'}
                    disabled={isPending}
                    onChange={(e) => trocarStatus(a.id, e.target.value === 'true')}
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-slate-500">{formatarData(a.criado_em)}</td>
                <td className="px-4 py-3">
                  {emEdicao ? (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" disabled={isPending} onClick={() => salvarEdicao(a.id)}>
                        <Check className="h-4 w-4 text-emerald-600" />
                      </Button>
                      <Button size="icon" variant="ghost" disabled={isPending} onClick={() => setEditandoId(null)}>
                        <X className="h-4 w-4 text-slate-500" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="icon" variant="ghost" onClick={() => iniciarEdicao(a)}>
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
