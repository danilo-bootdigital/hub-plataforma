'use client'

import { useState, useTransition, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Paperclip, X, FileText, Image, Mic, Smile } from 'lucide-react'
import { enviarMensagem, enviarMidia } from '@/app/(dashboard)/whatsapp/actions'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { SeletorRespostaRapida } from './seletor-resposta-rapida'
import { toast } from 'sonner'

type Props = {
  conversaId: string
  variaveis?: {
    nome?: string
    vendedor?: string
    empresa?: string
    telefone?: string
  }
  /** Desabilita o envio enquanto a conversa carrega. */
  disabled?: boolean
}

const ACCEPTED_TYPES = ['image/', 'audio/', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument']
const MAX_FILE_SIZE = 16 * 1024 * 1024

function isFileAccepted(file: File) {
  return ACCEPTED_TYPES.some((t) => file.type.startsWith(t))
}

function IconeArquivo({ tipo }: { tipo: string }) {
  if (tipo.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />
  if (tipo.startsWith('audio/')) return <Mic className="h-5 w-5 text-purple-500" />
  return <FileText className="h-5 w-5 text-red-500" />
}

export function FormEnvioMensagem({ conversaId, variaveis = {}, disabled = false }: Props) {
  const [texto, setTexto] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const selecionarArquivo = useCallback((file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande (máximo 16MB).')
      return
    }
    if (!isFileAccepted(file)) {
      toast.error('Tipo de arquivo não suportado.')
      return
    }
    setArquivo(file)
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file))
    } else {
      setPreviewUrl(null)
    }
  }, [])

  function limparArquivo() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setArquivo(null)
    setPreviewUrl(null)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnviar()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          selecionarArquivo(file)
          return
        }
      }
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) selecionarArquivo(file)
  }

  function handleEnviar() {
    if (!texto.trim() && !arquivo) return
    setErro(null)
    startTransition(async () => {
      try {
        if (arquivo) {
          const formData = new FormData()
          formData.set('file', arquivo)
          if (texto.trim()) formData.set('caption', texto.trim())
          await enviarMidia(conversaId, formData)
          limparArquivo()
          setTexto('')
          toast.success('Arquivo enviado.')
        } else {
          await enviarMensagem(conversaId, texto)
          setTexto('')
        }
      } catch (e: unknown) {
        if (isRedirectError(e)) throw e
        const msg = e instanceof Error ? e.message : 'Erro ao enviar.'
        setErro(msg)
        toast.error(msg)
      }
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    selecionarArquivo(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleRespostaRapida(textoModelo: string) {
    setTexto(textoModelo)
  }

  function handleEnviarRespostaRapida(textoModelo: string, arquivoAnexo: File | null) {
    setErro(null)
    startTransition(async () => {
      try {
        if (arquivoAnexo) {
          const formData = new FormData()
          formData.set('file', arquivoAnexo)
          if (textoModelo.trim()) formData.set('caption', textoModelo.trim())
          await enviarMidia(conversaId, formData)
          toast.success('Mensagem com arquivo enviada.')
        } else if (textoModelo.trim()) {
          await enviarMensagem(conversaId, textoModelo)
          toast.success('Mensagem enviada.')
        }
        setTexto('')
        limparArquivo()
      } catch (e: unknown) {
        if (isRedirectError(e)) throw e
        const msg = e instanceof Error ? e.message : 'Erro ao enviar.'
        setErro(msg)
        toast.error(msg)
      }
    })
  }

  return (
    <div
      ref={dropZoneRef}
      className={`border-t bg-white p-3 space-y-2 relative transition-colors ${isDragging ? 'bg-blue-50 border-blue-300' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-blue-50/80 border-2 border-dashed border-blue-400 rounded-md pointer-events-none">
          <p className="text-sm font-medium text-blue-600">Solte o arquivo aqui</p>
        </div>
      )}

      {erro && <p className="text-xs text-red-600">{erro}</p>}

      {arquivo && (
        <div className="flex items-center gap-2 rounded-md bg-slate-50 border border-slate-200 px-3 py-2">
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="h-10 w-10 rounded object-cover" />
          ) : (
            <IconeArquivo tipo={arquivo.type} />
          )}
          <span className="flex-1 text-xs text-slate-700 truncate">{arquivo.name}</span>
          <span className="text-[11px] text-slate-400">{(arquivo.size / 1024).toFixed(0)} KB</span>
          <button onClick={limparArquivo} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="relative flex items-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-slate-500"
          title="Emoji"
          disabled
        >
          <Smile className="h-5 w-5" />
        </Button>

        <SeletorRespostaRapida
          variaveis={variaveis}
          onSelecionar={handleRespostaRapida}
          onEnviarComArquivo={handleEnviarRespostaRapida}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-slate-500"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending || disabled}
          title="Anexar arquivo"
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
          onChange={handleFileChange}
          className="hidden"
        />

        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={arquivo ? 'Legenda (opcional)...' : 'Digite uma mensagem...'}
          rows={1}
          className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl bg-slate-50 px-4 py-2.5"
          disabled={isPending || disabled}
        />
        {texto.trim() || arquivo ? (
          <Button
            size="icon"
            onClick={handleEnviar}
            disabled={isPending || disabled}
            className="h-10 w-10 shrink-0 rounded-full"
            title="Enviar"
          >
            <Send className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-10 w-10 shrink-0 rounded-full text-slate-500"
            title="Gravar áudio"
            disabled
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  )
}
