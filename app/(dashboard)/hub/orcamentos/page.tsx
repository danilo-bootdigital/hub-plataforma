import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { TabelaOrcamentosHub, type OrcamentoHubRow } from '@/components/orcamentos-hub/tabela-orcamentos-hub'

// Área operacional de Orçamentos do HUB (DEC-017). Separada da lista legada
// /orcamentos. Acesso só a proprietario_hub/assistente; a Indústria não entra.
// Escopo por hub_id é aplicado NO SERVIDOR (não confia em filtro do front).
export default async function HubOrcamentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles').select('id, organization_id, cargo, hub_id').eq('id', user.id).single()
  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'proprietario_hub' && perfil.cargo !== 'assistente') redirect('/painel')

  if (!perfil.hub_id) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-slate-900">Orçamentos</h1>
        <p className="max-w-prose text-slate-500">
          Seu usuário não está vinculado a um Hub. Solicite o vínculo à Indústria.
        </p>
      </div>
    )
  }

  const org = perfil.organization_id
  const hub = perfil.hub_id
  const admin = createAdminClient()

  // Somente orçamentos do Hub do usuário (escopo server-side por hub_id).
  const { data: qRaw } = await admin
    .from('quotes')
    .select('id, numero, status, valor_total, criado_em, contato_id, portfolio:portfolio_id(nome), responsavel:profiles!responsavel_id(nome)')
    .eq('organization_id', org)
    .eq('hub_id', hub)
    .order('criado_em', { ascending: false })

  const lista = (qRaw ?? []) as unknown as {
    id: string; numero: number | null; status: string; valor_total: number | null; criado_em: string
    contato_id: string | null; portfolio: { nome: string } | null; responsavel: { nome: string } | null
  }[]

  // Nomes dos clientes (busca única).
  const contatoIds = [...new Set(lista.map((q) => q.contato_id).filter((v): v is string => !!v))]
  const contatoMap = new Map<string, string>()
  if (contatoIds.length) {
    const { data: cs } = await admin.from('contacts').select('id, nome').in('id', contatoIds)
    ;(cs ?? []).forEach((c) => contatoMap.set(c.id, c.nome))
  }

  const orcamentos: OrcamentoHubRow[] = lista.map((q) => ({
    id: q.id,
    numero: q.numero,
    cliente_nome: q.contato_id ? contatoMap.get(q.contato_id) ?? '—' : '—',
    portfolio_nome: q.portfolio?.nome ?? '—',
    status: q.status,
    valor_total: q.valor_total,
    criado_em: q.criado_em,
    responsavel_nome: q.responsavel?.nome ?? '—',
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orçamentos</h1>
          <p className="mt-1 text-sm text-slate-500">Orçamentos do seu Hub, por Portfólio.</p>
        </div>
        <Link href="/orcamentos/novo">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Novo orçamento
          </Button>
        </Link>
      </div>
      <TabelaOrcamentosHub orcamentos={orcamentos} />
    </div>
  )
}
