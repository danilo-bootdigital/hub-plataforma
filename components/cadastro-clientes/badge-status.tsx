import { cn } from '@/lib/utils'
import { STATUS_LABEL, STATUS_TOM } from '@/lib/cadastro-clientes/documentos'
import type { OnboardingStatus } from '@/types/database'

export function BadgeStatus({ status, className }: { status: OnboardingStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        STATUS_TOM[status],
        className
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
