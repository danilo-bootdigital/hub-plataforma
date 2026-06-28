import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { TabelaClientesAssistente } from '@/components/hub-clientes/tabela-clientes-assistente'
import { montarClientesVisiveis, type CarteiraAcessivel } from '@/lib/hub/clientes-visiveis'

export default async function AssistenteClientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo, hub_id')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'assistente') redirect('/painel')

  if (!perfil.hub_id) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
        <p className="text-slate-500 max-w-prose">
          Você ainda não está vinculado a um Hub. Solicite ao Proprietário do seu Hub.
        </p>
      </div>
    )
  }

  // Carteiras do Hub do Assistente; regra: ABERTA (todas) ou DISTRIBUIDA (só onde ele é responsável).
  const { data: carteirasHub } = await supabase
    .from('carteiras')
    .select('id, nome, modo, responsavel_id')
    .eq('organization_id', perfil.organization_id)
    .eq('hub_id', perfil.hub_id)
    .order('nome')

  const acessiveis = ((carteirasHub ?? []) as CarteiraAcessivel[]).filter(
    (c) => c.modo === 'ABERTA' || (c.modo === 'DISTRIBUIDA' && c.responsavel_id === perfil.id)
  )

  const clientes = await montarClientesVisiveis(supabase, perfil.organization_id, acessiveis)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/assistente">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Clientes das suas Carteiras (abertas do Hub e distribuídas a você).
          </p>
        </div>
      </div>
      <TabelaClientesAssistente clientes={clientes} />
    </div>
  )
}
