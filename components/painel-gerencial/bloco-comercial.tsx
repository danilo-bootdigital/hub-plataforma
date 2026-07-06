import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatarMoeda } from '@/lib/utils'
import { formatarNumero } from './formato'
import { SecaoPainel } from './secao'
import { GraficoRanking } from './grafico-ranking'
import type { DadosPainel } from '@/app/(dashboard)/painel/dados'

/**
 * BLOCO 3 — Performance Comercial.
 * Rankings de produtos/categorias/portfólios, ticket médio e a conversão
 * Orçamento → Pedido. Todos os dados vêm de order_items/products (reais).
 */
export function BlocoComercial({ comercial }: { comercial: DadosPainel['comercial'] }) {
  const { conversao } = comercial

  return (
    <SecaoPainel titulo="Performance Comercial" descricao="O que a rede mais vende e como converte">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Produtos mais vendidos</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <GraficoRanking dados={comercial.produtosMaisVendidos} formato="numero" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Categorias mais vendidas</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <GraficoRanking dados={comercial.categoriasMaisVendidas} formato="numero" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Portfólios por faturamento</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <GraficoRanking dados={comercial.portfoliosFaturamento} formato="moeda" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Ticket médio */}
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ticket médio</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
              {formatarMoeda(comercial.ticketMedio)}
            </p>
            <p className="mt-1 text-xs text-slate-400">por pedido não cancelado</p>
          </CardContent>
        </Card>

        {/* Conversão Orçamento → Pedido (funil compacto, sem excesso de cor) */}
        <Card className="md:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Conversão Orçamento → Pedido</p>
              <span className="text-sm font-semibold text-emerald-600">
                {conversao.taxa.toFixed(1)}%
              </span>
            </div>
            <div className="mt-4 space-y-2.5">
              <EtapaFunil rotulo="Orçamentos" valor={conversao.orcamentos} proporcao={1} tom="bg-blue-500" />
              <EtapaFunil
                rotulo="Pedidos"
                valor={conversao.pedidos}
                proporcao={conversao.orcamentos ? conversao.pedidos / conversao.orcamentos : 0}
                tom="bg-emerald-500"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </SecaoPainel>
  )
}

function EtapaFunil({
  rotulo,
  valor,
  proporcao,
  tom,
}: {
  rotulo: string
  valor: number
  proporcao: number
  tom: string
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-600">{rotulo}</span>
        <span className="font-medium tabular-nums text-slate-900">{formatarNumero(valor)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tom}`} style={{ width: `${Math.max(proporcao * 100, 2)}%` }} />
      </div>
    </div>
  )
}
