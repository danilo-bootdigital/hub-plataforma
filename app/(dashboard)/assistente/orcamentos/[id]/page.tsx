import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { Eye } from 'lucide-react'
import { ItensOrcamento, type ItemOrcamento } from '@/components/orcamentos-assistente/itens-orcamento'
import { ResumoFinanceiro } from '@/components/orcamentos-assistente/resumo-financeiro'
import { BotaoEnviar } from '@/components/orcamentos-assistente/botao-enviar'
import { BotaoResposta } from '@/components/orcamentos-assistente/botao-resposta'
import { BotaoConverter } from '@/components/orcamentos-assistente/botao-converter'

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'RASCUNHO',
  aguardando_aprovacao_interna: 'Aguardando aprovação interna',
  aprovado_internamente: 'Aprovado internamente',
  rejeitado_internamente: 'Rejeitado internamente',
  enviado_ao_cliente: 'Enviado ao cliente',
  aprovado_pelo_cliente: 'Aprovado pelo cliente',
  recusado_pelo_cliente: 'Recusado pelo cliente',
}

function formatarData(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR')
  } catch {
    return '—'
  }
}

export default async function OrcamentoEditarPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: orc } = await supabase
    .from('quotes')
    .select('id, numero, status, criado_em, deal_id, contato_id, responsavel_id, valor_subtotal, desconto_tipo, desconto_geral, desconto_valor, valor_total, observacoes')
    .eq('id', id)
    .single()
  // Só o responsável pelo Orçamento (e da mesma Indústria) acessa.
  if (!orc || orc.responsavel_id !== perfil.id) redirect('/assistente/orcamentos')

  let cliente: { nome: string; telefone: string | null; email: string | null; carteira_id: string | null } | null = null
  let carteiraNome = '—'
  if (orc.contato_id) {
    const { data: c } = await supabase
      .from('contacts')
      .select('nome, telefone, email, carteira_id')
      .eq('id', orc.contato_id)
      .single()
    cliente = c ?? null
    if (c?.carteira_id) {
      const { data: cart } = await supabase.from('carteiras').select('nome').eq('id', c.carteira_id).single()
      carteiraNome = cart?.nome ?? '—'
    }
  }

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

  // Pré-pedido derivado deste Orçamento (Fatia 16), se já convertido.
  const { data: prePedido } = await supabase
    .from('orders')
    .select('id, numero')
    .eq('quote_id', orc.id)
    .maybeSingle()

  // Itens do Orçamento (Fatia 13A). Edição apenas em RASCUNHO.
  const editavel = orc.status === 'rascunho'
  const { data: itensRaw } = await supabase
    .from('quote_items')
    .select('id, descricao, quantidade, preco_unitario, subtotal')
    .eq('quote_id', orc.id)
    .order('descricao')
  const itens = (itensRaw ?? []) as ItemOrcamento[]
  const totalBruto = itens.reduce((s, i) => s + Number(i.subtotal ?? 0), 0)
  const totalFinal = Number(orc.valor_total ?? totalBruto)

  // Regras de envio ao Cliente (Fatia 14): precisa de ≥1 item e Total Final > 0.
  const bloqueioEnvio = itens.length < 1
    ? 'Adicione ao menos 1 item para enviar ao Cliente.'
    : totalFinal <= 0
      ? 'O Total Final precisa ser maior que zero para enviar.'
      : null

  let produtos: { id: string; nome: string; preco_unitario: number }[] = []
  if (editavel) {
    const { data: prods } = await supabase
      .from('products')
      .select('id, nome, preco_unitario')
      .eq('organization_id', perfil.organization_id)
      .eq('ativo', true)
      .order('nome')
    produtos = (prods ?? []) as { id: string; nome: string; preco_unitario: number }[]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/assistente/orcamentos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Orçamento {orc.numero ? `#${orc.numero}` : ''}</h1>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {STATUS_LABEL[orc.status] ?? orc.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">Criado em {formatarData(orc.criado_em)}</p>
        </div>
        <div className="ml-auto">
          <Link href={`/assistente/orcamentos/${orc.id}/visualizar`}>
            <Button variant="outline">
              <Eye className="mr-2 h-4 w-4" />
              Visualizar
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Cliente</h2>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Nome</dt><dd className="text-slate-800">{cliente?.nome ?? '—'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Telefone</dt><dd className="text-slate-800">{cliente?.telefone ?? '—'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">E-mail</dt><dd className="text-slate-800">{cliente?.email ?? '—'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Carteira</dt><dd className="text-slate-800">{carteiraNome}</dd></div>
          </dl>
        </div>
        <div className="rounded-lg border bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Atendimento de origem</h2>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Título</dt><dd className="text-slate-800">{atendimentoTitulo}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Etapa</dt><dd className="text-slate-800">{etapa}</dd></div>
          </dl>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Itens do Orçamento</h2>
        <ItensOrcamento
          quoteId={orc.id}
          editavel={editavel}
          produtos={produtos}
          itens={itens}
          totalBruto={totalBruto}
        />
      </div>

      <ResumoFinanceiro
        quoteId={orc.id}
        editavel={editavel}
        totalBruto={totalBruto}
        totalFinal={totalFinal}
        descontoTipo={(orc.desconto_tipo ?? null) as 'PERCENTUAL' | 'VALOR' | null}
        descontoGeral={Number(orc.desconto_geral ?? 0)}
        descontoValor={Number(orc.desconto_valor ?? 0)}
        observacoes={orc.observacoes ?? null}
      />

      {/* Envio operacional ao Cliente (Fatia 14) */}
      {editavel ? (
        <div className="flex justify-end border-t pt-4">
          <BotaoEnviar quoteId={orc.id} bloqueio={bloqueioEnvio} />
        </div>
      ) : (
        <div className="space-y-3 border-t pt-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Este Orçamento está como <strong>{STATUS_LABEL[orc.status] ?? orc.status}</strong> e não pode mais ser editado.
            Você ainda pode visualizá-lo e imprimi-lo.
          </div>
          {/* Resposta do Cliente (Fatia 15) — apenas para Orçamentos enviados */}
          {orc.status === 'enviado_ao_cliente' && (
            <div className="flex justify-end">
              <BotaoResposta quoteId={orc.id} />
            </div>
          )}
          {/* Conversão em Pré-pedido (Fatia 16) — apenas para aprovados */}
          {orc.status === 'aprovado_pelo_cliente' && (
            <div className="flex items-center justify-end gap-3">
              {prePedido ? (
                <>
                  <span className="text-sm text-slate-600">
                    Convertido em Pré-pedido{prePedido.numero ? ` #${prePedido.numero}` : ''}.
                  </span>
                  <Link href="/assistente/prepedidos">
                    <Button variant="outline">Ver Pré-pedidos</Button>
                  </Link>
                </>
              ) : (
                <BotaoConverter quoteId={orc.id} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
