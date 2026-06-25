import type { QuoteStatus } from '@/types/database'

const CONFIG: Record<QuoteStatus, { label: string; classe: string; descricao?: string }> = {
  rascunho: {
    label: 'Rascunho',
    classe: 'bg-slate-50 text-slate-600 border border-slate-200',
    descricao: 'Orçamento em elaboração'
  },
  aguardando_aprovacao_interna: {
    label: 'Aguardando aprovação',
    classe: 'bg-amber-50 text-amber-700 border border-amber-200',
    descricao: 'Em análise interna'
  },
  aguardando_confirmacao_vendedor: {
    label: 'Aguardando confirmação',
    classe: 'bg-orange-50 text-orange-700 border border-orange-200',
    descricao: 'Cliente aprovou, aguardando vendedor'
  },
  aprovado_internamente: {
    label: 'Aprovado internamente',
    classe: 'bg-blue-50 text-blue-700 border border-blue-200',
    descricao: 'Aprovado pela equipe'
  },
  rejeitado_internamente: {
    label: 'Rejeitado',
    classe: 'bg-red-50 text-red-700 border border-red-200',
    descricao: 'Não aprovado internamente'
  },
  enviado_ao_cliente: {
    label: 'Enviado',
    classe: 'bg-purple-50 text-purple-700 border border-purple-200',
    descricao: 'Aguardando aprovação do cliente'
  },
  aprovado_pelo_cliente: {
    label: 'Aprovado',
    classe: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    descricao: 'Cliente aprovou o orçamento'
  },
  recusado_pelo_cliente: {
    label: 'Recusado',
    classe: 'bg-red-50 text-red-700 border border-red-200',
    descricao: 'Cliente não aceitou o orçamento'
  },
}

export function BadgeStatusOrcamento({ status }: { status: QuoteStatus }) {
  const config = CONFIG[status] ?? { label: status, classe: 'bg-slate-50 text-slate-600 border border-slate-200', descricao: status }
  return (
    <div className="flex flex-col">
      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${config.classe}`}>
        {config.label}
      </span>
    </div>
  )
}
