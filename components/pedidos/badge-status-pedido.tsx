import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  em_producao: { label: 'Em Produção', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  pronto: { label: 'Pronto', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  enviado: { label: 'Enviado', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  entregue: { label: 'Entregue', className: 'bg-teal-50 text-teal-700 border-teal-200' },
  concluido: { label: 'Concluído', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelado: { label: 'Cancelado', className: 'bg-red-50 text-red-700 border-red-200' },
}

export function BadgeStatusPedido({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-slate-50 text-slate-700 border-slate-200' }
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', config.className)}>
      {config.label}
    </span>
  )
}