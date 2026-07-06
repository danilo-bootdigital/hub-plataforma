import { AlertTriangle, AlertCircle, Info, ShieldCheck } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { SecaoPainel, Selo } from './secao'
import type { Alerta } from '@/app/(dashboard)/painel/dados'

/**
 * BLOCO 5 — Alertas.
 * Painel de atenção priorizado (alta / média / baixa). Cada alerta é derivado
 * de dados reais da rede em app/(dashboard)/painel/dados.ts (gerarAlertas).
 */
const CONFIG = {
  alta: { tom: 'critico' as const, rotulo: 'Alta', Icone: AlertTriangle, cor: 'text-red-500' },
  media: { tom: 'atencao' as const, rotulo: 'Média', Icone: AlertCircle, cor: 'text-amber-500' },
  baixa: { tom: 'neutro' as const, rotulo: 'Baixa', Icone: Info, cor: 'text-slate-400' },
}

export function BlocoAlertas({ alertas }: { alertas: Alerta[] }) {
  return (
    <SecaoPainel titulo="Alertas" descricao="Pontos que exigem atenção da Indústria">
      {alertas.length === 0 ? (
        <Card>
          <div className="flex items-center gap-3 p-6 text-sm text-slate-500">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            Nenhum alerta no momento. A rede está saudável.
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {alertas.map((a) => {
            const cfg = CONFIG[a.prioridade]
            const Icone = cfg.Icone
            return (
              <Card key={a.id} className="gap-0 py-0">
                <div className="flex items-start gap-3 p-4">
                  <Icone className={`mt-0.5 h-5 w-5 shrink-0 ${cfg.cor}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-slate-900">{a.titulo}</p>
                      <Selo tom={cfg.tom}>{cfg.rotulo}</Selo>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{a.descricao}</p>
                    <p className="mt-1.5 text-xs uppercase tracking-wide text-slate-400">{a.categoria}</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </SecaoPainel>
  )
}
