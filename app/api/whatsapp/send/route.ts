'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enviarMensagemComRetry } from '@/lib/evolution'
import { revalidatePath } from 'next/cache'

interface SendMessageRequest {
  conversationId: string
  message: string
  type?: 'texto' | 'imagem' | 'audio' | 'documento'
  mediaBase64?: string
  mimeType?: string
  fileName?: string
  caption?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Buscar perfil do usuário
    const { data: perfil } = await supabase
      .from('profiles')
      .select('id, organization_id, cargo')
      .eq('id', user.id)
      .single()

    if (!perfil) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
    }

    const body = await request.json() as SendMessageRequest
    const { conversationId, message, type = 'texto', mediaBase64, mimeType, fileName, caption } = body

    if (!message.trim() && type === 'texto') {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 })
    }

    // Buscar conversa para obter telefone e instância
    const { data: conversa } = await supabase
      .from('conversations')
      .select(`
        id,
        telefone_externo,
        whatsapp_instance_id,
        whatsapp_instances:whatsapp_instances!whatsapp_instance_id(
          evolution_instance_name,
          status_conexao
        )
      `)
      .eq('id', conversationId)
      .eq('organization_id', perfil.organization_id)
      .single()

    if (!conversa) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })
    }

    const instance = conversa.whatsapp_instances?.[0]
    if (!instance?.evolution_instance_name) {
      return NextResponse.json({ error: 'Instância do WhatsApp não configurada' }, { status: 400 })
    }

    if (instance.status_conexao !== 'conectado') {
      return NextResponse.json({ error: 'Instância não está conectada' }, { status: 400 })
    }

    // Validar campos mídia
    if (type !== 'texto' && (!mediaBase64 || !mimeType)) {
      return NextResponse.json({ error: 'Mídia e mimeType são obrigatórios para este tipo de mensagem' }, { status: 400 })
    }

    if (type === 'documento' && !fileName) {
      return NextResponse.json({ error: 'FileName é obrigatório para documentos' }, { status: 400 })
    }

    // Enviar mensagem via Evolution API
    const messageId = await enviarMensagemComRetry(
      instance.evolution_instance_name,
      conversa.telefone_externo,
      type,
      message.trim(),
      mediaBase64,
      mimeType,
      fileName,
      caption
    )

    // Registrar mensagem enviada no banco
    const { error: msgError } = await supabase.from('messages').insert({
      organization_id: perfil.organization_id,
      conversation_id: conversationId,
      message_id_externo: messageId,
      direcao: 'enviada',
      tipo_midia: type,
      conteudo: message.trim(),
      url_midia: type !== 'texto' ? `media://${messageId}` : null,
      telefone_remetente: null,
      telefone_destinatario: conversa.telefone_externo,
      responsavel_id: perfil.id,
      status: 'enviada',
      enviado_em: new Date().toISOString(),
    })

    if (msgError) {
      console.error('Erro ao registrar mensagem enviada:', msgError)
      // Não falha o envio só por erro de registro
    }

    // Registrar atividade
    await supabase.from('activities').insert({
      organization_id: perfil.organization_id,
      tipo: 'mensagem_enviada',
      descricao: `Mensagem enviada para ${conversa.telefone_externo}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
      conversation_id: conversationId,
      autor_id: perfil.id,
    })

    // Atualizar status da conversa
    await supabase
      .from('conversations')
      .update({
        status: 'em_atendimento',
        ultima_mensagem_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      })
      .eq('id', conversationId)

    revalidatePath(`/whatsapp/${conversationId}`)

    return NextResponse.json({
      success: true,
      messageId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Erro ao enviar mensagem:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}