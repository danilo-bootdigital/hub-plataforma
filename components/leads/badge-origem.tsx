import type { LeadOrigem } from '@/types/database'

const config: Record<LeadOrigem, { label: string; classe: string }> = {
  whatsapp:           { label: 'WhatsApp',      classe: 'bg-green-100 text-green-700' },
  instagram_lead_ad:  { label: 'Instagram',     classe: 'bg-purple-100 text-purple-700' },
  facebook_lead_ad:   { label: 'Facebook',      classe: 'bg-blue-100 text-blue-700' },
  site:               { label: 'Site',           classe: 'bg-cyan-100 text-cyan-700' },
  indicacao:          { label: 'Indicação',     classe: 'bg-yellow-100 text-yellow-700' },
  evento:             { label: 'Evento',         classe: 'bg-orange-100 text-orange-700' },
  manual:             { label: 'Manual',         classe: 'bg-slate-100 text-slate-700' },
}

export function BadgeOrigem({ origem }: { origem: LeadOrigem }) {
  const { label, classe } = config[origem]
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classe}`}>
      {label}
    </span>
  )
}
