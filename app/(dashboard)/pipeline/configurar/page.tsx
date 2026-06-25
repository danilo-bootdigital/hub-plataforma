import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { FormEtapas } from '@/components/pipeline/form-etapas'

export default async function ConfigurarPipelinePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('cargo, organization_id')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'admin' && perfil.cargo !== 'gestor') redirect('/painel')

  const { data: pipeline } = await supabase
    .from('pipelines')
    .select('id, nome')
    .eq('organization_id', perfil.organization_id)
    .eq('padrao', true)
    .single()

  if (!pipeline) redirect('/pipeline')

  const { data: etapas } = await supabase
    .from('pipeline_stages')
    .select('id, nome, cor, ordem, oculto, tipo_especial')
    .eq('pipeline_id', pipeline.id)
    .order('ordem')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/pipeline"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Pipeline
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurar Etapas</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gerencie as etapas do pipeline <span className="font-medium">{pipeline.nome}</span>.
        </p>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <FormEtapas etapas={etapas ?? []} pipelineId={pipeline.id} />
      </div>
    </div>
  )
}
