import { Building2, Users, Package, Layers, FileText, ShoppingCart, DollarSign, TrendingUp } from 'lucide-react'
import { formatarMoeda } from '@/lib/utils'
import { formatarNumero } from './formato'
import { SecaoPainel } from './secao'
import { CardIndicador } from './card-indicador'
import type { DadosPainel } from '@/app/(dashboard)/painel/dados'

/**
 * BLOCO 1 — Resumo Executivo.
 * Cards de indicadores estratégicos da rede, cada um com número principal,
 * variação (%) e comparação com o período anterior. Grid responsivo.
 */
export function BlocoResumo({ resumo }: { resumo: DadosPainel['resumo'] }) {
  return (
    <SecaoPainel titulo="Resumo Executivo" descricao="Visão consolidada da rede de Hubs neste mês">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CardIndicador
          label="Hubs ativos"
          valor={formatarNumero(resumo.hubsAtivos.valor)}
          icone={Building2}
          variacao={resumo.hubsAtivos.variacao}
          comparacao={resumo.hubsAtivos.comparacao}
        />
        <CardIndicador
          label="Clientes ativos"
          valor={formatarNumero(resumo.clientesAtivos.valor)}
          icone={Users}
          variacao={resumo.clientesAtivos.variacao}
          comparacao={resumo.clientesAtivos.comparacao}
        />
        <CardIndicador
          label="Produtos ativos"
          valor={formatarNumero(resumo.produtosAtivos.valor)}
          icone={Package}
          variacao={resumo.produtosAtivos.variacao}
          comparacao={resumo.produtosAtivos.comparacao}
        />
        <CardIndicador
          label="Portfólios ativos"
          valor={formatarNumero(resumo.portfoliosAtivos.valor)}
          icone={Layers}
          variacao={resumo.portfoliosAtivos.variacao}
          comparacao={resumo.portfoliosAtivos.comparacao}
        />
        <CardIndicador
          label="Orçamentos do mês"
          valor={formatarNumero(resumo.orcamentosMes.valor)}
          icone={FileText}
          variacao={resumo.orcamentosMes.variacao}
          comparacao={resumo.orcamentosMes.comparacao}
        />
        <CardIndicador
          label="Pedidos do mês"
          valor={formatarNumero(resumo.pedidosMes.valor)}
          icone={ShoppingCart}
          variacao={resumo.pedidosMes.variacao}
          comparacao={resumo.pedidosMes.comparacao}
        />
        <CardIndicador
          label="Receita em análise"
          valor={formatarMoeda(resumo.receitaEmAnalise.valor)}
          icone={DollarSign}
          comparacao={resumo.receitaEmAnalise.comparacao}
        />
        <CardIndicador
          label="Crescimento do mês"
          valor={`${resumo.crescimentoMes.valor > 0 ? '+' : ''}${resumo.crescimentoMes.valor}%`}
          icone={TrendingUp}
          variacao={resumo.crescimentoMes.variacao}
          comparacao={resumo.crescimentoMes.comparacao}
        />
      </div>
    </SecaoPainel>
  )
}
