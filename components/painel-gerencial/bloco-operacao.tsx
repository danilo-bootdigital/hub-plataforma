import { Factory, Cog, Truck, ClipboardCheck, CheckCircle2, XCircle } from 'lucide-react'
import { formatarNumero } from './formato'
import { SecaoPainel } from './secao'
import { CardIndicador } from './card-indicador'
import type { DadosPainel } from '@/app/(dashboard)/painel/dados'

/**
 * BLOCO 4 — Operação.
 * Indicadores operacionais consolidados da rede COM tendência mensal. A
 * Indústria apenas ACOMPANHA (leitura); nenhuma ação de operação é oferecida.
 */
export function BlocoOperacao({ operacao }: { operacao: DadosPainel['operacao'] }) {
  return (
    <SecaoPainel titulo="Operação" descricao="Situação consolidada de pedidos e receitas na rede">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CardIndicador
          label="Aguardando produção"
          valor={formatarNumero(operacao.pedidosAguardandoProducao.valor)}
          icone={Factory}
          variacao={operacao.pedidosAguardandoProducao.variacao}
          comparacao={operacao.pedidosAguardandoProducao.comparacao}
        />
        <CardIndicador
          label="Em produção"
          valor={formatarNumero(operacao.pedidosEmProducao.valor)}
          icone={Cog}
          variacao={operacao.pedidosEmProducao.variacao}
          comparacao={operacao.pedidosEmProducao.comparacao}
        />
        <CardIndicador
          label="Pedidos enviados"
          valor={formatarNumero(operacao.pedidosEnviados.valor)}
          icone={Truck}
          variacao={operacao.pedidosEnviados.variacao}
          comparacao={operacao.pedidosEnviados.comparacao}
        />
        <CardIndicador
          label="Receitas aguardando"
          valor={formatarNumero(operacao.receitasAguardando.valor)}
          icone={ClipboardCheck}
          variacao={operacao.receitasAguardando.variacao}
          comparacao={operacao.receitasAguardando.comparacao}
        />
        <CardIndicador
          label="Receitas aprovadas"
          valor={formatarNumero(operacao.receitasAprovadas.valor)}
          icone={CheckCircle2}
          variacao={operacao.receitasAprovadas.variacao}
          comparacao={operacao.receitasAprovadas.comparacao}
        />
        <CardIndicador
          label="Receitas reprovadas"
          valor={formatarNumero(operacao.receitasReprovadas.valor)}
          icone={XCircle}
          variacao={operacao.receitasReprovadas.variacao}
          comparacao={operacao.receitasReprovadas.comparacao}
          inverterTendencia
        />
      </div>
    </SecaoPainel>
  )
}
