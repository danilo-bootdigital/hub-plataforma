import type { LucideIcon } from 'lucide-react'
import { Building2, Layers, UserPlus, ShoppingCart, ClipboardCheck, FileText, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { SecaoPainel } from './secao'
import { formatarDataRelativa } from './formato'
import type { EventoAtividade } from '@/app/(dashboard)/painel/dados'

/**
 * BLOCO 6 — Atividade recente.
 * Timeline cronológica dos últimos eventos relevantes da rede (Hubs, portfólios,
 * clientes, orçamentos, pedidos, receitas). Fonte: dados.ts (gerarAtividades).
 */
const ICONE: Record<EventoAtividade['tipo'], LucideIcon> = {
  hub: Building2,
  portfolio: Layers,
  assistente: UserPlus,
  pedido: ShoppingCart,
  receita: ClipboardCheck,
  cliente: Users,
  orcamento: FileText,
}

export function BlocoAtividade({ atividades }: { atividades: EventoAtividade[] }) {
  return (
    <SecaoPainel titulo="Atividade recente" descricao="Últimos eventos importantes na rede">
      <Card>
        <CardContent className="p-5">
          {atividades.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Nenhuma atividade recente.</p>
          ) : (
            <ol className="relative space-y-5 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-slate-100">
              {atividades.map((ev) => {
                const Icone = ICONE[ev.tipo]
                return (
                  <li key={ev.id} className="relative flex items-start gap-3">
                    <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 ring-1 ring-slate-200">
                      <Icone className="h-4 w-4 text-slate-500" />
                    </span>
                    <div className="min-w-0 flex-1 pt-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">{ev.titulo}</p>
                        <span className="shrink-0 text-xs text-slate-400">{formatarDataRelativa(ev.quando)}</span>
                      </div>
                      <p className="truncate text-sm text-slate-500">{ev.descricao}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </SecaoPainel>
  )
}
