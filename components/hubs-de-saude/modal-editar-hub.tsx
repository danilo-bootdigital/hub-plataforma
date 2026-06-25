'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Pencil, Trash2 } from 'lucide-react'
import { editarHub, uploadLogoHub, removerLogoHub } from '@/app/(dashboard)/configuracoes/hubs-de-saude/actions'
import { UploadLogoHub } from './upload-logo-hub'

type Hub = {
  id: string
  nome: string
  status: string
  logo_url: string | null
}

type Props = {
  hub: Hub
}

export function ModalEditarHub({ hub }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isUploadingLogo, setIsUploadingLogo] = useTransition()
  const [nome, setNome] = useState(hub.nome)
  const [status, setStatus] = useState(hub.status)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const router = useRouter()

  function handleOpenChange(open: boolean) {
    setIsOpen(open)
    if (open) {
      setNome(hub.nome)
      setStatus(hub.status)
      setLogoFile(null)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) {
      toast.error('Nome é obrigatório.')
      return
    }
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.set('nome', nome.trim())
        formData.set('status', status)
        await editarHub(hub.id, formData)

        // Se tem novo logo para upload
        if (logoFile) {
          const logoFormData = new FormData()
          logoFormData.set('file', logoFile)
          await uploadLogoHub(hub.id, logoFormData)
        }

        toast.success('Hub atualizado.')
        setIsOpen(false)
        setLogoFile(null)
        router.refresh()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao atualizar hub.')
      }
    })
  }

  function handleRemoverLogo(e: React.MouseEvent) {
    e.preventDefault()
    if (!window.confirm('Remover logo deste hub?')) return
    setIsUploadingLogo(async () => {
      try {
        await removerLogoHub(hub.id)
        toast.success('Logo removido.')
        router.refresh()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao remover logo.')
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-slate-400 hover:text-blue-600"
        onClick={() => setIsOpen(true)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Hub de Saúde</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor={`nome-${hub.id}`}>Nome do Hub *</Label>
              <Input
                id={`nome-${hub.id}`}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Smart Health Company"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`status-${hub.id}`}>Status</Label>
              <select
                id={`status-${hub.id}`}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Logo do Hub</Label>
                {hub.logo_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={handleRemoverLogo}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Remover
                  </Button>
                )}
              </div>
              <UploadLogoHub
                onFileSelect={setLogoFile}
                previewUrl={hub.logo_url}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
