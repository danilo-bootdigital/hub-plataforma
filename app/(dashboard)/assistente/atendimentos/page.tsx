import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { TabelaAtendimentos, type AtendimentoRow } from '@/components/atendimentos/tabela-atendimentos'

export default async function AssistenteAtendimentosPage() {
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
        <h1 className="text-2xl font-bold text-slate-900">Atendimentos</h1>
        <p className="text-slate-500 max-w-prose">
          Você ainda não está vinculado a um Hub. Solicite ao Proprietário do seu Hub.
        </p>
      </div>
    )
  }

  // Atendimentos criados pelo próprio Assistente.
  const { data: deals } = await supabase
    .from('deals')
    .select('id, contato_id, estagio_id, criado_em')
    .eq('organization_id', perfil.organization_id)
    .eq('responsavel_id', perfil.id)
    .order('criado_em', { ascending: false })

  const lista = deals ?? []
  const contatoIds = Array.from(new Set(lista.map((d: { contato_id: string | null }) => d.contato_id).filter((v): v is string => !!v)))
  const estagioIds = Array.from(new Set(lista.map((d: { estagio_id: string }) => d.estagio_id)))

  const contatoMap = new Map<string, { nome: string; carteira_id: string | null }>()
  const carteiraMap = new Map<string, string>()
  const estagioMap = new Map<string, string>()

  if (contatoIds.length) {
    const { data: contatos } = await supabase.from('contacts').select('id, nome, carteira_id').in('id', contatoIds)
    ;(contatos ?? []).forEach((c: { id: string; nome: string; carteira_id: string | null }) =>
      contatoMap.set(c.id, { nome: c.nome, carteira_id: c.carteira_id })
    )
    const carteiraIds = Array.from(
      new Set(Array.from(contatoMap.values()).map((c) => c.carteira_id).filter((v): v is string => !!v))
    )
    if (carteiraIds.length) {
      const { data: carteiras } = await supabase.from('carteiras').select('id, nome').in('id', carteiraIds)
      ;(carteiras ?? []).forEach((c: { id: string; nome: string }) => carteiraMap.set(c.id, c.nome))
    }
  }
  if (estagioIds.length) {
    const { data: estagios } = await supabase.from('pipeline_stages').select('id, nome').in('id', estagioIds)
    ;(estagios ?? []).forEach((e: { id: string; nome: string }) => estagioMap.set(e.id, e.nome))
  }

  const atendimentos: AtendimentoRow[] = lista.map((d: { id: string; contato_id: string | null; estagio_id: string; criado_em: string }) => {
    const contato = d.contato_id ? contatoMap.get(d.contato_id) : undefined
    return {
      id: d.id,
      contato_id: d.contato_id,
      cliente_nome: contato?.nome ?? '—',
      carteira_nome: contato?.carteira_id ? carteiraMap.get(contato.carteira_id) ?? '—' : '—',
      etapa: estagioMap.get(d.estagio_id) ?? '—',
      criado_em: d.criado_em,
      responsavel_nome: perfil.nome,
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/assistente">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Atendimentos</h1>
          <p className="mt-1 text-sm text-slate-500">Atendimentos criados por você.</p>
        </div>
      </div>
      <TabelaAtendimentos atendimentos={atendimentos} />
    </div>
  )
}
