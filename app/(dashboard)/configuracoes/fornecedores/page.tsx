import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Upload } from 'lucide-react'
import { TabelaFornecedores } from '@/components/fornecedores/tabela-fornecedores'
import { ModalNovoFornecedor } from '@/components/fornecedores/modal-novo-fornecedor'
import type { Supplier } from '@/types/database'

export default async function FornecedoresPage() {
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

  const { data: fornecedores } = await supabase
    .from('suppliers')
    .select('*, health_hubs(id, nome)')
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
            <h1 className="text-2xl font-bold text-slate-900">Fornecedores</h1>
            <p className="mt-1 text-sm text-slate-500">
              Gerencie fornecedores e importe produtos em lote.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/configuracoes/fornecedores/importar">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Upload className="h-4 w-4" />
              Importar Produtos
            </Button>
          </Link>
          <ModalNovoFornecedor />
        </div>
      </div>
      <TabelaFornecedores fornecedores={fornecedores ?? []} />
    </div>
  )
}
