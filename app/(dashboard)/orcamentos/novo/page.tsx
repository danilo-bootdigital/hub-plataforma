import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { FormOrcamentoHub, type ClienteOpc } from '@/components/orcamentos/form-orcamento-hub'

// Criação de orçamento é FLUXO DO HUB (DEC-017): só proprietario_hub/assistente.
// Aceita ?contato_id= e ?deal_id= (origem: Atendimentos/Pipeline) para pré-selecionar
// o cliente e preservar o atendimento — o orçamento nasce sempre pelo criarOrcamentoHub.
export default async function NovoOrcamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ contato_id?: string; deal_id?: string }>
}) {
  const sp = await searchParams
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

  const { data: h } = await admin.from('hubs').select('nome').eq('id', hub).single()

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Novo Orçamento</h1>
        <p className="mt-1 text-sm text-slate-500">Hub: <span className="font-medium text-slate-700">{h?.nome ?? '—'}</span></p>
      </div>
      <FormOrcamentoHub
        clientes={clientes}
        hubNome={h?.nome ?? ''}
        contatoInicial={sp.contato_id ?? null}
        dealId={sp.deal_id ?? null}
      />
    </div>
  )
}
