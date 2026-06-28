import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { TabelaPrePedidos, type PrePedidoRow } from '@/components/prepedidos/tabela-prepedidos'

export default async function AssistentePrePedidosPage() {
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

  // Pré-pedidos = orders do próprio Assistente (criados pela conversão — Fatia 16).
  const { data: pedidos } = await supabase
    .from('orders')
    .select('id, contato_id, deal_id, quote_id, status, valor_total, criado_em')
    .eq('organization_id', perfil.organization_id)
    .eq('responsavel_id', perfil.id)
    .eq('tipo', 'PRE_PEDIDO')
    .order('criado_em', { ascending: false })

  const lista = pedidos ?? []
  const contatoIds = Array.from(new Set(lista.map((p: { contato_id: string | null }) => p.contato_id).filter((v): v is string => !!v)))
  const dealIds = Array.from(new Set(lista.map((p: { deal_id: string | null }) => p.deal_id).filter((v): v is string => !!v)))
  const quoteIds = Array.from(new Set(lista.map((p: { quote_id: string | null }) => p.quote_id).filter((v): v is string => !!v)))

  const contatoMap = new Map<string, string>()
  const dealMap = new Map<string, string>()
  const quoteMap = new Map<string, number | null>()
  if (contatoIds.length) {
    const { data: cs } = await supabase.from('contacts').select('id, nome').in('id', contatoIds)
    ;(cs ?? []).forEach((c: { id: string; nome: string }) => contatoMap.set(c.id, c.nome))
  }
  if (dealIds.length) {
    const { data: ds } = await supabase.from('deals').select('id, titulo').in('id', dealIds)
    ;(ds ?? []).forEach((d: { id: string; titulo: string }) => dealMap.set(d.id, d.titulo))
  }
  if (quoteIds.length) {
    const { data: qs } = await supabase.from('quotes').select('id, numero').in('id', quoteIds)
    ;(qs ?? []).forEach((q: { id: string; numero: number | null }) => quoteMap.set(q.id, q.numero))
  }

  const prepedidos: PrePedidoRow[] = lista.map((p: {
    id: string; contato_id: string | null; deal_id: string | null; quote_id: string | null; status: string; valor_total: number | null; criado_em: string
  }) => ({
    id: p.id,
    cliente_nome: p.contato_id ? contatoMap.get(p.contato_id) ?? '—' : '—',
    orcamento_numero: p.quote_id ? quoteMap.get(p.quote_id) ?? null : null,
    atendimento_titulo: p.deal_id ? dealMap.get(p.deal_id) ?? '—' : '—',
    valor_total: Number(p.valor_total ?? 0),
    status: p.status,
    criado_em: p.criado_em,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/assistente">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pré-pedidos</h1>
          <p className="mt-1 text-sm text-slate-500">Pré-pedidos gerados a partir dos seus Orçamentos aprovados pelo Cliente.</p>
        </div>
      </div>
      <TabelaPrePedidos prepedidos={prepedidos} />
    </div>
  )
}
