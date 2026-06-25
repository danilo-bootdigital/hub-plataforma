import { cn } from '@/lib/utils'
import { Check, Circle, X } from 'lucide-react'

const ETAPAS = [
  { key: 'pendente', label: 'Pendente' },
  { key: 'em_producao', label: 'Em Produção' },
  { key: 'pronto', label: 'Pronto' },
  { key: 'enviado', label: 'Enviado' },
  { key: 'entregue', label: 'Entregue' },
  { key: 'concluido', label: 'Concluído' },
]

export function TimelineStatus({ statusAtual }: { statusAtual: string }) {
  if (statusAtual === 'cancelado') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <X className="h-5 w-5 text-red-500" />
        <span className="text-sm font-medium text-red-700">Pedido Cancelado</span>
      </div>
    )
  }

  const indexAtual = ETAPAS.findIndex((e) => e.key === statusAtual)

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {ETAPAS.map((etapa, i) => {
        const concluida = i < indexAtual
        const atual = i === indexAtual
        return (
          <div key={etapa.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                  concluida && 'border-emerald-500 bg-emerald-500 text-white',
                  atual && 'border-blue-500 bg-blue-50 text-blue-600',
                  !concluida && !atual && 'border-slate-200 bg-white text-slate-300'
                )}
              >
                {concluida ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
              </div>
              <span
                className={cn(
                  'text-[11px] whitespace-nowrap',
                  concluida && 'text-emerald-700 font-medium',
                  atual && 'text-blue-700 font-semibold',
                  !concluida && !atual && 'text-slate-400'
                )}
              >
                {etapa.label}
              </span>
            </div>
            {i < ETAPAS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-6 mx-1 mt-[-16px]',
                  i < indexAtual ? 'bg-emerald-500' : 'bg-slate-200'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}