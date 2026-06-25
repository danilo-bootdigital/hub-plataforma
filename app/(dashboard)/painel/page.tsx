import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatarMoeda } from '@/lib/utils'
import { Users, TrendingUp, Trophy, DollarSign, CheckSquare, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CardKPI } from '@/components/painel/card-kpi'
import { GraficoLeadsPorOrigem } from '@/components/painel/grafico-leads-por-origem'
import { GraficoDealsPorEtapa } from '@/components/painel/grafico-deals-por-etapa'
import { GraficoVendasMensal } from '@/components/painel/grafico-vendas-mensal'
import { TabelaDesempenho } from '@/components/painel/tabela-desempenho'

function inicioMes() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}

function seisMesesAtras() {
  const d = new Date()
  d.setMonth(d.getMonth() - 6)
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}

const MESES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export default async function PainelPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const orgId = perfil.organization_id
  const inicio = inicioMes()
  const seisMeses = seisMesesAtras()
  const isVendedor = perfil.cargo === 'vendedor'
  const isAtendimento = perfil.cargo === 'atendimento'

  // KPIs - Queries paralelas
  let queryLeadsMes = supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .gte('criado_em', inicio)
  if (isVendedor) queryLeadsMes = queryLeadsMes.eq('responsavel_id', perfil.id)

  let queryLeadsQualificados = supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('status', 'qualificado')
    .gte('criado_em', inicio)
  if (isVendedor) queryLeadsQualificados = queryLeadsQualificados.eq('responsavel_id', perfil.id)

  let queryDealsGanhos = supabase
    .from('deals')
    .select('valor_estimado')
    .eq('organization_id', orgId)
    .eq('ganho', true)
    .gte('atualizado_em', inicio)
  if (isVendedor) queryDealsGanhos = queryDealsGanhos.eq('responsavel_id', perfil.id)

  let queryPedidosMes = supabase
    .from('orders')
    .select('id, criado_em, valor_total, frete')
    .eq('organization_id', orgId)
    .neq('status', 'cancelado')
  if (isVendedor) queryPedidosMes = queryPedidosMes.eq('responsavel_id', perfil.id)

  const queryTarefasPendentes = supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('concluida', false)
    .eq('responsavel_id', perfil.id)

  const queryTarefasAtrasadas = supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('concluida', false)
    .eq('responsavel_id', perfil.id)
    .lt('data_vencimento', new Date().toISOString())

  let queryOrigem = supabase
    .from('leads')
    .select('origem')
    .eq('organization_id', orgId)
    .gte('criado_em', inicio)
  if (isVendedor) queryOrigem = queryOrigem.eq('responsavel_id', perfil.id)

  const [
    { count: leadsNovos },
    { count: leadsQualificados },
    { data: dealsGanhos },
    { count: tarefasPendentes },
    { count: tarefasAtrasadas },
    { data: leadsOrigem },
    { data: pedidosMes },
  ] = await Promise.all([
    queryLeadsMes,
    queryLeadsQualificados,
    queryDealsGanhos,
    queryTarefasPendentes,
    queryTarefasAtrasadas,
    queryOrigem,
    queryPedidosMes,
  ])

  const taxaConversao = (leadsNovos ?? 0) > 0
    ? Math.round(((leadsQualificados ?? 0) / (leadsNovos ?? 1)) * 100)
    : 0

  const totalPedidosMes = (pedidosMes ?? []).filter((p) => p.criado_em >= inicio).length

  // Total de Vendas = soma de (valor_total - frete) de todos os pedidos
  const receitaMes = (pedidosMes ?? []).reduce((acc, p) => acc + (Number(p.valor_total ?? 0) - Number(p.frete ?? 0)), 0)

  const origemMap = new Map<string, number>()
  leadsOrigem?.forEach((l) => {
    origemMap.set(l.origem, (origemMap.get(l.origem) ?? 0) + 1)
  })
  const dadosOrigem = Array.from(origemMap.entries()).map(([origem, total]) => ({ origem, total }))

  // Grafico - Deals por etapa (apenas se nao for atendimento)
  let dadosEtapas: { nome: string; cor: string; total: number }[] = []
  if (!isAtendimento) {
    const { data: pipeline } = await supabase
      .from('pipelines')
      .select('id')
      .eq('organization_id', orgId)
      .eq('padrao', true)
      .single()

    if (pipeline) {
      const { data: etapas } = await supabase
        .from('pipeline_stages')
        .select('id, nome, cor, ordem')
        .eq('pipeline_id', pipeline.id)
        .eq('oculto', false)
        .order('ordem')

      if (etapas) {
        let queryDealsAtivos = supabase
          .from('deals')
          .select('estagio_id')
          .eq('organization_id', orgId)
          .eq('pipeline_id', pipeline.id)
          .is('ganho', null)
        if (isVendedor) queryDealsAtivos = queryDealsAtivos.eq('responsavel_id', perfil.id)

        const { data: dealsAtivos } = await queryDealsAtivos

        const contagemPorEtapa = new Map<string, number>()
        dealsAtivos?.forEach((d) => {
          contagemPorEtapa.set(d.estagio_id, (contagemPorEtapa.get(d.estagio_id) ?? 0) + 1)
        })

        dadosEtapas = etapas.map((e) => ({
          nome: e.nome,
          cor: e.cor,
          total: contagemPorEtapa.get(e.id) ?? 0,
        }))
      }
    }
  }

  // Grafico - Vendas mensais (6 meses) baseado em pedidos
  const dadosMensais: { mes: string; valor: number }[] = []
  if (!isAtendimento) {
    let queryPedidosMensais = supabase
      .from('orders')
      .select('id, criado_em')
      .eq('organization_id', orgId)
      .neq('status', 'cancelado')
      .gte('criado_em', seisMeses)
    if (isVendedor) queryPedidosMensais = queryPedidosMensais.eq('responsavel_id', perfil.id)

    const { data: pedidosMensais } = await queryPedidosMensais

    // Buscar subtotais dos itens desses pedidos
    const pedidosMensaisIds = (pedidosMensais ?? []).map((p) => p.id)
    const itensMensaisMap = new Map<string, number>()
    if (pedidosMensaisIds.length > 0) {
      const { data: itensMensais } = await supabase
        .from('order_items')
        .select('order_id, subtotal')
        .in('order_id', pedidosMensaisIds)

      const subtotalPorPedido = new Map<string, number>()
      itensMensais?.forEach((item) => {
        subtotalPorPedido.set(item.order_id, (subtotalPorPedido.get(item.order_id) ?? 0) + Number(item.subtotal ?? 0))
      })

      // Agrupar por mês
      pedidosMensais?.forEach((p) => {
        const date = new Date(p.criado_em)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        itensMensaisMap.set(key, (itensMensaisMap.get(key) ?? 0) + (subtotalPorPedido.get(p.id) ?? 0))
      })
    }

    const agora = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      dadosMensais.push({ mes: MESES_PT[d.getMonth()], valor: itensMensaisMap.get(key) ?? 0 })
    }
  }

  // Tabela - Desempenho por vendedor (apenas admin/gestor)
  let dadosDesempenho: { nome: string; deals_ganhos: number; valor_total: number }[] = []
  if (!isVendedor && !isAtendimento) {
    const { data: vendedores } = await supabase
      .from('profiles')
      .select('id, nome')
      .eq('organization_id', orgId)
      .eq('ativo', true)
      .in('cargo', ['vendedor', 'gestor'])

    if (vendedores && vendedores.length > 0) {
      const { data: pedidosVendedores } = await supabase
        .from('orders')
        .select('id, responsavel_id')
        .eq('organization_id', orgId)
        .neq('status', 'cancelado')
        .eq('ganho', true)
        .gte('criado_em', inicio)

      const pedidosVendedoresIds = (pedidosVendedores ?? []).map((p) => p.id)
      const subtotalPorPedido = new Map<string, number>()
      if (pedidosVendedoresIds.length > 0) {
        const { data: itensVend } = await supabase
          .from('order_items')
          .select('order_id, subtotal')
          .in('order_id', pedidosVendedoresIds)
        itensVend?.forEach((item) => {
          subtotalPorPedido.set(item.order_id, (subtotalPorPedido.get(item.order_id) ?? 0) + Number(item.subtotal ?? 0))
        })
      }

      const mapVendedor = new Map<string, { ganhos: number; valor: number }>()
      pedidosVendedores?.forEach((p) => {
        if (!p.responsavel_id) return
        const atual = mapVendedor.get(p.responsavel_id) ?? { ganhos: 0, valor: 0 }
        atual.ganhos++
        atual.valor += subtotalPorPedido.get(p.id) ?? 0
        mapVendedor.set(p.responsavel_id, atual)
      })

      dadosDesempenho = vendedores
        .map((v) => ({
          nome: v.nome,
          deals_ganhos: mapVendedor.get(v.id)?.ganhos ?? 0,
          valor_total: mapVendedor.get(v.id)?.valor ?? 0,
        }))
        .sort((a, b) => b.valor_total - a.valor_total)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Painel Principal</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <CardKPI label="Leads novos" valor={leadsNovos ?? 0} icone={Users} descricao="Este mês" />
        <CardKPI label="Conversão" valor={`${taxaConversao}%`} icone={TrendingUp} descricao="Qualificados / total" />
        <CardKPI label="Pedidos" valor={totalPedidosMes} icone={Trophy} descricao="Este mês" />
        <CardKPI label="Total de Vendas" valor={formatarMoeda(receitaMes)} icone={DollarSign} descricao="Acumulado" />
        <CardKPI label="Tarefas pendentes" valor={tarefasPendentes ?? 0} icone={CheckSquare} descricao="Suas tarefas" />
        <CardKPI label="Atrasadas" valor={tarefasAtrasadas ?? 0} icone={AlertTriangle} descricao="Vencidas" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Leads por origem</CardTitle>
          </CardHeader>
          <CardContent>
            <GraficoLeadsPorOrigem dados={dadosOrigem} />
          </CardContent>
        </Card>

        {!isAtendimento && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Negociações por etapa</CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoDealsPorEtapa dados={dadosEtapas} />
            </CardContent>
          </Card>
        )}

        {!isAtendimento && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Vendas mensais</CardTitle>
            </CardHeader>
            <CardContent>
              <GraficoVendasMensal dados={dadosMensais} />
            </CardContent>
          </Card>
        )}

        {!isVendedor && !isAtendimento && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Desempenho por vendedor</CardTitle>
            </CardHeader>
            <CardContent>
              <TabelaDesempenho dados={dadosDesempenho} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
