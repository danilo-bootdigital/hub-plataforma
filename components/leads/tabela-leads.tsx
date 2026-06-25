'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useRef } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { differenceInDays } from 'date-fns'
import { BadgeOrigem } from './badge-origem'
import { BadgeStatusLead } from './badge-status-lead'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Lead, LeadOrigem, LeadStatus, Profile } from '@/types/database'

type LeadComResponsavel = Lead & { responsavel: Pick<Profile, 'id' | 'nome'> | null }

type Props = {
  leads: LeadComResponsavel[]
  responsaveis: Pick<Profile, 'id' | 'nome'>[]
}

const STATUS_OPTIONS: { valor: LeadStatus | '__all__'; label: string }[] = [
  { valor: '__all__', label: 'Todos os status' },
  { valor: 'novo', label: 'Novo' },
  { valor: 'em_atendimento', label: 'Em atendimento' },
  { valor: 'qualificado', label: 'Qualificado' },
  { valor: 'descartado', label: 'Descartado' },
]

const ORIGEM_OPTIONS: { valor: LeadOrigem | '__all__'; label: string }[] = [
  { valor: '__all__', label: 'Todas as origens' },
  { valor: 'whatsapp', label: 'WhatsApp' },
  { valor: 'instagram_lead_ad', label: 'Instagram' },
  { valor: 'facebook_lead_ad', label: 'Facebook' },
  { valor: 'site', label: 'Site' },
  { valor: 'indicacao', label: 'Indicação' },
  { valor: 'evento', label: 'Evento' },
  { valor: 'manual', label: 'Manual' },
]

export function TabelaLeads({ leads, responsaveis }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const atualizarFiltro = useCallback((chave: string, valor: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (valor) {
      params.set(chave, valor)
    } else {
      params.delete(chave)
    }
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const atualizarBusca = useCallback((valor: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => atualizarFiltro('busca', valor), 400)
  }, [atualizarFiltro])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por nome, telefone ou e-mail..."
          defaultValue={searchParams.get('busca') ?? ''}
          onChange={(e) => atualizarBusca(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={searchParams.get('status') ?? '__all__'}
          onValueChange={(v: string | null) => atualizarFiltro('status', !v || v === '__all__' ? '' : v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.valor} value={o.valor}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={searchParams.get('origem') ?? '__all__'}
          onValueChange={(v: string | null) => atualizarFiltro('origem', !v || v === '__all__' ? '' : v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todas as origens" />
          </SelectTrigger>
          <SelectContent>
            {ORIGEM_OPTIONS.map((o) => (
              <SelectItem key={o.valor} value={o.valor}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={searchParams.get('responsavel') ?? '__all__'}
          onValueChange={(v: string | null) => atualizarFiltro('responsavel', !v || v === '__all__' ? '' : v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos os responsáveis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os responsáveis</SelectItem>
            {responsaveis.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left">
              <th className="px-4 py-3 font-medium text-slate-600">Nome</th>
              <th className="px-4 py-3 font-medium text-slate-600">Telefone</th>
              <th className="px-4 py-3 font-medium text-slate-600">Origem</th>
              <th className="px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 font-medium text-slate-600">Responsável</th>
              <th className="px-4 py-3 font-medium text-slate-600">Última interação</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Nenhum lead encontrado.
                </td>
              </tr>
            )}
            {leads.map((lead) => {
              const diasSemInteracao = lead.ultima_interacao_em
                ? differenceInDays(new Date(), new Date(lead.ultima_interacao_em))
                : differenceInDays(new Date(), new Date(lead.criado_em))
              const semInteracao = diasSemInteracao > 7 && lead.status !== 'descartado' && lead.status !== 'qualificado'
              return (
                <tr
                  key={lead.id}
                  className={`border-b last:border-0 hover:bg-slate-50 cursor-pointer ${semInteracao ? 'bg-amber-50' : ''}`}
                  onClick={() => router.push(`/leads/${lead.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      {semInteracao && (
                        <span title="Sem interação há mais de 7 dias" className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                      )}
                      {lead.nome ?? <span className="text-slate-400 italic">Sem nome</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{lead.telefone ?? '—'}</td>
                  <td className="px-4 py-3"><BadgeOrigem origem={lead.origem} /></td>
                  <td className="px-4 py-3"><BadgeStatusLead status={lead.status} /></td>
                  <td className="px-4 py-3 text-slate-600">{lead.responsavel?.nome ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {lead.ultima_interacao_em
                      ? format(new Date(lead.ultima_interacao_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                      : format(new Date(lead.criado_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {leads.length > 0 && (
        <p className="text-xs text-slate-400">{leads.length} lead{leads.length !== 1 ? 's' : ''} encontrado{leads.length !== 1 ? 's' : ''}.</p>
      )}
    </div>
  )
}
