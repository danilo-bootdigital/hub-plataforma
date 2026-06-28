import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { BotaoImprimir } from '@/components/orcamentos-assistente/botao-imprimir'
import { OrcamentoImpressao, type ItemImpressao } from '@/components/orcamentos-assistente/orcamento-impressao'

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  aguardando_aprovacao_interna: 'Aguardando aprovação interna',
  aprovado_internamente: 'Aprovado internamente',
  rejeitado_internamente: 'Rejeitado internamente',
  enviado_ao_cliente: 'Enviado ao cliente',
  aprovado_pelo_cliente: 'Aprovado pelo cliente',
  recusado_pelo_cliente: 'Recusado pelo cliente',
}

export default async function OrcamentoVisualizarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()
  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'assistente') redirect('/painel')

  // RLS limita à organização; o filtro abaixo garante somente o responsável.
  const { data: orc } = await supabase
    .from('quotes')
    .select('id, numero, status, criado_em, deal_id, contato_id, responsavel_id, valor_subtotal, desconto_tipo, desconto_geral, desconto_valor, valor_total, observacoes')
    .eq('id', id)
    .single()
  if (!orc || orc.responsavel_id !== perfil.id) redirect('/assistente/orcamentos')

  // Organização (cabeçalho)
  const { data: org } = await supabase
    .from('organizations')
    .select('nome, logo_url')
    .eq('id', perfil.organization_id)
    .single()

  // Cliente + Carteira
  let cliente = { nome: '—', telefone: null as string | null, email: null as string | null }
  let carteiraNome = '—'
  if (orc.contato_id) {
    const { data: c } = await supabase
      .from('contacts')
      .select('nome, telefone, email, carteira_id')
      .eq('id', orc.contato_id)
      .single()
    if (c) {
      cliente = { nome: c.nome ?? '—', telefone: c.telefone, email: c.email }
      if (c.carteira_id) {
        const { data: cart } = await supabase.from('carteiras').select('nome').eq('id', c.carteira_id).single()
        carteiraNome = cart?.nome ?? '—'
      }
    }
  }

  // Atendimento de origem
  let atendimentoTitulo = '—'
  let etapa = '—'
  if (orc.deal_id) {
    const { data: d } = await supabase.from('deals').select('titulo, estagio_id').eq('id', orc.deal_id).single()
    atendimentoTitulo = d?.titulo ?? '—'
    if (d?.estagio_id) {
      const { data: e } = await supabase.from('pipeline_stages').select('nome').eq('id', d.estagio_id).single()
      etapa = e?.nome ?? '—'
    }
  }

  // Assistente responsável
  let assistenteNome = '—'
  if (orc.responsavel_id) {
    const { data: resp } = await supabase.from('profiles').select('nome').eq('id', orc.responsavel_id).single()
    assistenteNome = resp?.nome ?? '—'
  }

  // Itens
  const { data: itensRaw } = await supabase
    .from('quote_items')
    .select('descricao, quantidade, preco_unitario, subtotal')
    .eq('quote_id', orc.id)
    .order('descricao')
  const itens = (itensRaw ?? []) as ItemImpressao[]

  // Totais (a partir dos dados existentes)
  const totalBruto = Number(orc.valor_subtotal ?? itens.reduce((s, i) => s + Number(i.subtotal ?? 0), 0))
  const totalFinal = Number(orc.valor_total ?? totalBruto)
  const descontoTotal = Math.max(0, totalBruto - totalFinal)
  const descontoRotulo =
    orc.desconto_tipo === 'PERCENTUAL'
      ? `${Number(orc.desconto_geral ?? 0)}%`
      : orc.desconto_tipo === 'VALOR'
        ? 'R$'
        : ''

  return (
    <div className="space-y-4">
      {/* Barra de ações — não vai para a impressão */}
      <div className="no-print flex items-center justify-between gap-4">
        <Link href={`/assistente/orcamentos/${orc.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <BotaoImprimir />
      </div>

      {/* Área imprimível */}
      <div className="area-impressao rounded-lg border bg-white p-6 print:border-0 print:p-0 print:shadow-none">
        <OrcamentoImpressao
          numero={orc.numero ?? null}
          statusLabel={STATUS_LABEL[orc.status] ?? orc.status}
          criadoEm={orc.criado_em}
          organizacao={{ nome: org?.nome ?? null, logoUrl: org?.logo_url ?? null }}
          cliente={cliente}
          carteiraNome={carteiraNome}
          atendimentoTitulo={atendimentoTitulo}
          etapa={etapa}
          assistenteNome={assistenteNome}
          itens={itens}
          totalBruto={totalBruto}
          descontoRotulo={descontoRotulo}
          descontoTotal={descontoTotal}
          totalFinal={totalFinal}
          observacoes={orc.observacoes ?? null}
        />
      </div>
    </div>
  )
}
