import type { LeadStatus } from '@/types/database'

const config: Record<LeadStatus, { label: string; classe: string }> = {
  novo:           { label: 'Novo',           classe: 'bg-blue-100 text-blue-700' },
  em_atendimento: { label: 'Em atendimento', classe: 'bg-yellow-100 text-yellow-700' },
  qualificado:    { label: 'Qualificado',    classe: 'bg-green-100 text-green-700' },
  descartado:     { label: 'Descartado',     classe: 'bg-red-100 text-red-700' },
}

export function BadgeStatusLead({ status }: { status: LeadStatus }) {
  const { label, classe } = config[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classe}`}>
      {label}
    </span>
  )
}
