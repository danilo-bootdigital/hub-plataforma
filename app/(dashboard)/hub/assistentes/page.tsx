import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { TabelaAssistentes, type AssistenteRow } from '@/components/assistentes/tabela-assistentes'
import { ModalNovoAssistente } from '@/components/assistentes/modal-novo-assistente'

export default async function AssistentesPage() {
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

  // Sem vínculo a um Hub: nada a gerenciar (a Indústria vincula o Proprietário ao Hub).
  if (!perfil.hub_id) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-slate-900">Assistentes</h1>
        <p className="text-slate-500 max-w-prose">
          Você ainda não está vinculado a um Hub. Solicite à Indústria o vínculo do seu usuário a um Hub
          para gerenciar Assistentes.
        </p>
      </div>
    )
  }

  // Isolamento por Hub (nível de aplicação): apenas Assistentes do próprio Hub.
  const { data: assistentes } = await supabase
    .from('profiles')
    .select('id, nome, email, telefone, ativo, criado_em')
    .eq('organization_id', perfil.organization_id)
    .eq('cargo', 'assistente')
    .eq('hub_id', perfil.hub_id)
    .order('nome')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/hub">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Assistentes</h1>
            <p className="mt-1 text-sm text-slate-500">
              Gerencie os Assistentes de Venda do seu Hub.
            </p>
          </div>
        </div>
        <ModalNovoAssistente />
      </div>
      <TabelaAssistentes assistentes={(assistentes ?? []) as AssistenteRow[]} />
    </div>
  )
}
