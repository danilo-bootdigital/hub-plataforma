import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { FormEmpresa } from '@/components/empresa/form-empresa'

export default async function EmpresaPage() {
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

  const { data: org } = await supabase
    .from('organizations')
    .select('id, nome, nome_fantasia, cnpj, telefone, email, endereco, logo_url, site, instagram')
    .eq('id', perfil.organization_id)
    .single()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/configuracoes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Minha Empresa</h1>
          <p className="mt-1 text-sm text-slate-500">
            Dados que aparecerão nos orçamentos e documentos gerados.
          </p>
        </div>
      </div>
      <FormEmpresa
        organizationId={perfil.organization_id}
        defaultValues={{
          nome_fantasia: org?.nome_fantasia ?? '',
          cnpj: org?.cnpj ?? '',
          telefone: org?.telefone ?? '',
          email: org?.email ?? '',
          endereco: org?.endereco ?? '',
          logo_url: org?.logo_url ?? '',
          site: org?.site ?? '',
          instagram: org?.instagram ?? '',
        }}
      />
    </div>
  )
}
