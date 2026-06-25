import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { FormImportacaoProdutos } from '@/components/fornecedores/form-importacao-produtos'

export default async function ImportarProdutosPage() {
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
    .select('id, nome')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/configuracoes/fornecedores">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Importar Produtos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Faça upload de uma planilha com colunas: Fornecedor, Produto, Preço, Unidade (opcional), Descrição (opcional).
          </p>
        </div>
      </div>
      <FormImportacaoProdutos fornecedores={fornecedores ?? []} />
    </div>
  )
}
