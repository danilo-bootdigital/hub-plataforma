import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { FormularioEditarContato } from './formulario-editar-contato'
import type { Contact, Company } from '@/types/database'

type ContatoCompleto = Contact & {
  empresa: Pick<Company, 'id' | 'nome'> | null
}

export default async function EditarContatoPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const { data: contato } = await supabase
    .from('contacts')
    .select('*, empresa:companies!empresa_id(id, nome)')
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)
    .single() as { data: ContatoCompleto | null }

  if (!contato) notFound()

  // RBAC: verificar se usuário pode editar
  const podeEditar = perfil.cargo === 'admin' || perfil.cargo === 'gestor' || contato.responsavel_id === perfil.id

  if (!podeEditar) {
    redirect(`/contatos/${id}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href={`/contatos/${id}`}>
          <Button variant="ghost" size="sm" className="gap-1 pl-0 text-slate-600">
            <ChevronLeft className="h-4 w-4" />
            Voltar para o contato
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Editar Contato</h1>
        <p className="text-sm text-slate-500">Altere os dados do contato abaixo.</p>
      </div>

      <FormularioEditarContato contato={contato} />
    </div>
  )
}
