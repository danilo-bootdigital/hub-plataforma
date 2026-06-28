import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { TabelaOrcamentos, type OrcamentoRow } from '@/components/orcamentos-assistente/tabela-orcamentos'

export default async function AssistenteOrcamentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo, hub_id, nome')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'assistente') redirect('/painel')

  if (!perfil.hub_id) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-slate-900">Orçamentos</h1>
        <p className="text-slate-500 max-w-prose">
          Você ainda não está vinculado a um Hub. Solicite ao Proprietário do seu Hub.
        </p>
      </div>
    )
  }

  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, numero, deal_id, contato_id, status, criado_em')
    .eq('organization_id', perfil.organization_id)
    .eq('responsavel_id', perfil.id)
    .order('criado_em', { ascending: false })

  const lista = quotes ?? []
  const contatoIds = Array.from(new Set(lista.map((q: { contato_id: string | null }) => q.contato_id).filter((v): v is string => !!v)))
  const dealIds = Array.from(new Set(lista.map((q: { deal_id: string | null }) => q.deal_id).filter((v): v is string => !!v)))

  const contatoMap = new Map<string, string>()
  const dealMap = new Map<string, string>()
  if (contatoIds.length) {
    const { data: cs } = await supabase.from('contacts').select('id, nome').in('id', contatoIds)
    ;(cs ?? []).forEach((c: { id: string; nome: string }) => contatoMap.set(c.id, c.nome))
  }
  if (dealIds.length) {
    const { data: ds } = await supabase.from('deals').select('id, titulo').in('id', dealIds)
    ;(ds ?? []).forEach((d: { id: string; titulo: string }) => dealMap.set(d.id, d.titulo))
  }

  const orcamentos: OrcamentoRow[] = lista.map((q: {
    id: string; numero: number | null; deal_id: string | null; contato_id: string | null; status: string; criado_em: string
  }) => ({
    id: q.id,
    numero: q.numero,
    cliente_nome: q.contato_id ? contatoMap.get(q.contato_id) ?? '—' : '—',
    atendimento_titulo: q.deal_id ? dealMap.get(q.deal_id) ?? '—' : '—',
    status: q.status,
    criado_em: q.criado_em,
    responsavel_nome: perfil.nome,
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
          <h1 className="text-2xl font-bold text-slate-900">Orçamentos</h1>
          <p className="mt-1 text-sm text-slate-500">Orçamentos criados por você (a partir dos seus Atendimentos).</p>
        </div>
      </div>
      <TabelaOrcamentos orcamentos={orcamentos} />
    </div>
  )
}
