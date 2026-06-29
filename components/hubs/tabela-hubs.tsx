'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Check, X, KeyRound, Layers } from 'lucide-react'
import { editarHub, alterarStatusHub, definirProprietarioHub } from '@/app/(dashboard)/configuracoes/hubs/actions'
import { ModalAlterarSenha } from '@/components/hubs/modal-alterar-senha'
import type { HubStatus } from '@/types/database'

// Linha de Hub para a listagem (cadastro orientado ao representante).
// `nome` guarda o "Nome do representante". `descricao` é mantido apenas para
// preservar o dado existente na edição (campo legado, fora do formulário novo).
export type HubRow = {
  id: string
  nome: string
  nome_representante: string | null
  email: string | null
  telefone: string | null
  cnpj: string | null
  nome_fantasia: string | null
  razao_social: string | null
  observacoes: string | null
  descricao: string | null
  status: HubStatus
  criado_em: string
  atualizado_em: string
}

type ProprietarioOpcao = { id: string; nome: string; email: string | null; hub_id: string | null }

const STATUS: { valor: HubStatus; label: string; cor: string }[] = [
  { valor: 'ATIVO', label: 'Ativo', cor: 'bg-emerald-100 text-emerald-700' },
  { valor: 'INATIVO', label: 'Inativo', cor: 'bg-slate-100 text-slate-600' },
  { valor: 'SUSPENSO', label: 'Suspenso', cor: 'bg-amber-100 text-amber-700' },
  { valor: 'BLOQUEADO', label: 'Bloqueado', cor: 'bg-red-100 text-red-700' },
]

function formatarData(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR')
  } catch {
    return '—'
  }
}

export function TabelaHubs({ hubs, proprietarios }: { hubs: HubRow[]; proprietarios: ProprietarioOpcao[] }) {
  const [isPending, startTransition] = useTransition()
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [senhaHubId, setSenhaHubId] = useState<string | null>(null)
  const router = useRouter()

  function iniciarEdicao(h: HubRow) {
    setEditandoId(h.id)
    setEditNome(h.nome)
  }

  function salvarEdicao(id: string, descricaoAtual: string | null) {
    if (!editNome.trim()) {
      toast.error('Nome do Hub é obrigatório.')
      return
    }
    startTransition(async () => {
      try {
        // Preserva a descrição existente (campo legado não exibido).
        await editarHub(id, editNome.trim(), descricaoAtual)
        toast.success('Hub atualizado.')
        setEditandoId(null)
        router.refresh()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao editar.')
      }
    })
  }

  function trocarStatus(id: string, status: string) {
    startTransition(async () => {
      try {
        await alterarStatusHub(id, status)
        toast.success('Status atualizado.')
        router.refresh()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao alterar status.')
      }
    })
  }

  function vincularProprietario(hubId: string, propId: string) {
    startTransition(async () => {
      try {
        await definirProprietarioHub(hubId, propId || null)
        toast.success(propId ? 'Proprietário vinculado.' : 'Vínculo removido.')
        router.refresh()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao vincular Proprietário.')
      }
    })
  }

  return (
    <>
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left">
            <th className="px-4 py-3 font-medium text-slate-600">Nome do Hub</th>
            <th className="px-4 py-3 font-medium text-slate-600">Nome do representante</th>
            <th className="px-4 py-3 font-medium text-slate-600">E-mail</th>
            <th className="px-4 py-3 font-medium text-slate-600">Telefone</th>
            <th className="px-4 py-3 font-medium text-slate-600">CNPJ</th>
            <th className="px-4 py-3 font-medium text-slate-600">Status</th>
            <th className="px-4 py-3 font-medium text-slate-600">Proprietário</th>
            <th className="px-4 py-3 font-medium text-slate-600">Criado em</th>
            <th className="px-4 py-3 font-medium text-slate-600">Atualizado em</th>
            <th className="px-4 py-3 w-20">Ações</th>
          </tr>
        </thead>
        <tbody>
          {hubs.length === 0 && (
            <tr>
              <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                Nenhum Hub cadastrado.
              </td>
            </tr>
          )}
          {hubs.map((h) => {
            const emEdicao = editandoId === h.id
            return (
              <tr key={h.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  {emEdicao ? (
                    <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} className="h-8" />
                  ) : (
                    <span className="font-medium text-slate-800">{h.nome}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{h.nome_representante || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{h.email || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{h.telefone || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{h.cnpj || '—'}</td>
                <td className="px-4 py-3">
                  <select
                    value={h.status}
                    disabled={isPending}
                    onChange={(e) => trocarStatus(h.id, e.target.value)}
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                  >
                    {STATUS.map((s) => (
                      <option key={s.valor} value={s.valor}>{s.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const atual = proprietarios.find((p) => p.hub_id === h.id)
                    const opcoes = proprietarios.filter((p) => !p.hub_id || p.hub_id === h.id)
                    return (
                      <select
                        value={atual?.id ?? ''}
                        disabled={isPending}
                        onChange={(e) => vincularProprietario(h.id, e.target.value)}
                        className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                      >
                        <option value="">— Nenhum —</option>
                        {opcoes.map((p) => (
                          <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                      </select>
                    )
                  })()}
                </td>
                <td className="px-4 py-3 text-slate-500">{formatarData(h.criado_em)}</td>
                <td className="px-4 py-3 text-slate-500">{formatarData(h.atualizado_em)}</td>
                <td className="px-4 py-3">
                  {emEdicao ? (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" disabled={isPending} onClick={() => salvarEdicao(h.id, h.descricao)}>
                        <Check className="h-4 w-4 text-emerald-600" />
                      </Button>
                      <Button size="icon" variant="ghost" disabled={isPending} onClick={() => setEditandoId(null)}>
                        <X className="h-4 w-4 text-slate-500" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" title="Editar nome do Hub" onClick={() => iniciarEdicao(h)}>
                        <Pencil className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Link href={`/configuracoes/hubs/${h.id}`}>
                        <Button size="icon" variant="ghost" title="Portfólios autorizados">
                          <Layers className="h-4 w-4 text-slate-500" />
                        </Button>
                      </Link>
                      <Button size="icon" variant="ghost" title="Alterar senha do proprietário" onClick={() => setSenhaHubId(h.id)}>
                        <KeyRound className="h-4 w-4 text-slate-500" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
    {senhaHubId && (
      <ModalAlterarSenha
        hubId={senhaHubId}
        aberto={true}
        onOpenChange={(v) => { if (!v) setSenhaHubId(null) }}
      />
    )}
    </>
  )
}
