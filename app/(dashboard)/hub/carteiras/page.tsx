import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { TabelaConfigCarteiras, type CarteiraHub } from '@/components/hub-carteiras/tabela-config-carteiras'

export default async function HubCarteirasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo, hub_id')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'proprietario_hub') redirect('/painel')

  if (!perfil.hub_id) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-slate-900">Carteiras do Hub</h1>
        <p className="text-slate-500 max-w-prose">
          Você ainda não está vinculado a um Hub. Solicite à Indústria o vínculo do seu usuário a um Hub
          para configurar Carteiras.
        </p>
      </div>
    )
  }

  // Apenas Carteiras autorizadas ao Hub do Proprietário.
  const { data: carteiras } = await supabase
    .from('carteiras')
    .select('id, nome, modo, responsavel_id')
    .eq('organization_id', perfil.organization_id)
    .eq('hub_id', perfil.hub_id)
    .order('nome')

  // Assistentes ativos do próprio Hub (para o modo DISTRIBUIDA).
  const { data: assistentes } = await supabase
    .from('profiles')
    .select('id, nome')
    .eq('organization_id', perfil.organization_id)
    .eq('cargo', 'assistente')
    .eq('hub_id', perfil.hub_id)
    .eq('ativo', true)
    .order('nome')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/hub">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Carteiras do Hub</h1>
          <p className="mt-1 text-sm text-slate-500">
            Defina como sua equipe opera cada Carteira autorizada (Aberta ou Distribuída).
          </p>
        </div>
      </div>
      <TabelaConfigCarteiras
        carteiras={(carteiras ?? []) as CarteiraHub[]}
        assistentes={(assistentes ?? []) as { id: string; nome: string }[]}
      />
    </div>
  )
}
