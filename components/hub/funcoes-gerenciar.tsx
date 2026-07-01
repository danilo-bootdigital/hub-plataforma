'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react'
import { salvarFuncao, excluirFuncao, type FuncaoLista } from '@/app/(dashboard)/hub/funcoes/actions'

// Catálogo de módulos × ações (DEC-015). Ações por módulo "quando aplicável".
const MODULOS: { chave: string; label: string; acoes: string[] }[] = [
  { chave: 'dashboard', label: 'Dashboard', acoes: ['visualizar'] },
  { chave: 'clientes', label: 'Clientes', acoes: ['visualizar', 'criar', 'editar', 'excluir'] },
  { chave: 'leads', label: 'Leads', acoes: ['visualizar', 'criar', 'editar', 'excluir'] },
  { chave: 'produtos', label: 'Produtos', acoes: ['visualizar'] },
  { chave: 'carteiras', label: 'Carteiras', acoes: ['visualizar', 'criar', 'editar', 'excluir'] },
  { chave: 'whatsapp', label: 'WhatsApp', acoes: ['visualizar', 'criar'] },
  { chave: 'agenda', label: 'Agenda', acoes: ['visualizar', 'criar', 'editar', 'excluir'] },
  { chave: 'pedidos', label: 'Pedidos', acoes: ['visualizar', 'criar', 'editar', 'excluir'] },
  { chave: 'orcamentos', label: 'Orçamentos', acoes: ['visualizar', 'criar', 'editar', 'excluir'] },
  { chave: 'financeiro', label: 'Financeiro', acoes: ['visualizar', 'criar', 'editar', 'excluir'] },
  { chave: 'equipe', label: 'Equipe', acoes: ['visualizar', 'criar', 'editar', 'excluir'] },
  { chave: 'configuracoes', label: 'Configurações', acoes: ['visualizar', 'editar'] },
  { chave: 'relatorios', label: 'Relatórios', acoes: ['visualizar'] },
  { chave: 'integracoes', label: 'Integrações', acoes: ['visualizar', 'editar'] },
]
const ACAO_LABEL: Record<string, string> = { visualizar: 'Ver', criar: 'Criar', editar: 'Editar', excluir: 'Excluir' }

type EditState = { id: string | null; nome: string; descricao: string; ativo: boolean; sel: Set<string> } | null
const chave = (m: string, a: string) => `${m}:${a}`

export function FuncoesGerenciar({ inicial }: { inicial: FuncaoLista[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [edit, setEdit] = useState<EditState>(null)

  function novo() {
    setEdit({ id: null, nome: '', descricao: '', ativo: true, sel: new Set() })
  }
  function editar(f: FuncaoLista) {
    const sel = new Set<string>()
    for (const [m, acoes] of Object.entries(f.permissoes || {})) for (const a of acoes) sel.add(chave(m, a))
    setEdit({ id: f.id, nome: f.nome, descricao: f.descricao ?? '', ativo: f.ativo, sel })
  }
  function toggle(m: string, a: string) {
    setEdit((e) => {
      if (!e) return e
      const sel = new Set(e.sel); const k = chave(m, a)
      sel.has(k) ? sel.delete(k) : sel.add(k)
      return { ...e, sel }
    })
  }

  function salvar() {
    if (!edit) return
    if (!edit.nome.trim()) { toast.error('Informe o nome da função.'); return }
    const permissoes = Array.from(edit.sel).map((k) => { const [modulo, acao] = k.split(':'); return { modulo, acao } })
    startTransition(async () => {
      try {
        await salvarFuncao({ id: edit.id, nome: edit.nome, descricao: edit.descricao, ativo: edit.ativo, permissoes })
        toast.success('Função salva.')
        setEdit(null); router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao salvar função.')
      }
    })
  }
  function remover(f: FuncaoLista) {
    if (!window.confirm(`Excluir a função "${f.nome}"?`)) return
    startTransition(async () => {
      try { await excluirFuncao(f.id); toast.success('Função excluída.'); router.refresh() }
      catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro ao excluir.') }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={novo}><Plus className="h-4 w-4" /> Nova função</Button>
      </div>

      {inicial.length === 0 ? (
        <div className="rounded-lg border bg-white px-4 py-10 text-center text-slate-400">
          <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          Nenhuma função criada. Comece com “Nova função”.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left">
                <th className="px-4 py-3 font-medium text-slate-600">Função</th>
                <th className="px-4 py-3 font-medium text-slate-600">Módulos</th>
                <th className="px-4 py-3 font-medium text-slate-600">Usuários</th>
                <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 font-medium text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {inicial.map((f) => (
                <tr key={f.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{f.nome}</div>
                    {f.descricao && <div className="text-xs text-slate-500">{f.descricao}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{Object.keys(f.permissoes || {}).length}</td>
                  <td className="px-4 py-3 text-slate-600">{f.usuarios}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${f.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {f.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editar(f)} disabled={isPending}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => remover(f)} disabled={isPending}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={edit !== null} onOpenChange={(o) => { if (!o) setEdit(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{edit?.id ? 'Editar função' : 'Nova função'}</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="f-nome">Nome *</Label>
                  <Input id="f-nome" value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} autoFocus />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="f-desc">Descrição</Label>
                  <Input id="f-desc" value={edit.descricao} onChange={(e) => setEdit({ ...edit, descricao: e.target.value })} />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={edit.ativo} onChange={(e) => setEdit({ ...edit, ativo: e.target.checked })} className="rounded border-slate-300" />
                Função ativa
              </label>

              <div>
                <Label>Permissões</Label>
                <div className="mt-1 max-h-80 overflow-y-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <tbody>
                      {MODULOS.map((m) => (
                        <tr key={m.chave} className="border-b last:border-0">
                          <td className="px-3 py-2 font-medium text-slate-700">{m.label}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-3">
                              {m.acoes.map((a) => (
                                <label key={a} className="flex items-center gap-1.5 text-xs text-slate-600">
                                  <input type="checkbox" checked={edit.sel.has(chave(m.chave, a))} onChange={() => toggle(m.chave, a)} className="rounded border-slate-300" />
                                  {ACAO_LABEL[a]}
                                </label>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEdit(null)} disabled={isPending}>Cancelar</Button>
                <Button type="button" onClick={salvar} disabled={isPending}>{isPending ? 'Salvando...' : 'Salvar função'}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
