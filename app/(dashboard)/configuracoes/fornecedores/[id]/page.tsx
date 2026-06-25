import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { GerenciarCategorias } from '@/components/fornecedores/gerenciar-categorias'
import { TabelaFrete } from '@/components/fornecedores/tabela-frete'
import { HubSelector } from '@/components/fornecedores/hub-selector'
import type { SupplierCategory, Product } from '@/types/database'

export default async function FornecedorDetalhePage({ params }: { params: Promise<{ id: string }> }) {
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
  if (perfil.cargo !== 'admin' && perfil.cargo !== 'gestor') redirect('/painel')

  const { data: fornecedor } = await supabase
    .from('suppliers')
    .select('*, health_hubs(id, nome)')
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!fornecedor) notFound()

  const { data: hubs } = await supabase
    .from('health_hubs')
    .select('id, nome')
    .eq('organization_id', perfil.organization_id)
    .eq('status', 'ativo')
    .order('nome')

  const { data: categorias } = await supabase
    .from('supplier_categories')
    .select('*')
    .eq('supplier_id', id)
    .eq('organization_id', perfil.organization_id)
    .order('nome') as { data: SupplierCategory[] | null }

  const { data: produtos } = await supabase
    .from('products')
    .select('*')
    .eq('supplier_id', id)
    .eq('organization_id', perfil.organization_id)
    .order('nome') as { data: Product[] | null }

  const { data: fretesRaw } = await supabase
    .from('supplier_freight')
    .select('carrier_id, regiao, valor')
    .eq('supplier_id', id)
    .eq('organization_id', perfil.organization_id)

  const fretes = (fretesRaw ?? []) as { carrier_id: string; regiao: string; valor: number }[]

  const { data: transportadorasRaw } = await supabase
    .from('freight_carriers')
    .select('id, nome')
    .eq('supplier_id', id)
    .eq('organization_id', perfil.organization_id)
    .order('criado_em')

  const transportadoras = (transportadorasRaw ?? []) as { id: string; nome: string }[]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/configuracoes/fornecedores">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{fornecedor.nome}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {produtos?.length ?? 0} produtos · {categorias?.length ?? 0} categorias
          </p>
        </div>
      </div>

      <HubSelector fornecedor={fornecedor} hubs={hubs ?? []} />

      <TabelaFrete fornecedorId={id} transportadoras={transportadoras} fretes={fretes} />

      <GerenciarCategorias
        fornecedorId={id}
        categorias={categorias ?? []}
        produtos={produtos ?? []}
      />
    </div>
  )
}
