import { cn } from '@/lib/utils'

// Barra de progresso do cadastro (percentual concluído).
export function BarraProgresso({ percentual, className }: { percentual: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(percentual)))
  const completo = pct >= 100
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">Progresso do cadastro</span>
        <span className={cn('font-semibold', completo ? 'text-emerald-600' : 'text-slate-700')}>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn('h-full rounded-full transition-all', completo ? 'bg-emerald-500' : 'bg-blue-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
