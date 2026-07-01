import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { FormOrcamentoHub, type ClienteOpc, type PortfolioOpc } from '@/components/orcamentos/form-orcamento-hub'

// Criação de orçamento é FLUXO DO HUB (DEC-017): só proprietario_hub/assistente.
export default async function NovoOrcamentoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles').select('id, organization_id, cargo, hub_id').eq('id', user.id).single()
  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'proprietario_hub' && perfil.cargo !== 'assistente') redirect('/painel')

  if (!perfil.hub_id) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-3">
        <h1 className="text-2xl font-bold text-slate-900">Novo Orçamento</h1>
        <p className="text-slate-500">Seu usuário não está vinculado a um Hub. Solicite o vínculo à Indústria.</p>
      </div>
    )
  }

  const org = perfil.organization_id
  const hub = perfil.hub_id
  const admin = createAdminClient()

  // Clientes das Carteiras operadas pelo Hub.
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

  // Portfólios autorizados e ativos para o Hub.
  const { data: hpRaw } = await admin
    .from('hub_portfolios')
    .select('portfolio:portfolio_id!inner(id, nome, ativo)')
    .eq('hub_id', hub).eq('status', 'ativo').eq('organization_id', org)
  const portfolios: PortfolioOpc[] = (hpRaw ?? [])
    .map((r) => (r as unknown as { portfolio: { id: string; nome: string; ativo: boolean } | null }).portfolio)
    .filter((p): p is { id: string; nome: string; ativo: boolean } => !!p && p.ativo)
    .map((p) => ({ id: p.id, nome: p.nome }))

  const { data: h } = await admin.from('hubs').select('nome').eq('id', hub).single()

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Novo Orçamento</h1>
        <p className="mt-1 text-sm text-slate-500">Hub: <span className="font-medium text-slate-700">{h?.nome ?? '—'}</span></p>
      </div>
      <FormOrcamentoHub clientes={clientes} portfolios={portfolios} hubNome={h?.nome ?? ''} />
    </div>
  )
}
