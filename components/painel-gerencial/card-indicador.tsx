import type { LucideIcon } from 'lucide-react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatarPercentual } from './formato'

/**
 * Card de indicador executivo. Reusa o `Card` base (mesmo raio/borda/sombra das
 * telas de Orçamentos/Produtos/Clientes) com estética contida: número em
 * destaque, selo de variação discreto e rótulo de comparação. Serve ao Resumo
 * Executivo (Bloco 1) e à Operação (Bloco 4).
 */
export function CardIndicador({
  label,
  valor,
  icone: Icone,
  variacao,
  comparacao,
  /** Inverte a leitura de cor: para métricas onde "subir" é ruim (ex.: reprovadas). */
  inverterTendencia = false,
}: {
  label: string
  valor: string | number
  icone?: LucideIcon
  variacao?: number
  comparacao?: string
  inverterTendencia?: boolean
}) {
  const temVariacao = variacao !== undefined && Number.isFinite(variacao)
  const subiu = temVariacao && (variacao as number) > 0
  const desceu = temVariacao && (variacao as number) < 0
  const bom = inverterTendencia ? desceu : subiu
  const ruim = inverterTendencia ? subiu : desceu

  return (
    <Card className="gap-0 py-0">
      <div className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          {Icone && <Icone className="h-4 w-4 text-slate-400" />}
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight text-slate-900">{valor}</span>
          {temVariacao && (variacao as number) !== 0 && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-xs font-medium',
                bom ? 'text-emerald-600' : ruim ? 'text-red-600' : 'text-slate-500',
              )}
            >
              {subiu ? <ArrowUpRight className="h-3.5 w-3.5" /> : desceu ? <ArrowDownRight className="h-3.5 w-3.5" /> : null}
              {formatarPercentual(variacao)}
            </span>
          )}
        </div>

        {comparacao && <p className="mt-1 text-xs text-slate-400">{comparacao}</p>}
      </div>
    </Card>
  )
}
