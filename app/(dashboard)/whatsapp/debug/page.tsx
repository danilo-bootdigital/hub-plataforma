import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

type DiagnosticoStep = {
  nome: string
  status: 'pendente' | 'ok' | 'erro'
  dados?: any
  erro?: string
}

async function Step1_LayoutVazio() {
  return (
    <div className="p-4 border-b border-green-200 bg-green-50">
      <span className="text-green-600 font-bold">✓</span> Step 1: Layout vazio renderizado
    </div>
  )
}

async function Step2_Usuario() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) throw new Error(error.message)
    if (!user) throw new Error('Usuário não encontrado')

    return (
      <div className="p-4 border-b border-green-200 bg-green-50">
        <span className="text-green-600 font-bold">✓</span> Step 2: Usuário OK
        <pre className="text-xs mt-1 text-green-700">ID: {user.id}</pre>
      </div>
    )
  } catch (e: any) {
    return (
      <div className="p-4 border-b border-red-200 bg-red-50">
        <span className="text-red-600 font-bold">✗</span> Step 2: ERRO
        <pre className="text-xs mt-1 text-red-700">{e.message}</pre>
      </div>
    )
  }
}

async function Step3_Perfil() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return (
      <div className="p-4 border-b border-yellow-200 bg-yellow-50">
        <span className="text-yellow-600 font-bold">⏭</span> Step 3: Pulou (sem usuário)
      </div>
    )

    const { data: perfil, error } = await supabase
      .from('profiles')
      .select('id, cargo, organization_id')
      .eq('id', user.id)
      .single()

    if (error) throw new Error(error.message)
    if (!perfil) throw new Error('Perfil não encontrado')

    return (
      <div className="p-4 border-b border-green-200 bg-green-50">
        <span className="text-green-600 font-bold">✓</span> Step 3: Perfil OK
        <pre className="text-xs mt-1 text-green-700">
          ID: {perfil.id}{'\n'}
          Cargo: {perfil.cargo}{'\n'}
          Org: {perfil.organization_id}
        </pre>
      </div>
    )
  } catch (e: any) {
    return (
      <div className="p-4 border-b border-red-200 bg-red-50">
        <span className="text-red-600 font-bold">✗</span> Step 3: ERRO
        <pre className="text-xs mt-1 text-red-700">{e.message}</pre>
      </div>
    )
  }
}

async function Step4_Instancias() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return (
      <div className="p-4 border-b border-yellow-200 bg-yellow-50">
        <span className="text-yellow-600 font-bold">⏭</span> Step 4: Pulou
      </div>
    )

    const { data: perfil } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!perfil) throw new Error('Perfil não encontrado')

    const { data: instancias, error } = await supabase
      .from('whatsapp_instances')
      .select('id, nome, status_conexao')
      .eq('organization_id', perfil.organization_id)

    if (error) throw new Error(error.message)

    return (
      <div className="p-4 border-b border-green-200 bg-green-50">
        <span className="text-green-600 font-bold">✓</span> Step 4: Instâncias OK
        <pre className="text-xs mt-1 text-green-700">
          Quantidade: {instancias?.length || 0}
        </pre>
      </div>
    )
  } catch (e: any) {
    return (
      <div className="p-4 border-b border-red-200 bg-red-50">
        <span className="text-red-600 font-bold">✗</span> Step 4: ERRO
        <pre className="text-xs mt-1 text-red-700">{e.message}</pre>
      </div>
    )
  }
}

async function Step5_Conversations() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return (
      <div className="p-4 border-b border-yellow-200 bg-yellow-50">
        <span className="text-yellow-600 font-bold">⏭</span> Step 5: Pulou
      </div>
    )

    const { data: perfil } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!perfil) throw new Error('Perfil não encontrado')

    const { data: conversas, error, status } = await supabase
      .from('conversations')
      .select('id, telefone_externo, ultima_mensagem_em, status')
      .eq('organization_id', perfil.organization_id)
      .order('ultima_mensagem_em', { ascending: false })
      .limit(10)

    if (error) {
      return (
        <div className="p-4 border-b border-red-200 bg-red-50">
          <span className="text-red-600 font-bold">✗</span> Step 5: ERRO na query
          <pre className="text-xs mt-1 text-red-700">
            Erro: {error.message}{'\n'}
            Detalhes: {JSON.stringify(error)}
          </pre>
        </div>
      )
    }

    return (
      <div className="p-4 border-b border-green-200 bg-green-50">
        <span className="text-green-600 font-bold">✓</span> Step 5: Conversations OK
        <pre className="text-xs mt-1 text-green-700">
          Quantidade: {conversas?.length || 0}
        </pre>
      </div>
    )
  } catch (e: any) {
    return (
      <div className="p-4 border-b border-red-200 bg-red-50">
        <span className="text-red-600 font-bold">✗</span> Step 5: ERRO
        <pre className="text-xs mt-1 text-red-700">{e.message}</pre>
      </div>
    )
  }
}

async function Step6_ListaConversas() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return (
      <div className="p-4 border-b border-yellow-200 bg-yellow-50">
        <span className="text-yellow-600 font-bold">⏭</span> Step 6: Pulou
      </div>
    )

    const { data: perfil } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!perfil) throw new Error('Perfil não encontrado')

    // Query idêntica à página principal
    const { data: conversas, error } = await supabase
      .from('conversations')
      .select(`
        id,
        telefone_externo,
        ultima_mensagem_em,
        status,
        responsavel_id,
        responsavel:profiles!responsavel_id(nome),
        lead:leads!lead_id(id, nome, telefone),
        contato:contacts!contato_id(id, nome, telefone),
        instancia:whatsapp_instances!whatsapp_instance_id(nome),
        nome_contato,
        name_source,
        whatsapp_push_name,
        is_name_manually_edited
      `)
      .eq('organization_id', perfil.organization_id)
      .order('ultima_mensagem_em', { ascending: false, nullsFirst: false })
      .limit(10)

    if (error) {
      return (
        <div className="p-4 border-b border-red-200 bg-red-50">
          <span className="text-red-600 font-bold">✗</span> Step 6: ERRO na query completa
          <pre className="text-xs mt-1 text-red-700">
            Erro: {error.message}{'\n'}
            Código: {error.code}{'\n'}
            Detalhes: {JSON.stringify(error, null, 2)}
          </pre>
        </div>
      )
    }

    return (
      <div className="p-4 border-b border-green-200 bg-green-50">
        <span className="text-green-600 font-bold">✓</span> Step 6: Query completa OK
        <pre className="text-xs mt-1 text-green-700">
          Quantidade: {conversas?.length || 0}
        </pre>
      </div>
    )
  } catch (e: any) {
    return (
      <div className="p-4 border-b border-red-200 bg-red-50">
        <span className="text-red-600 font-bold">✗</span> Step 6: ERRO
        <pre className="text-xs mt-1 text-red-700">{e.message}</pre>
      </div>
    )
  }
}

async function Step7_Tags() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return (
      <div className="p-4 border-b border-yellow-200 bg-yellow-50">
        <span className="text-yellow-600 font-bold">⏭</span> Step 7: Pulou
      </div>
    )

    const { data: perfil } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!perfil) throw new Error('Perfil não encontrado')

    const { data: tags, error } = await supabase
      .from('conversation_tags')
      .select('id, nome, cor')
      .eq('organization_id', perfil.organization_id)
      .order('nome')

    if (error) throw new Error(error.message)

    return (
      <div className="p-4 border-b border-green-200 bg-green-50">
        <span className="text-green-600 font-bold">✓</span> Step 7: Tags OK
        <pre className="text-xs mt-1 text-green-700">
          Quantidade: {tags?.length || 0}
        </pre>
      </div>
    )
  } catch (e: any) {
    return (
      <div className="p-4 border-b border-red-200 bg-red-50">
        <span className="text-red-600 font-bold">✗</span> Step 7: ERRO
        <pre className="text-xs mt-1 text-red-700">{e.message}</pre>
      </div>
    )
  }
}

export default async function WhatsAppDebugPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-2xl font-bold mb-6">WhatsApp Debug - Diagnóstico</h1>

      <div className="max-w-4xl space-y-2">
        <div className="p-4 border-b border-gray-200">
          <span className="text-gray-600 font-bold">Etapa 0:</span> Autenticação
          <pre className="text-xs mt-1">Usuário logado: {user?.id || 'N/A'}</pre>
        </div>

        <Suspense fallback={<div className="p-4">Carregando...</div>}>
          <Step2_Usuario />
          <Step3_Perfil />
          <Step4_Instancias />
          <Step5_Conversations />
          <Step6_ListaConversas />
          <Step7_Tags />
        </Suspense>
      </div>
    </div>
  )
}