import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { TabelaHubs } from '@/components/hubs/tabela-hubs'
import { ModalNovoHub } from '@/components/hubs/modal-novo-hub'
import type { Hub } from '@/types/database'

export default async function HubsPage() {
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

  const { data: hubs } = await supabase
    .from('hubs')
    .select('id, organization_id, nome, descricao, status, ativo, criado_em, atualizado_em')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  // Proprietários (ativos) da Indústria para vínculo Proprietário ↔ Hub.
  const { data: proprietarios } = await supabase
    .from('profiles')
    .select('id, nome, email, hub_id')
    .eq('organization_id', perfil.organization_id)
    .eq('cargo', 'proprietario_hub')
    .eq('ativo', true)
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
            <h1 className="text-2xl font-bold text-slate-900">Hubs</h1>
            <p className="mt-1 text-sm text-slate-500">
              A Indústria cria e controla o ciclo de vida dos Hubs.
            </p>
          </div>
        </div>
        <ModalNovoHub />
      </div>
      <TabelaHubs
        hubs={(hubs ?? []) as Hub[]}
        proprietarios={(proprietarios ?? []) as { id: string; nome: string; email: string | null; hub_id: string | null }[]}
      />
    </div>
  )
}
