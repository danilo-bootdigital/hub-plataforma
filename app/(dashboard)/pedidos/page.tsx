import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { subDays } from 'date-fns'
import { BadgeStatusPedido } from '@/components/pedidos/badge-status-pedido'
import { BotaoExcluirPedido } from '@/components/pedidos/botao-excluir-pedido'
import { FiltrosPedidos } from '@/components/pedidos/filtros-pedidos'
import { CabecalhoPagina, CartaoTabela, tabela } from '@/components/layout/listagem'

function calcularPeriodo(periodo: string | null, inicioCustom: string | null, fimCustom: string | null) {
  const agora = new Date()
  switch (periodo) {
    case '7': return { inicio: subDays(agora, 7).toISOString(), fim: agora.toISOString() }
    case '30': return { inicio: subDays(agora, 30).toISOString(), fim: agora.toISOString() }
    case '90': return { inicio: subDays(agora, 90).toISOString(), fim: agora.toISOString() }
    case '365': return { inicio: subDays(agora, 365).toISOString(), fim: agora.toISOString() }
    case 'custom': return {
      inicio: inicioCustom ? new Date(inicioCustom).toISOString() : null,
      fim: fimCustom ? new Date(`${fimCustom}T23:59:59`).toISOString() : null,
    }
    default: return { inicio: null, fim: null }
  }
}

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const supabase = await createClient()
  const params = await searchParams
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const fornecedorFiltro = params.fornecedor ?? null
  const nomeBusca = (params.nome ?? '').trim().toLowerCase()
  const { inicio, fim } = calcularPeriodo(params.periodo ?? 'todos', params.inicio ?? null, params.fim ?? null)

  // Fornecedores para o filtro
  const { data: fornecedoresRaw } = await supabase
    .from('suppliers')
    .select('id, nome')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  const fornecedores = (fornecedoresRaw ?? []) as { id: string; nome: string }[]

  // Fornecedor vem de orders → quote.supplier_id. Filtro aplicado no banco
  // (inner join no orçamento) para não esbarrar no limit antes de filtrar.
  // A busca por nome é feita em JS sobre o cliente exibido, por isso o limite
  // é ampliado quando há busca, para varrer uma janela maior de pedidos.
  let query = supabase
    .from('orders')
    .select(`
      id, numero, status, valor_total, criado_em,
      responsavel:profiles!responsavel_id(nome),
      lead:leads!lead_id(nome, telefone),
      contato:contacts!contato_id(nome, telefone),
      quote:quotes!quote_id${fornecedorFiltro ? '!inner' : ''}(contato_id, supplier_id, fornecedor:suppliers!supplier_id(nome), lead:leads!lead_id(nome, telefone), contato_quote:contacts!contato_id(nome, telefone))
    `)
    .eq('organization_id', perfil.organization_id)
    .eq('tipo', 'PEDIDO')
    .order('criado_em', { ascending: false })
    .limit(nomeBusca ? 1000 : 100)

  if (perfil.cargo === 'vendedor') {
    query = query.eq('responsavel_id', perfil.id)
  }

  if (fornecedorFiltro) {
    query = query.eq('quote.supplier_id', fornecedorFiltro)
  }

  if (inicio) query = query.gte('criado_em', inicio)
  if (fim) query = query.lte('criado_em', fim)

  const { data: pedidos } = await query

  // Normaliza cliente/fornecedor para exibição e aplica a busca por nome (cliente ou nº)
  const pedidosView = (pedidos ?? []).map((pedido) => {
    const lead = Array.isArray(pedido.lead) ? pedido.lead[0] : pedido.lead
    const contato = Array.isArray(pedido.contato) ? pedido.contato[0] : pedido.contato
    const responsavel = Array.isArray(pedido.responsavel) ? pedido.responsavel[0] : pedido.responsavel
    const quote = Array.isArray(pedido.quote) ? pedido.quote[0] : pedido.quote
    const contatoQuote = quote ? (Array.isArray(quote.contato_quote) ? quote.contato_quote[0] : quote.contato_quote) : null
    const leadQuote = quote ? (Array.isArray(quote.lead) ? quote.lead[0] : quote.lead) : null
    const fornRel = quote ? (Array.isArray(quote.fornecedor) ? quote.fornecedor[0] : quote.fornecedor) : null
    const cliente = contato?.nome || lead?.nome || contatoQuote?.nome || leadQuote?.nome || lead?.telefone || leadQuote?.telefone || '—'
    return {
      id: pedido.id,
      numero: pedido.numero,
      status: pedido.status,
      valor_total: pedido.valor_total,
      criado_em: pedido.criado_em,
      cliente,
      responsavelNome: responsavel?.nome ?? '—',
      fornecedorNome: fornRel?.nome ?? '—',
    }
  })

  const pedidosFiltrados = nomeBusca
    ? pedidosView.filter((p) => p.cliente.toLowerCase().includes(nomeBusca) || String(p.numero).includes(nomeBusca))
    : pedidosView

  const temFiltros = Boolean(fornecedorFiltro || nomeBusca || inicio || fim)

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Pedidos"
        descricao="Acompanhe o status operacional dos pedidos aprovados."
      />

      <FiltrosPedidos fornecedores={fornecedores} />

      <CartaoTabela>
        <table className={tabela.root}>
          <thead>
            <tr className={tabela.theadTr}>
              <th className={tabela.th}>#</th>
              <th className={tabela.th}>Cliente</th>
              <th className={tabela.th}>Fornecedor</th>
              <th className={tabela.th}>Valor</th>
              <th className={tabela.th}>Status</th>
              <th className={tabela.th}>Responsável</th>
              <th className={tabela.th}>Data</th>
              <th className={tabela.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {pedidosFiltrados.length === 0 && (
              <tr>
                <td colSpan={8} className={tabela.vazio}>
                  {temFiltros ? 'Nenhum pedido encontrado para os filtros selecionados.' : 'Nenhum pedido ainda.'}
                </td>
              </tr>
            )}
            {pedidosFiltrados.map((pedido) => (
              <tr key={pedido.id} className={tabela.tr}>
                <td className={tabela.td}>
                  <Link href={`/pedidos/${pedido.id}`} className="font-medium text-blue-600 hover:underline">
                    #{pedido.numero}
                  </Link>
                </td>
                <td className={`${tabela.td} text-slate-700`}>{pedido.cliente}</td>
                <td className={`${tabela.td} text-slate-600`}>{pedido.fornecedorNome}</td>
                <td className={`${tabela.td} text-slate-700`}>
                  {Number(pedido.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className={tabela.td}>
                  <BadgeStatusPedido status={pedido.status} />
                </td>
                <td className={`${tabela.td} text-slate-600`}>{pedido.responsavelNome}</td>
                <td className={`${tabela.td} text-xs text-slate-500`}>
                  {new Date(pedido.criado_em).toLocaleDateString('pt-BR')}
                </td>
                <td className={tabela.td}>
                  <BotaoExcluirPedido pedidoId={pedido.id} numero={pedido.numero} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CartaoTabela>
    </div>
  )
}
