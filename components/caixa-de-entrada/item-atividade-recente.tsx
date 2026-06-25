import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Activity } from 'lucide-react'

type Props = {
  id: string
  tipo: string
  descricao: string
  criadoEm: string
  leadId: string | null
  leadNome: string | null
}

const ICONES_COR: Record<string, string> = {
  lead_criado: 'bg-blue-50 text-blue-600',
  deal_ganho: 'bg-emerald-50 text-emerald-600',
  deal_perdido: 'bg-red-50 text-red-600',
  responsavel_atribuido_automaticamente: 'bg-purple-50 text-purple-600',
}

export function ItemAtividadeRecente({ id, tipo, descricao, criadoEm, leadId, leadNome }: Props) {
  const cor = ICONES_COR[tipo] ?? 'bg-slate-100 text-slate-600'
  const href = leadId ? `/leads/${leadId}` : '/painel'

  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-4 transition-all duration-200 hover:shadow-md hover:border-slate-300/80"
    >
      {/* Icon */}
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${cor}`}>
        <Activity className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-800 truncate">{descricao}</p>
          <span className="shrink-0 text-xs text-slate-400">
            {formatDistanceToNow(new Date(criadoEm), { addSuffix: true, locale: ptBR })}
          </span>
        </div>
        {leadNome && (
          <p className="mt-1 text-xs text-slate-400">{leadNome}</p>
        )}
      </div>
    </Link>
  )
}
