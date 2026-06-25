'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function getAdminOuGestor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()
  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'admin' && perfil.cargo !== 'gestor') {
    throw new Error('Sem permissão.')
  }
  return { supabase, perfil }
}

export async function criarFornecedor(formData: FormData) {
  const { supabase, perfil } = await getAdminOuGestor()

  const nome = formData.get('nome') as string
  if (!nome?.trim()) throw new Error('Nome é obrigatório.')

  const hubId = formData.get('hub_id') as string | null

  // Validar se hub existe (se fornecido)
  if (hubId) {
    const { data: hub } = await supabase
      .from('health_hubs')
      .select('id')
      .eq('id', hubId)
      .eq('organization_id', perfil.organization_id)
      .single()

    if (!hub) {
      throw new Error('Hub não encontrado ou não pertence à sua organização.')
    }
  }

  const { error } = await supabase.from('suppliers').insert({
    organization_id: perfil.organization_id,
    nome: nome.trim(),
    cnpj: (formData.get('cnpj') as string)?.trim() || null,
    telefone: (formData.get('telefone') as string)?.trim() || null,
    email: (formData.get('email') as string)?.trim() || null,
    hub_id: hubId || null,
  })

  if (error) throw new Error(`Erro ao criar fornecedor: ${error.message}`)
  revalidatePath('/configuracoes/fornecedores')
}

export async function editarFornecedor(id: string, nome: string, hubId?: string | null) {
  const { supabase, perfil } = await getAdminOuGestor()

  if (!nome?.trim()) throw new Error('Nome é obrigatório.')

  // Validar se hub existe (se fornecido)
  if (hubId) {
    const { data: hub } = await supabase
      .from('health_hubs')
      .select('id')
      .eq('id', hubId)
      .eq('organization_id', perfil.organization_id)
      .single()

    if (!hub) {
      throw new Error('Hub não encontrado ou não pertence à sua organização.')
    }
  }

  const { error } = await supabase
    .from('suppliers')
    .update({ nome: nome.trim(), hub_id: hubId || null })
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao editar fornecedor: ${error.message}`)
  revalidatePath('/configuracoes/fornecedores')
}

export async function excluirFornecedor(id: string) {
  const { supabase, perfil } = await getAdminOuGestor()

  // Verificar se há produtos vinculados
  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('supplier_id', id)
    .eq('organization_id', perfil.organization_id)

  if (count && count > 0) {
    throw new Error(`Não é possível excluir: ${count} produto(s) vinculado(s).`)
  }

  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao excluir: ${error.message}`)
  revalidatePath('/configuracoes/fornecedores')
}

type ProdutoImportado = {
  fornecedor: string
  nome: string
  descricao: string | null
  preco_unitario: number
  unidade: string
  categoria?: string
}

export async function importarProdutosComFornecedor(produtos: ProdutoImportado[]) {
  const { supabase, perfil } = await getAdminOuGestor()

  if (!produtos || produtos.length === 0) throw new Error('Nenhum produto para importar.')
  if (produtos.length > 5000) throw new Error('Máximo de 5000 produtos por importação.')

  // Agrupar por fornecedor
  const fornecedoresUnicos = [...new Set(produtos.map((p) => p.fornecedor.trim()))]

  // Buscar fornecedores existentes
  const { data: existentes } = await supabase
    .from('suppliers')
    .select('id, nome')
    .eq('organization_id', perfil.organization_id)

  const fornecedorMap = new Map<string, string>()
  ;(existentes ?? []).forEach((f) => fornecedorMap.set(f.nome.toLowerCase(), f.id))

  // Criar fornecedores que não existem
  for (const nome of fornecedoresUnicos) {
    if (!fornecedorMap.has(nome.toLowerCase())) {
      const { data, error } = await supabase
        .from('suppliers')
        .insert({ organization_id: perfil.organization_id, nome })
        .select('id')
        .single()
      if (error) throw new Error(`Erro ao criar fornecedor "${nome}": ${error.message}`)
      fornecedorMap.set(nome.toLowerCase(), data.id)
    }
  }

  // Criar categorias se necessário
  const categoriasUnicas = [...new Set(produtos.filter((p) => p.categoria).map((p) => `${p.fornecedor.trim().toLowerCase()}::${p.categoria!.trim()}`))]
  const categoriaMap = new Map<string, string>()

  if (categoriasUnicas.length > 0) {
    // Buscar categorias existentes para cada fornecedor
    for (const fornecedorNome of fornecedoresUnicos) {
      const fornecedorId = fornecedorMap.get(fornecedorNome.toLowerCase())
      if (!fornecedorId) continue

      const { data: catsExistentes } = await supabase
        .from('supplier_categories')
        .select('id, nome')
        .eq('supplier_id', fornecedorId)
        .eq('organization_id', perfil.organization_id)

      ;(catsExistentes ?? []).forEach((c) => {
        categoriaMap.set(`${fornecedorNome.toLowerCase()}::${c.nome.toLowerCase()}`, c.id)
      })
    }

    // Criar categorias que não existem
    for (const chave of categoriasUnicas) {
      if (categoriaMap.has(chave.toLowerCase())) continue
      const idx = chave.indexOf('::')
      const fornecedorKey = chave.slice(0, idx)
      const catNome = chave.slice(idx + 2)
      const fornecedorId = fornecedorMap.get(fornecedorKey)
      if (!fornecedorId) continue

      const { data, error } = await supabase
        .from('supplier_categories')
        .insert({ organization_id: perfil.organization_id, supplier_id: fornecedorId, nome: catNome })
        .select('id')
        .single()
      if (error) throw new Error(`Erro ao criar categoria "${catNome}": ${error.message}`)
      categoriaMap.set(chave.toLowerCase(), data.id)
    }
  }

  // Inserir produtos em lotes
  const BATCH_SIZE = 500
  let importados = 0

  for (let i = 0; i < produtos.length; i += BATCH_SIZE) {
    const lote = produtos.slice(i, i + BATCH_SIZE).map((p) => {
      const fornecedorId = fornecedorMap.get(p.fornecedor.trim().toLowerCase()) ?? null
      const categoriaId = p.categoria
        ? categoriaMap.get(`${p.fornecedor.trim().toLowerCase()}::${p.categoria.trim().toLowerCase()}`) ?? null
        : null

      return {
        organization_id: perfil.organization_id,
        supplier_id: fornecedorId,
        category_id: categoriaId,
        nome: p.nome.trim(),
        descricao: p.descricao || null,
        preco_unitario: p.preco_unitario,
        unidade: p.unidade || 'un',
        ativo: true,
      }
    })

    const { error } = await supabase.from('products').insert(lote)
    if (error) throw new Error(`Erro ao importar lote: ${error.message}`)
    importados += lote.length
  }

  revalidatePath('/configuracoes/produtos')
  revalidatePath('/configuracoes/fornecedores')
  return { importados, fornecedoresCriados: fornecedoresUnicos.length }
}

// --- Categorias ---

export async function criarCategoria(fornecedorId: string, nome: string) {
  const { supabase, perfil } = await getAdminOuGestor()

  if (!nome?.trim()) throw new Error('Nome da categoria é obrigatório.')

  const { error } = await supabase.from('supplier_categories').insert({
    organization_id: perfil.organization_id,
    supplier_id: fornecedorId,
    nome: nome.trim(),
  })

  if (error) throw new Error(`Erro ao criar categoria: ${error.message}`)
  revalidatePath(`/configuracoes/fornecedores/${fornecedorId}`)
}

export async function excluirCategoria(categoriaId: string, fornecedorId: string) {
  const { supabase, perfil } = await getAdminOuGestor()

  // Verificar se há produtos vinculados
  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', categoriaId)

  if (count && count > 0) {
    throw new Error(`Não é possível excluir: ${count} produto(s) vinculado(s) a esta categoria.`)
  }

  const { error } = await supabase
    .from('supplier_categories')
    .delete()
    .eq('id', categoriaId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao excluir: ${error.message}`)
  revalidatePath(`/configuracoes/fornecedores/${fornecedorId}`)
}

// Importar produtos para um fornecedor + categoria específica
type ProdutoImportadoCategoria = {
  nome: string
  descricao: string | null
  preco_unitario: number
  unidade: string
}

export async function importarProdutosParaCategoria(
  fornecedorId: string,
  categoriaId: string,
  produtos: ProdutoImportadoCategoria[]
) {
  const { supabase, perfil } = await getAdminOuGestor()

  const { data: fornecedor } = await supabase
    .from('suppliers')
    .select('id')
    .eq('id', fornecedorId)
    .eq('organization_id', perfil.organization_id)
    .single()
  if (!fornecedor) throw new Error('Fornecedor não encontrado.')

  const { data: categoria } = await supabase
    .from('supplier_categories')
    .select('id')
    .eq('id', categoriaId)
    .eq('supplier_id', fornecedorId)
    .eq('organization_id', perfil.organization_id)
    .single()
  if (!categoria) throw new Error('Categoria não encontrada.')

  if (!produtos || produtos.length === 0) throw new Error('Nenhum produto para importar.')
  if (produtos.length > 5000) throw new Error('Máximo de 5000 produtos por importação.')

  const BATCH_SIZE = 500
  let importados = 0

  for (let i = 0; i < produtos.length; i += BATCH_SIZE) {
    const lote = produtos.slice(i, i + BATCH_SIZE).map((p) => ({
      organization_id: perfil.organization_id,
      supplier_id: fornecedorId,
      category_id: categoriaId,
      nome: p.nome.trim(),
      descricao: p.descricao || null,
      preco_unitario: p.preco_unitario,
      unidade: p.unidade || 'un',
      ativo: true,
    }))

    const { error } = await supabase.from('products').insert(lote)
    if (error) throw new Error(`Erro ao importar lote: ${error.message}`)
    importados += lote.length
  }

  revalidatePath(`/configuracoes/fornecedores/${fornecedorId}`)
  revalidatePath('/configuracoes/produtos')
  return { importados }
}

// ── Transportadoras e Frete ────────────────────────────────────────────

type DadosTransportadora = {
  id: string | null
  nome: string
  fretes: { regiao: string; valor: number }[]
}

export async function salvarTransportadoras(fornecedorId: string, dados: DadosTransportadora[]) {
  const { supabase, perfil } = await getAdminOuGestor()

  const { count } = await supabase
    .from('suppliers')
    .select('id', { count: 'exact', head: true })
    .eq('id', fornecedorId)
    .eq('organization_id', perfil.organization_id)

  if (!count) throw new Error('Fornecedor não encontrado.')

  // Buscar transportadoras existentes
  const { data: existentes } = await supabase
    .from('freight_carriers')
    .select('id')
    .eq('supplier_id', fornecedorId)
    .eq('organization_id', perfil.organization_id)

  const idsExistentes = (existentes ?? []).map((e) => e.id)
  const idsEnviados = dados.filter((d) => d.id).map((d) => d.id!)
  const idsParaRemover = idsExistentes.filter((id) => !idsEnviados.includes(id))

  // Remover transportadoras que não estão mais na lista (cascade remove fretes)
  if (idsParaRemover.length > 0) {
    await supabase
      .from('freight_carriers')
      .delete()
      .in('id', idsParaRemover)
      .eq('organization_id', perfil.organization_id)
  }

  // Criar/atualizar transportadoras e seus fretes
  for (const item of dados) {
    let carrierId: string

    if (item.id) {
      // Atualizar nome
      await supabase
        .from('freight_carriers')
        .update({ nome: item.nome })
        .eq('id', item.id)
        .eq('organization_id', perfil.organization_id)
      carrierId = item.id
    } else {
      // Criar nova
      const { data: nova, error } = await supabase
        .from('freight_carriers')
        .insert({
          organization_id: perfil.organization_id,
          supplier_id: fornecedorId,
          nome: item.nome,
        })
        .select('id')
        .single()
      if (error || !nova) throw new Error('Erro ao criar transportadora.')
      carrierId = nova.id
    }

    // Limpar fretes antigos desta transportadora
    await supabase
      .from('supplier_freight')
      .delete()
      .eq('carrier_id', carrierId)
      .eq('organization_id', perfil.organization_id)

    // Inserir novos fretes
    const fretesParaInserir = item.fretes
      .filter((f) => f.valor > 0)
      .map((f) => ({
        organization_id: perfil.organization_id,
        supplier_id: fornecedorId,
        carrier_id: carrierId,
        regiao: f.regiao,
        valor: f.valor,
        atualizado_em: new Date().toISOString(),
      }))

    if (fretesParaInserir.length > 0) {
      await supabase.from('supplier_freight').insert(fretesParaInserir)
    }
  }

  revalidatePath(`/configuracoes/fornecedores/${fornecedorId}`)
}
