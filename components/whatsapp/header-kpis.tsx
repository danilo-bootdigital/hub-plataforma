'use client'

// ============================================================
// HeaderKPIs: 5 cards clicaveis no topo da Central
// Sub-fase 2.2.1
// ============================================================
// Renderiza SOMENTE os 5 KPIs. Sem fetch proprio.
// Recebe kpis via props do page.tsx.
// Cada card, ao clicado, chama onSelect(status).
// ============================================================

import {
  MessageSquare,
  AlertCircle,
  Phone,
  Clock,
  CheckCircle,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { KPIWhatsApp, ConversaStatus } from '@/types/database'

type KpiConfig = {
  key: keyof KPIWhatsApp
  label: string
  icon: LucideIcon
  status: ConversaStatus | null
  cor: string
}

const KPI_CONFIG: KpiConfig[] = [
  { key: 'abertas', label: 'Abertas', icon: MessageSquare, status: null, cor: 'text-slate-700' },
  { key: 'naoLidas', label: 'Não lidas', icon: AlertCircle, status: null, cor: 'text-red-600' },
  { key: 'emAtendimento', label: 'Em atendimento', icon: Phone, status: 'em_atendimento', cor: 'text-blue-600' },
  { key: 'aguardandoCliente', label: 'Aguardando cliente', icon: Clock, status: 'aguardando_cliente', cor: 'text-amber-600' },
  { key: 'finalizadasHoje', label: 'Finalizadas hoje', icon: CheckCircle, status: 'finalizada', cor: 'text-green-600' },
]

type Props = {
  kpis: KPIWhatsApp
  kpiAtivo: ConversaStatus | null
  onSelect: (status: ConversaStatus | null) => void
}

export function HeaderKPIs({ kpis, kpiAtivo, onSelect }: Props) {
  return (
    <div className="grid grid-cols-5 gap-2 p-3 border-b bg-muted/20">
      {KPI_CONFIG.map(({ key, label, icon: Icon, status, cor }) => {
        const valor = kpis[key]
        const ativo = kpiAtivo === status && status !== null
        return (
          <button
            key={key}
            onClick={() => onSelect(ativo ? null : status)}
            className={cn(
              'flex items-center gap-2 p-3 rounded-lg border transition-all text-left',
              'bg-white hover:shadow-sm',
              ativo && 'ring-2 ring-primary border-primary',
            )}
          >
            <Icon className={cn('h-5 w-5 shrink-0', cor)} />
            <div className="min-w-0">
              <p className="text-xl font-bold leading-none">{valor}</p>
              <p className="text-[11px] text-muted-foreground truncate">{label}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
