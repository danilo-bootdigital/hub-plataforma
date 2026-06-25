'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Send, Paperclip, Image, Mic } from 'lucide-react'
import { toast } from 'sonner'

interface SendMessageFormProps {
  conversationId: string
  onMessageSent?: () => void
}

export function SendMessageForm({ conversationId, onMessageSent }: SendMessageFormProps) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [mediaType, setMediaType] = useState<'text' | 'image' | 'audio' | 'document'>('text')
  const [mediaBase64, setMediaBase64] = useState('')
  const [mediaFileName, setMediaFileName] = useState('')
  const [mediaMimeType, setMediaMimeType] = useState('')
  
  const handleSend = async () => {
    if (!message.trim() && mediaType === 'text') {
      toast.error('Digite uma mensagem para enviar', { description: 'Erro' })
      return
    }

    setSending(true)

    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          message: message.trim(),
          type: mediaType,
          mediaBase64: mediaBase64 || undefined,
          mimeType: mediaMimeType || undefined,
          fileName: mediaFileName || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar mensagem')
      }

      // Limpar formulário
      setMessage('')
      setMediaType('text')
      setMediaBase64('')
      setMediaFileName('')
      setMediaMimeType('')

      toast.success('Mensagem enviada com sucesso', { description: 'Sucesso' })

      onMessageSent?.()
    } catch (error) {
      toast.error('', { description: 'Erro ao enviar' })
    } finally {
      setSending(false)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tamanho do arquivo (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('O arquivo deve ter no máximo 10MB', { description: 'Arquivo muito grande' })
      return
    }

    // Converter para base64
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(',')[1]
      setMediaBase64(base64)
      setMediaFileName(file.name)
      setMediaMimeType(file.type)
      setMediaType(file.type.startsWith('image/') ? 'image' :
                   file.type.startsWith('audio/') ? 'audio' : 'document')
    }
    reader.readAsDataURL(file)
  }

  const isText = mediaType === 'text'
  const hasMedia = mediaType !== 'text' && mediaBase64

  return (
    <div className="border-t p-4">
      <div className="flex gap-2 mb-2">
        <Button
          variant={isText ? "default" : "ghost"}
          size="sm"
          onClick={() => setMediaType('text')}
        >
          <Send className="h-4 w-4 mr-1" />
          Texto
        </Button>
        <Button
          variant={mediaType === 'image' ? "default" : "ghost"}
          size="sm"
          onClick={() => setMediaType('image')}
        >
          <Image className="h-4 w-4 mr-1" />
          Imagem
        </Button>
        <Button
          variant={mediaType === 'audio' ? "default" : "ghost"}
          size="sm"
          onClick={() => setMediaType('audio')}
        >
          <Mic className="h-4 w-4 mr-1" />
          Áudio
        </Button>
        <Button
          variant={mediaType === 'document' ? "default" : "ghost"}
          size="sm"
          onClick={() => setMediaType('document')}
        >
          <Paperclip className="h-4 w-4 mr-1" />
          Documento
        </Button>
        <input
          type="file"
          accept={mediaType === 'image' ? 'image/*' :
                  mediaType === 'audio' ? 'audio/*' :
                  mediaType === 'document' ? 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document' : ''}
          onChange={handleFileSelect}
          className="hidden"
          id="file-input"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
      </div>

      {mediaType === 'text' ? (
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Digite sua mensagem..."
          className="min-h-[60px] resize-none"
          maxLength={4096}
        />
      ) : (
        <div className="space-y-2">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              {mediaFileName || 'Arquivo selecionado'}
            </p>
            <p className="text-xs text-gray-500">
              {mediaMimeType}
            </p>
          </div>
          {(mediaType === 'image' || mediaType === 'document') && (
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite uma legenda (opcional)..."
              className="min-h-[60px] resize-none"
              maxLength={1000}
            />
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <div className="text-xs text-gray-500">
          {message.length}/4096 caracteres
          {hasMedia && ` • ${(mediaBase64.length * 0.75 / 1024).toFixed(1)} KB`}
        </div>
        <Button
          onClick={handleSend}
          disabled={sending || (isText && !message.trim()) || (!isText && !mediaBase64)}
          className="min-w-[100px]"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          {sending ? 'Enviando...' : 'Enviar'}
        </Button>
      </div>
    </div>
  )
}