'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function getUsuarioEOrg() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()
  if (!perfil) redirect('/login')
  return { supabase, user, perfil }
}

async function resolverEmpresa(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organization_id: string,
  empresa_nome: string | null
): Promise<string | null> {
  if (!empresa_nome) return null

  const { data: existente } = await supabase
    .from('companies')
    .select('id')
    .eq('organization_id', organization_id)
    .ilike('nome', empresa_nome)
    .single()

  if (existente) return existente.id

  const { data: nova, error } = await supabase
    .from('companies')
    .insert({ organization_id, nome: empresa_nome })
    .select('id')
    .single()

  if (error) throw new Error(`Erro ao criar empresa: ${error.message}`)
  return nova.id
}

export async function criarContato(formData: FormData) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const nome = formData.get('nome') as string
  if (!nome?.trim()) throw new Error('O nome do contato é obrigatório.')
  const email = formData.get('email') as string | null
  const telefone = formData.get('telefone') as string | null
  const cargo = formData.get('cargo') as string | null
  const cpf_cnpj = formData.get('cpf_cnpj') as string | null
  const empresa_nome = formData.get('empresa_nome') as string | null
  const endereco = formData.get('endereco') as string | null
  const endereco_numero = formData.get('endereco_numero') as string | null
  const endereco_complemento = formData.get('endereco_complemento') as string | null
  const endereco_bairro = formData.get('endereco_bairro') as string | null
  const endereco_cep = formData.get('endereco_cep') as string | null
  const endereco_cidade = formData.get('endereco_cidade') as string | null
  const endereco_estado = formData.get('endereco_estado') as string | null
  const observacoes = formData.get('observacoes') as string | null

  const empresa_id = await resolverEmpresa(supabase, perfil.organization_id, empresa_nome)

  const { data: contato, error } = await supabase
    .from('contacts')
    .insert({
      organization_id: perfil.organization_id,
      nome,
      email: email || null,
      telefone: telefone || null,
      cargo: cargo || null,
      cpf_cnpj: cpf_cnpj || null,
      empresa_id,
      responsavel_id: perfil.id,
      endereco: endereco || null,
      endereco_numero: endereco_numero || null,
      endereco_complemento: endereco_complemento || null,
      endereco_bairro: endereco_bairro || null,
      endereco_cep: endereco_cep || null,
      endereco_cidade: endereco_cidade || null,
      endereco_estado: endereco_estado || null,
      observacoes: observacoes || null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Erro ao criar contato: ${error.message}`)

  await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: 'contato_criado',
    descricao: `Contato "${nome}" criado.`,
    contato_id: contato.id,
  })

  revalidatePath('/contatos')
  redirect(`/contatos/${contato.id}`)
}

export async function editarContato(contatoId: string, formData: FormData) {
  const { supabase, perfil } = await getUsuarioEOrg()

  // Buscar contato para verificar permissão
  const { data: contato } = await supabase
    .from('contacts')
    .select('id, nome, responsavel_id')
    .eq('id', contatoId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!contato) throw new Error('Contato não encontrado.')

  // RBAC: vendedor/atendimento só pode editar seus próprios contatos
  if (perfil.cargo !== 'admin' && perfil.cargo !== 'gestor') {
    if (contato.responsavel_id !== perfil.id) {
      throw new Error('Você só pode editar contatos sob sua responsabilidade.')
    }
  }

  const nome = formData.get('nome') as string
  if (!nome?.trim()) throw new Error('O nome do contato é obrigatório.')
  const email = formData.get('email') as string | null
  const telefone = formData.get('telefone') as string | null
  const cargo = formData.get('cargo') as string | null
  const cpf_cnpj = formData.get('cpf_cnpj') as string | null
  const empresa_nome = formData.get('empresa_nome') as string | null
  const observacoes = formData.get('observacoes') as string | null
  const tipo_pessoa = formData.get('tipo_pessoa') as string | null
  const categoria_cliente = formData.get('categoria_cliente') as string | null
  const tipo_conselho = formData.get('tipo_conselho') as string | null
  const numero_conselho = formData.get('numero_conselho') as string | null
  const uf_conselho = formData.get('uf_conselho') as string | null
  const especialidade = formData.get('especialidade') as string | null
  const endereco = formData.get('endereco') as string | null
  const endereco_numero = formData.get('endereco_numero') as string | null
  const endereco_complemento = formData.get('endereco_complemento') as string | null
  const endereco_bairro = formData.get('endereco_bairro') as string | null
  const endereco_cep = formData.get('endereco_cep') as string | null
  const endereco_cidade = formData.get('endereco_cidade') as string | null
  const endereco_estado = formData.get('endereco_estado') as string | null

  const empresa_id = await resolverEmpresa(supabase, perfil.organization_id, empresa_nome)

  const { error } = await supabase
    .from('contacts')
    .update({
      nome,
      email: email || null,
      telefone: telefone || null,
      cargo: cargo || null,
      cpf_cnpj: cpf_cnpj || null,
      empresa_id,
      observacoes: observacoes || null,
      tipo_pessoa: tipo_pessoa || null,
      categoria_cliente: categoria_cliente || null,
      tipo_conselho: tipo_conselho || null,
      numero_conselho: numero_conselho || null,
      uf_conselho: uf_conselho || null,
      especialidade: especialidade || null,
      endereco: endereco || null,
      endereco_numero: endereco_numero || null,
      endereco_complemento: endereco_complemento || null,
      endereco_bairro: endereco_bairro || null,
      endereco_cep: endereco_cep || null,
      endereco_cidade: endereco_cidade || null,
      endereco_estado: endereco_estado || null,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', contatoId).eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao editar contato: ${error.message}`)

  // Registrar atividade na timeline
  await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: 'contato_editado',
    descricao: `Contato "${nome}" atualizado.`,
    contato_id: contatoId,
  })

  revalidatePath('/contatos')
  revalidatePath(`/contatos/${contatoId}`)
}

export async function adicionarObservacaoContato(contatoId: string, texto: string) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const { data: contatoExiste } = await supabase
    .from('contacts')
    .select('id')
    .eq('id', contatoId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!contatoExiste) throw new Error('Contato não encontrado.')

  const { error: errAtividade } = await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: 'observacao',
    descricao: texto,
    contato_id: contatoId,
  })
  if (errAtividade) throw new Error(`Erro ao registrar observação: ${errAtividade.message}`)

  revalidatePath(`/contatos/${contatoId}`)
}

export async function excluirContato(contatoId: string) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const { data: perfilCompleto } = await supabase
    .from('profiles')
    .select('cargo')
    .eq('id', perfil.id)
    .single()

  if (perfilCompleto?.cargo !== 'admin') {
    throw new Error('Apenas administradores podem excluir contatos.')
  }

  // Usar admin client para limpar FKs (RLS pode bloquear registros de outros autores)
  const admin = createAdminClient()
  await admin.from('deals').update({ contato_id: null }).eq('contato_id', contatoId)
  await admin.from('tasks').update({ contato_id: null }).eq('contato_id', contatoId)
  await admin.from('activities').update({ contato_id: null }).eq('contato_id', contatoId)
  await admin.from('conversations').update({ contato_id: null }).eq('contato_id', contatoId)

  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', contatoId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao excluir contato: ${error.message}`)
  revalidatePath('/contatos')
}

export async function excluirContatosEmLote(ids: string[]) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const { data: perfilCompleto } = await supabase
    .from('profiles')
    .select('cargo')
    .eq('id', perfil.id)
    .single()

  if (perfilCompleto?.cargo !== 'admin') {
    throw new Error('Apenas administradores podem excluir contatos.')
  }

  if (!ids || ids.length === 0) throw new Error('Nenhum contato selecionado.')
  if (ids.length > 5000) throw new Error('Máximo de 5000 contatos por exclusão.')

  // Usar admin client para limpar FKs (RLS pode bloquear registros de outros autores)
  const admin = createAdminClient()
  const BATCH_SIZE = 100
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const lote = ids.slice(i, i + BATCH_SIZE)

    // Remover referências (setar contato_id = null)
    await admin.from('deals').update({ contato_id: null }).in('contato_id', lote)
    await admin.from('tasks').update({ contato_id: null }).in('contato_id', lote)
    await admin.from('activities').update({ contato_id: null }).in('contato_id', lote)
    await admin.from('conversations').update({ contato_id: null }).in('contato_id', lote)

    const { error } = await admin
      .from('contacts')
      .delete()
      .in('id', lote)
      .eq('organization_id', perfil.organization_id)

    if (error) throw new Error(`Erro ao excluir contatos: ${error.message}`)
  }
  revalidatePath('/contatos')
}

export async function converterContatoEmLead(contatoId: string) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const { data: contato } = await supabase
    .from('contacts')
    .select('id, nome, email, telefone, observacoes')
    .eq('id', contatoId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!contato) throw new Error('Contato não encontrado.')

  // Verificar se já existe lead com mesmo telefone ou email
  if (contato.telefone) {
    const { data: existente } = await supabase
      .from('leads')
      .select('id')
      .eq('organization_id', perfil.organization_id)
      .eq('telefone', contato.telefone)
      .limit(1)
      .single()

    if (existente) throw new Error('Já existe um lead com este telefone.')
  }

  const { data: lead, error } = await supabase.from('leads').insert({
    organization_id: perfil.organization_id,
    nome: contato.nome,
    email: contato.email,
    telefone: contato.telefone || null,
    origem: 'manual',
    status: 'novo',
    responsavel_id: perfil.id,
  }).select('id').single()

  if (error) throw new Error(`Erro ao criar lead: ${error.message}`)

  // Criar deal no pipeline (primeira etapa)
  const { data: pipeline } = await supabase
    .from('pipelines')
    .select('id')
    .eq('organization_id', perfil.organization_id)
    .eq('padrao', true)
    .eq('ativo', true)
    .limit(1)
    .single()

  if (pipeline) {
    const { data: primeiraEtapa } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('pipeline_id', pipeline.id)
      .eq('oculto', false)
      .is('tipo_especial', null)
      .order('ordem', { ascending: true })
      .limit(1)
      .single()

    if (primeiraEtapa) {
      await supabase.from('deals').insert({
        organization_id: perfil.organization_id,
        titulo: contato.nome,
        pipeline_id: pipeline.id,
        estagio_id: primeiraEtapa.id,
        lead_id: lead.id,
        contato_id: contatoId,
        responsavel_id: perfil.id,
      })
    }
  }

  await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: 'lead_criado',
    descricao: `Lead criado a partir do contato "${contato.nome}".`,
    contato_id: contatoId,
  })

  revalidatePath('/contatos')
  revalidatePath('/leads')
  revalidatePath('/pipeline')
  redirect('/leads')
}

type ContatoImportado = {
  nome: string
  telefone: string | null
  email: string | null
  endereco: string | null
  cpf_cnpj: string | null
}

export async function importarContatos(contatos: ContatoImportado[], modo: 'pular' | 'atualizar' = 'pular') {
  const { supabase, perfil } = await getUsuarioEOrg()

  if (!contatos || contatos.length === 0) {
    throw new Error('Nenhum contato para importar.')
  }

  if (contatos.length > 5000) {
    throw new Error('Máximo de 5000 contatos por importação.')
  }

  const validos = contatos.filter((c) => c.nome?.trim())
  if (validos.length === 0) {
    throw new Error('Nenhum contato válido encontrado (nome é obrigatório).')
  }

  // Buscar contatos existentes para detectar duplicados (por telefone ou email)
  const { data: existentes } = await supabase
    .from('contacts')
    .select('id, telefone, email')
    .eq('organization_id', perfil.organization_id)

  const telefoneMap = new Map<string, string>()
  const emailMap = new Map<string, string>()
  ;(existentes ?? []).forEach((c) => {
    if (c.telefone) telefoneMap.set(c.telefone.trim().toLowerCase(), c.id)
    if (c.email) emailMap.set(c.email.trim().toLowerCase(), c.id)
  })

  const novos: typeof validos = []
  const duplicados: { id: string; dados: ContatoImportado }[] = []

  for (const c of validos) {
    const tel = c.telefone?.trim().toLowerCase()
    const em = c.email?.trim().toLowerCase()
    const existenteId = (tel && telefoneMap.get(tel)) || (em && emailMap.get(em))

    if (existenteId) {
      duplicados.push({ id: existenteId, dados: c })
    } else {
      novos.push(c)
    }
  }

  let importados = 0
  let atualizados = 0
  let pulados = 0

  // Inserir novos em lotes
  const BATCH_SIZE = 500
  for (let i = 0; i < novos.length; i += BATCH_SIZE) {
    const lote = novos.slice(i, i + BATCH_SIZE).map((c) => ({
      organization_id: perfil.organization_id,
      nome: c.nome.trim(),
      telefone: c.telefone?.trim() || null,
      email: c.email?.trim() || null,
      endereco: c.endereco || null,
      cpf_cnpj: c.cpf_cnpj || null,
    }))

    const { error } = await supabase.from('contacts').insert(lote)
    if (error) throw new Error(`Erro ao importar lote: ${error.message}`)
    importados += lote.length
  }

  // Lidar com duplicados
  if (modo === 'atualizar') {
    for (const dup of duplicados) {
      await supabase
        .from('contacts')
        .update({
          nome: dup.dados.nome.trim(),
          telefone: dup.dados.telefone?.trim() || null,
          email: dup.dados.email?.trim() || null,
          endereco: dup.dados.endereco || null,
          cpf_cnpj: dup.dados.cpf_cnpj || null,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', dup.id)
        .eq('organization_id', perfil.organization_id)
      atualizados++
    }
  } else {
    pulados = duplicados.length
  }

  revalidatePath('/contatos')
  return { importados, atualizados, pulados }
}
