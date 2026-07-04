'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, SlidersHorizontal, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BadgeStatus } from './badge-status'
import { listarCadastros } from '@/app/(dashboard)/hub/cadastro-clientes/actions'
import { STATUS_LABEL, type LinhaCadastro } from '@/lib/cadastro-clientes/documentos'
import type { OnboardingStatus } from '@/types/database'

const PAGINA = 25
const TODOS = '__todos__'

function fmt(dt: string | null) {
  if (!dt) return '—'
  try { return new Date(dt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) } catch { return '—' }
}

export function TabelaCadastros({
  modo, inicial, baseHref, hubs = [],
}: {
  modo: 'hub' | 'industria'
  inicial: { total: number; rows: LinhaCadastro[] }
  baseHref: string
  hubs?: { id: string; nome: string }[]
}) {
  const router = useRouter()
  const [rows, setRows] = useState<LinhaCadastro[]>(inicial.rows)
  const [total, setTotal] = useState(inicial.total)
  const [pendente, startTransition] = useTransition()
  const [maisAberto, setMaisAberto] = useState(false)

  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState<string>(TODOS)
  const [cpf, setCpf] = useState(''); const [cnpj, setCnpj] = useState('')
  const [conselho, setConselho] = useState(''); const [email, setEmail] = useState('')
  const [hubId, setHubId] = useState<string>(TODOS)

  function filtros(offset: number) {
    return {
      busca, status: status === TODOS ? null : status,
      cpf, cnpj, conselho, email,
      hubId: hubId === TODOS ? null : hubId,
      limit: PAGINA, offset,
    }
  }

  function aplicar() {
    startTransition(async () => {
      const r = await listarCadastros(filtros(0))
      setRows(r.rows); setTotal(r.total)
    })
  }

  function carregarMais() {
    startTransition(async () => {
      const r = await listarCadastros(filtros(rows.length))
      setRows((prev) => [...prev, ...r.rows]); setTotal(r.total)
    })
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-8" placeholder="Buscar por nome / razão social..." value={busca}
              onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && aplicar()} />
          </div>
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v ?? TODOS)}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os status</SelectItem>
            {(Object.keys(STATUS_LABEL) as OnboardingStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setMaisAberto((v) => !v)}>
          <SlidersHorizontal className="mr-1.5 h-4 w-4" /> Mais filtros
        </Button>
        <Button onClick={aplicar} disabled={pendente}>
          {pendente ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Search className="mr-1.5 h-4 w-4" />} Filtrar
        </Button>
      </div>

      {maisAberto && (
        <div className="grid grid-cols-1 gap-3 rounded-lg border bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input placeholder="CPF" value={cpf} onChange={(e) => setCpf(e.target.value)} />
          <Input placeholder="CNPJ" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
          <Input placeholder="CRM / Conselho" value={conselho} onChange={(e) => setConselho(e.target.value)} />
          <Input placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          {modo === 'industria' && hubs.length > 0 && (
            <Select value={hubId} onValueChange={(v) => setHubId(v ?? TODOS)}>
              <SelectTrigger><SelectValue placeholder="Hub" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos os Hubs</SelectItem>
                {hubs.map((h) => <SelectItem key={h.id} value={h.id}>{h.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">CPF/CNPJ</th>
              <th className="px-4 py-3 font-medium">Conselho</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {modo === 'industria' && <th className="px-4 py-3 font-medium">Hub</th>}
              <th className="px-4 py-3 font-medium">Envio</th>
              <th className="px-4 py-3 font-medium">Atualização</th>
              <th className="px-4 py-3 font-medium">Responsável</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr><td colSpan={modo === 'industria' ? 9 : 8} className="px-4 py-10 text-center text-slate-500">
                Nenhum cadastro encontrado.
              </td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} onClick={() => router.push(`${baseHref}/${r.id}`)}
                className="cursor-pointer transition-colors hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{r.nome || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{r.tipo_pessoa === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}</td>
                <td className="px-4 py-3 text-slate-600">{r.cpf_cnpj || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{r.registro_conselho || '—'}</td>
                <td className="px-4 py-3"><BadgeStatus status={r.status} /></td>
                {modo === 'industria' && <td className="px-4 py-3 text-slate-600">{r.hub_nome || '—'}</td>}
                <td className="px-4 py-3 text-slate-600">{fmt(r.enviado_em)}</td>
                <td className="px-4 py-3 text-slate-600">{fmt(r.updated_at)}</td>
                <td className="px-4 py-3 text-slate-600">{r.responsavel_nome || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{rows.length} de {total} cadastro{total !== 1 ? 's' : ''}</p>
        {rows.length < total && (
          <Button variant="outline" onClick={carregarMais} disabled={pendente}>
            {pendente ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Carregar mais
          </Button>
        )}
      </div>
    </div>
  )
}
