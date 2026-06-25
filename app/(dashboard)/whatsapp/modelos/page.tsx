import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ModelosClient } from '@/components/whatsapp/modelos-client'

export default async function ModelosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const { data: modelos } = await supabase
    .from('message_templates')
    .select('*')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Modelos de Mensagem</h1>
      <ModelosClient modelos={modelos ?? []} />
    </div>
  )
}
