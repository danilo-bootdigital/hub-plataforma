import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { TabelaCarteiras } from '@/components/carteiras/tabela-carteiras'
import { ModalNovaCarteira } from '@/components/carteiras/modal-nova-carteira'
import type { Carteira } from '@/types/database'

export default async function CarteirasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'admin' && perfil.cargo !== 'gestor') redirect('/painel')

  const { data: carteiras } = await supabase
    .from('carteiras')
    .select('id, organization_id, hub_id, nome, descricao, observacoes, ordem, ativo, criado_em, atualizado_em')
    .eq('organization_id', perfil.organization_id)
    .order('ordem')
    .order('nome')

  const { data: hubs } = await supabase
    .from('hubs')
    .select('id, nome')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/configuracoes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Carteiras</h1>
            <p className="mt-1 text-sm text-slate-500">
              A Carteira pertence à Indústria. Aqui você cria, edita e autoriza qual Hub opera cada Carteira.
            </p>
          </div>
        </div>
        <ModalNovaCarteira />
      </div>
      <TabelaCarteiras
        carteiras={(carteiras ?? []) as Carteira[]}
        hubs={(hubs ?? []) as { id: string; nome: string }[]}
      />
    </div>
  )
}
