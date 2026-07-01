'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { BadgePerfil } from './badge-perfil'
import { ModalAlterarSenha } from './modal-alterar-senha'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, Pencil } from 'lucide-react'
import { alternarStatusUsuario, atribuirFuncao } from '@/app/(dashboard)/configuracoes/usuarios/actions'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { UserRole } from '@/types/database'

export type UsuarioLinha = {
  id: string
  nome: string
  email: string
  telefone: string | null
  cargo: UserRole
  ativo: boolean
  criado_em: string
  hub_id: string | null
  hub_nome: string | null
  funcao_id: string | null
  ultimo_acesso: string | null
}
export type FuncaoOpcao = { id: string; nome: string; hub_id: string }

const dataCurta = (s: string | null) => (s ? format(new Date(s), 'dd/MM/yyyy', { locale: ptBR }) : '—')
const dataHora = (s: string | null) => (s ? format(new Date(s), "dd/MM/yyyy HH:mm", { locale: ptBR }) : 'Nunca')

const NOTA_PERFIL: Partial<Record<UserRole, string>> = {
  admin: 'Acesso total à plataforma da Indústria (não editável).',
  gestor: 'Conjunto fixo de permissões da Indústria (não editável).',
  proprietario_hub: 'Acesso total ao próprio Hub (não editável).',
  assistente: 'Permissões definidas pela Função atribuída.',
}

export function ListaUsuarios({ usuarios, funcoes }: { usuarios: UsuarioLinha[]; funcoes: FuncaoOpcao[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [sel, setSel] = useState<UsuarioLinha | null>(null)
  const [funcaoSel, setFuncaoSel] = useState<string>('')

  useEffect(() => { setFuncaoSel(sel?.funcao_id ?? '') }, [sel])

  const fechar = useCallback(() => setSel(null), [])
  useEffect(() => {
    if (!sel) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [sel, fechar])

  function salvarFuncao() {
    if (!sel) return
    startTransition(async () => {
      try {
        await atribuirFuncao(sel.id, funcaoSel || null)
        toast.success('Função atualizada.')
        router.refresh()
        setSel((s) => (s ? { ...s, funcao_id: funcaoSel || null } : s))
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao atribuir função.')
      }
    })
  }

  function alternarStatus() {
    if (!sel) return
    startTransition(async () => {
      try {
        await alternarStatusUsuario(sel.id, !sel.ativo)
        router.refresh()
        setSel((s) => (s ? { ...s, ativo: !s.ativo } : s))
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao alterar status.')
      }
    })
  }

  const funcoesDoHub = sel?.hub_id ? funcoes.filter((f) => f.hub_id === sel.hub_id) : []

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left">
            <th className="px-4 py-3 font-medium text-slate-600">Nome</th>
            <th className="px-4 py-3 font-medium text-slate-600">E-mail</th>
            <th className="px-4 py-3 font-medium text-slate-600">Telefone</th>
            <th className="px-4 py-3 font-medium text-slate-600">Perfil</th>
            <th className="px-4 py-3 font-medium text-slate-600">Hub</th>
            <th className="px-4 py-3 font-medium text-slate-600">Status</th>
            <th className="px-4 py-3 font-medium text-slate-600">Último acesso</th>
            <th className="px-4 py-3 font-medium text-slate-600">Criado em</th>
            <th className="px-4 py-3 font-medium text-slate-600">Ações</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.length === 0 && (
            <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">Nenhum usuário encontrado.</td></tr>
          )}
          {usuarios.map((u) => (
            <tr key={u.id} onClick={() => setSel(u)} className="cursor-pointer border-b last:border-0 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{u.nome}</td>
              <td className="px-4 py-3 text-slate-600">{u.email}</td>
              <td className="px-4 py-3 text-slate-600">{u.telefone ?? '—'}</td>
              <td className="px-4 py-3"><BadgePerfil perfil={u.cargo} /></td>
              <td className="px-4 py-3 text-slate-600">{u.hub_nome ?? '—'}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {u.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600">{dataHora(u.ultimo_acesso)}</td>
              <td className="px-4 py-3 text-slate-600">{dataCurta(u.criado_em)}</td>
              <td className="px-4 py-3">
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={(e) => { e.stopPropagation(); setSel(u) }}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Drawer de edição */}
      {sel && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/30" onClick={fechar} />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-[500px] flex-col border-l bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">Editar usuário</h2>
              <button type="button" onClick={fechar} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 text-sm">
              {/* Dados pessoais */}
              <section className="border-b py-3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Dados pessoais</h3>
                <div className="space-y-1.5">
                  <div className="flex justify-between gap-4"><span className="text-slate-500">Nome</span><span className="text-slate-800">{sel.nome}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-slate-500">E-mail</span><span className="text-slate-800">{sel.email}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-slate-500">Telefone</span><span className="text-slate-800">{sel.telefone ?? '—'}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-slate-500">Hub</span><span className="text-slate-800">{sel.hub_nome ?? '—'}</span></div>
                </div>
              </section>

              {/* Perfil */}
              <section className="border-b py-3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Perfil</h3>
                <BadgePerfil perfil={sel.cargo} />
                <p className="mt-2 text-xs text-slate-500">{NOTA_PERFIL[sel.cargo] ?? 'Perfil legado (será migrado).'}</p>
              </section>

              {/* Permissões */}
              <section className="border-b py-3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Permissões</h3>
                {sel.cargo === 'assistente' ? (
                  !sel.hub_id ? (
                    <p className="text-xs text-slate-500">Este Assistente não está vinculado a um Hub — atribua um Hub para poder receber uma Função.</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">A Função define as permissões (gerencie em <span className="font-medium">Funções</span>, no Hub).</p>
                      <div className="flex items-center gap-2">
                        <Select value={funcaoSel || '__none__'} onValueChange={(v: string | null) => setFuncaoSel(v === '__none__' ? '' : (v ?? ''))}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Sem função" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Sem função</SelectItem>
                            {funcoesDoHub.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button size="sm" onClick={salvarFuncao} disabled={isPending || funcaoSel === (sel.funcao_id ?? '')}>Salvar</Button>
                      </div>
                      {funcoesDoHub.length === 0 && (
                        <p className="text-xs text-amber-600">Nenhuma Função criada neste Hub ainda.</p>
                      )}
                    </div>
                  )
                ) : (
                  <p className="text-xs text-slate-500">{NOTA_PERFIL[sel.cargo] ?? 'Sem permissões configuráveis.'}</p>
                )}
              </section>

              {/* Status */}
              <section className="py-3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Status</h3>
                <div className="flex items-center justify-between gap-4">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sel.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {sel.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                  <div className="flex items-center gap-2">
                    <ModalAlterarSenha usuarioId={sel.id} nomeUsuario={sel.nome} />
                    <Button variant="outline" size="sm" onClick={alternarStatus} disabled={isPending}>
                      {sel.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                  </div>
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
