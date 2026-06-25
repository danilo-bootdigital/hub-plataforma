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
import { Plus } from 'lucide-react'
import { criarHub, uploadLogoHub } from '@/app/(dashboard)/configuracoes/hubs-de-saude/actions'
import { UploadLogoHub } from './upload-logo-hub'

export function ModalNovoHub() {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [nome, setNome] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const router = useRouter()

  function handleOpenChange(open: boolean) {
    setIsOpen(open)
    if (!open) {
      setNome('')
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
        const hub = await criarHub(formData)

        // Se tiver logo, fazer upload após criar o hub
        if (logoFile) {
          const logoFormData = new FormData()
          logoFormData.set('file', logoFile)
          await uploadLogoHub(hub.id, logoFormData)
        }

        toast.success('Hub criado com sucesso.')
        setIsOpen(false)
        setNome('')
        setLogoFile(null)
        router.refresh()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao criar hub.')
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <Button onClick={() => setIsOpen(true)} className="gap-1">
        <Plus className="h-4 w-4" />
        Novo Hub
      </Button>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Novo Hub de Saúde</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Hub *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Smart Health Company"
                autoFocus
              />
            </div>
            <UploadLogoHub
              onFileSelect={setLogoFile}
              previewUrl={null}
            />
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
