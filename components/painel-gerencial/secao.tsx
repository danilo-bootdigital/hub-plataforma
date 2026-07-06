import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Cabeçalho de seção do Painel Gerencial — hierarquia visual clara e muito
 * espaço em branco (inspiração: Stripe / Linear / Vercel). Cada um dos seis
 * blocos abre com este componente.
 */
export function SecaoPainel({
  titulo,
  descricao,
  acao,
  children,
}: {
  titulo: string
  descricao?: string
  acao?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">{titulo}</h2>
          {descricao && <p className="mt-0.5 text-sm text-slate-500">{descricao}</p>}
        </div>
        {acao}
      </div>
      {children}
    </section>
  )
}

/** Selo de status/prioridade sóbrio (paleta contida — sem excesso de cor). */
export function Selo({
  children,
  tom = 'neutro',
  className,
}: {
  children: ReactNode
  tom?: 'neutro' | 'positivo' | 'atencao' | 'critico' | 'info'
  className?: string
}) {
  const tons: Record<string, string> = {
    neutro: 'bg-slate-100 text-slate-600 ring-slate-200',
    positivo: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    atencao: 'bg-amber-50 text-amber-700 ring-amber-200',
    critico: 'bg-red-50 text-red-700 ring-red-200',
    info: 'bg-blue-50 text-blue-700 ring-blue-200',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        tons[tom],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Mapeia HubStatus (ATIVO/INATIVO/SUSPENSO/BLOQUEADO) para o tom do Selo. */
export function tomDoStatusHub(status: string): 'positivo' | 'neutro' | 'atencao' | 'critico' {
  switch ((status ?? '').toUpperCase()) {
    case 'ATIVO':
      return 'positivo'
    case 'SUSPENSO':
      return 'atencao'
    case 'BLOQUEADO':
      return 'critico'
    default:
      return 'neutro'
  }
}
