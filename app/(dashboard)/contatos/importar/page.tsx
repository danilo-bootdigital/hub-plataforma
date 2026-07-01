import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { FormImportacao } from '@/components/contatos/form-importacao'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ImportarContatosPage() {
  // DEC-017: importação de clientes é exclusiva da Indústria (admin/gestor).
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('profiles').select('cargo').eq('id', user.id).single()
  if (perfil?.cargo !== 'admin' && perfil?.cargo !== 'gestor') redirect('/painel')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/contatos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Importar Contatos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Faça upload de uma planilha XLSX ou CSV para importar contatos em lote.
          </p>
        </div>
      </div>
      <FormImportacao />
    </div>
  )
}
