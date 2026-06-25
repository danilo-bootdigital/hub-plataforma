import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckSquare, AlertTriangle } from 'lucide-react'

type Props = {
  id: string
  titulo: string
  dataVencimento: string | null
  responsavelNome: string | null
  leadNome: string | null
  leadId: string | null
}

export function ItemTarefaPendente({ id, titulo, dataVencimento, responsavelNome, leadNome, leadId }: Props) {
  const vencida = dataVencimento ? new Date(dataVencimento) < new Date() : false

  return (
    <Link
      href={leadId ? `/leads/${leadId}` : '/tarefas'}
      className="group flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-4 transition-all duration-200 hover:shadow-md hover:border-slate-300/80"
    >
      {/* Icon */}
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${vencida ? 'bg-red-50' : 'bg-amber-50'}`}>
        {vencida ? (
          <AlertTriangle className="h-4 w-4 text-red-600" />
        ) : (
          <CheckSquare className="h-4 w-4 text-amber-600" />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-800 truncate">{titulo}</p>
          {dataVencimento && (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              vencida ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {vencida ? '⚠ Venceu' : formatDistanceToNow(new Date(dataVencimento), { addSuffix: true, locale: ptBR })}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-400">
          {[responsavelNome, leadNome].filter(Boolean).join(' · ') || 'Sem vínculo'}
        </p>
      </div>
    </Link>
  )
}
