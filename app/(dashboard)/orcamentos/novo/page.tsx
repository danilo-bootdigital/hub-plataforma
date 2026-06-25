import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { FormOrcamento } from '@/components/orcamentos/form-orcamento'

function NovoOrcamentoPage({ searchParams }: { searchParams: Promise<{ deal_id?: string }> }) {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <NovoOrcamentoContent searchParams={searchParams} />
    </Suspense>
  )
}

export default NovoOrcamentoPage

async function NovoOrcamentoContent({ searchParams }: { searchParams: Promise<{ deal_id?: string }> }) {
  const params = await searchParams
  const dealId = params.deal_id

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')
  if (perfil.cargo === 'atendimento') redirect('/orcamentos')

  const { data: produtos } = await supabase
    .from('products')
    .select('*')
    .eq('organization_id', perfil.organization_id)
    .eq('ativo', true)
    .order('nome')

  const { data: fornecedores } = await supabase
    .from('suppliers')
    .select('*')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  const { data: categorias } = await supabase
    .from('supplier_categories')
    .select('*')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  const { data: deals } = await supabase
    .from('deals')
    .select('id, titulo')
    .eq('organization_id', perfil.organization_id)
    .is('ganho', null)
    .order('titulo')

  const { data: contatos } = await supabase
    .from('contacts')
    .select('id, nome, telefone, email, cpf_cnpj, cargo, tipo_pessoa, categoria_cliente, especialidade, tipo_conselho, numero_conselho, uf_conselho, observacoes, empresa_id, empresa:companies!empresa_id(nome), endereco, endereco_numero, endereco_complemento, endereco_bairro, endereco_cidade, endereco_estado, endereco_cep')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  const { data: empresas } = await supabase
    .from('companies')
    .select('id, nome, cnpj, nome_fantasia, inscricao_estadual, inscricao_municipal, endereco')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  const { data: fretesRaw } = await supabase
    .from('supplier_freight')
    .select('supplier_id, carrier_id, regiao, valor')
    .eq('organization_id', perfil.organization_id)

  const fretesFornecedores = (fretesRaw ?? []) as { supplier_id: string; carrier_id: string; regiao: string; valor: number }[]

  const { data: transportadorasRaw } = await supabase
    .from('freight_carriers')
    .select('id, supplier_id, nome')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  const transportadoras = (transportadorasRaw ?? []) as { id: string; supplier_id: string; nome: string }[]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Novo Orçamento</h1>
      <FormOrcamento
        produtos={produtos ?? []}
        fornecedores={fornecedores ?? []}
        categorias={categorias ?? []}
        deals={(deals ?? []) as { id: string; titulo: string }[]}
        contatos={contatos as any}
        empresas={(empresas ?? []) as { id: string; nome: string; cnpj: string | null; nome_fantasia: string | null; inscricao_estadual: string | null; inscricao_municipal: string | null; endereco: string | null }[]}
        fretesFornecedores={fretesFornecedores}
        transportadoras={transportadoras}
      />
    </div>
  )
}