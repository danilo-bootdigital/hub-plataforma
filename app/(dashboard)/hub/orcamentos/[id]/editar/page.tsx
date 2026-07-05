import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import {
  FormOrcamentoHub,
  type ClienteOpc,
  type InicialOrcamentoHub,
} from '@/components/orcamentos/form-orcamento-hub'
import type { QuoteStatus } from '@/types/database'

// Edição de orçamento do HUB (DEC-017). Só proprietario_hub/assistente, escopo por hub_id.
// Editável apenas em rascunho/rejeitado_internamente (validado também no server action).
const STATUS_EDITAVEIS: QuoteStatus[] = ['rascunho', 'rejeitado_internamente', 'aguardando_aprovacao_interna']

function num(v: unknown): string {
  const n = Number(v)
  return v == null || Number.isNaN(n) || n === 0 ? '' : String(n)
}

export default async function EditarOrcamentoHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles').select('id, organization_id, cargo, hub_id').eq('id', user.id).single()
  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'proprietario_hub' && perfil.cargo !== 'assistente') redirect('/painel')
  if (!perfil.hub_id) redirect('/hub/orcamentos')

  const org = perfil.organization_id
  const hub = perfil.hub_id
  const admin = createAdminClient()

  // Orçamento do próprio Hub (escopo server-side).
  const { data: orc } = await admin
    .from('quotes')
    .select('id, numero, status, hub_id, portfolio_id, contato_id, forma_pagamento, prazo_entrega, transportadora, frete, endereco_entrega, observacoes, observacoes_cliente, desconto_geral')
    .eq('id', id).eq('organization_id', org).eq('hub_id', hub).maybeSingle()
  if (!orc) notFound()
  if (!STATUS_EDITAVEIS.includes(orc.status as QuoteStatus)) {
    // Fora de status editável: volta para o detalhe.
    redirect(`/orcamentos/${id}`)
  }

  // Itens atuais. Cada item carrega seu portfólio (DEC-013/017); itens antigos sem
  // portfolio_id caem no fallback quotes.portfolio_id ao montar `inicial`.
  const { data: itensRaw } = await admin
    .from('quote_items')
    .select('product_id, portfolio_id, descricao, quantidade, preco_unitario, desconto_item, portfolio:portfolio_id(id, nome)')
    .eq('quote_id', id)

  // Clientes do Hub.
  const { data: cliRaw } = await admin
    .from('contacts')
    .select('id, nome, telefone, cpf_cnpj, carteira:carteira_id!inner(id, nome, hub_id), responsavel:responsavel_operacional_id(nome)')
    .eq('organization_id', org)
    .eq('carteira.hub_id', hub)
    .order('nome')
  const clientes: ClienteOpc[] = (cliRaw ?? []).map((c) => {
    const r = c as unknown as { id: string; nome: string; telefone: string | null; cpf_cnpj: string | null; carteira: { nome: string } | null; responsavel: { nome: string } | null }
    return { id: r.id, nome: r.nome, telefone: r.telefone, cpf_cnpj: r.cpf_cnpj, carteira_nome: r.carteira?.nome ?? null, responsavel_nome: r.responsavel?.nome ?? null }
  })

  // Nome do portfólio de cabeçalho (fallback para itens antigos sem portfolio_id).
  const { data: pCab } = orc.portfolio_id
    ? await admin.from('portfolios').select('nome').eq('id', orc.portfolio_id).maybeSingle()
    : { data: null }

  const { data: h } = await admin.from('hubs').select('nome').eq('id', hub).single()

  const inicial: InicialOrcamentoHub = {
    contato_id: orc.contato_id ?? null,
    itens: (itensRaw ?? []).map((i) => {
      const it = i as unknown as {
        product_id: string
        portfolio_id: string | null
        descricao: string | null
        quantidade: number | null
        preco_unitario: number | null
        desconto_item: number | null
        portfolio: { id: string; nome: string } | null
      }
      // Fallback: itens antigos sem portfolio_id herdam o portfólio de cabeçalho.
      const portfolioId = it.portfolio_id ?? orc.portfolio_id ?? ''
      const portfolioNome = it.portfolio?.nome ?? (it.portfolio_id ? null : pCab?.nome ?? null)
      return {
        product_id: it.product_id,
        portfolio_id: portfolioId,
        portfolio_nome: portfolioNome,
        nome: it.descricao || 'Produto',
        apresentacao: null,
        preco_unitario: Number(it.preco_unitario ?? 0),
        quantidade: Number(it.quantidade ?? 1),
        desconto_item: Number(it.desconto_item ?? 0),
      }
    }),
    forma_pagamento: orc.forma_pagamento ?? '',
    prazo_entrega: orc.prazo_entrega ?? '',
    transportadora: orc.transportadora ?? '',
    frete: num(orc.frete),
    endereco_entrega: orc.endereco_entrega ?? '',
    observacoes: orc.observacoes ?? '',
    observacoes_cliente: orc.observacoes_cliente ?? '',
    desconto_geral: num(orc.desconto_geral),
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4">
      <div>
        <Link href={`/orcamentos/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600">
          <ChevronLeft className="h-4 w-4" />
          Voltar para o orçamento
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Editar Orçamento #{orc.numero ?? ''}</h1>
        <p className="mt-1 text-sm text-slate-500">Hub: <span className="font-medium text-slate-700">{h?.nome ?? '—'}</span></p>
      </div>
      <FormOrcamentoHub
        clientes={clientes}
        orcamentoId={id}
        inicial={inicial}
      />
    </div>
  )
}
