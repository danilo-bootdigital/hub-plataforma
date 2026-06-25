'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Upload, X, ImageIcon } from 'lucide-react'

type Props = {
  onFileSelect: (file: File | null) => void
  previewUrl: string | null
}

export function UploadLogoHub({ onFileSelect, previewUrl }: Props) {
  const [preview, setPreview] = useState<string | null>(previewUrl)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File | null) {
    if (!file) {
      setPreview(null)
      onFileSelect(null)
      return
    }

    // Validar tipo
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato inválido. Use PNG, JPG ou WEBP.')
      return
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB.')
      return
    }

    // Criar preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    onFileSelect(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null
    handleFile(file)
  }

  function handleRemove() {
    setPreview(null)
    onFileSelect(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <Label>Logo do Hub (opcional)</Label>
      <div
        className={`relative rounded-lg border-2 border-dashed p-4 transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        {preview ? (
          <div className="flex items-center gap-4">
            <img
              src={preview}
              alt="Preview"
              className="h-16 w-16 rounded-lg object-cover border"
            />
            <div className="flex-1">
              <p className="text-sm text-slate-600">Logo selecionado</p>
              <p className="text-xs text-slate-400">PNG, JPG ou WEBP até 5MB</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleRemove()
              }}
              className="p-1 text-slate-400 hover:text-red-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-slate-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600">
                <span className="text-blue-600 font-medium">Clique para上传</span> ou arraste
              </p>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG ou WEBP até 5MB</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
