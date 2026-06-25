import { Card, CardContent } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown } from 'lucide-react'

type Props = {
  label: string
  valor: string | number
  icone: LucideIcon
  descricao?: string
  variacao?: number // percentage change, positive = up, negative = down
}

export function CardKPI({ label, valor, icone: Icone, descricao, variacao }: Props) {
  const isPositive = variacao !== undefined && variacao > 0
  const isNegative = variacao !== undefined && variacao < 0

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Icon Container */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50">
            <Icone className="h-5 w-5 text-emerald-600" />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              {label}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-bold text-slate-900 truncate">
                {valor}
              </p>
              {variacao !== undefined && (
                <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                  isPositive ? 'text-emerald-600' : isNegative ? 'text-red-600' : 'text-slate-500'
                }`}>
                  {isPositive ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : isNegative ? (
                    <TrendingDown className="h-3.5 w-3.5" />
                  ) : null}
                  {variacao > 0 ? '+' : ''}{variacao}%
                </span>
              )}
            </div>
            {descricao && (
              <p className="text-xs text-slate-400 mt-1">{descricao}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
