'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { criarModelo, editarModelo } from '@/app/(dashboard)/whatsapp/modelos/actions'
import type { MessageTemplate } from '@/types/database'

type Props = {
  aberto: boolean
  onFechar: () => void
  modelo?: MessageTemplate
}

export function ModalModelo({ aberto, onFechar, modelo }: Props) {
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setCarregando(true)
    setErro(null)
    try {
      if (modelo) {
        await editarModelo(modelo.id, formData)
      } else {
        await criarModelo(formData)
      }
      onFechar()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar modelo.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) onFechar() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{modelo ? 'Editar Modelo' : 'Novo Modelo de Mensagem'}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome_modelo">Nome *</Label>
            <Input id="nome_modelo" name="nome" defaultValue={modelo?.nome} placeholder="Ex: Saudação inicial" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="categoria_modelo">Categoria</Label>
            <Input id="categoria_modelo" name="categoria" defaultValue={modelo?.categoria ?? ''} placeholder="Ex: Saudação, Follow-up" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="conteudo_modelo">Mensagem *</Label>
            <Textarea
              id="conteudo_modelo"
              name="conteudo"
              defaultValue={modelo?.conteudo}
              rows={4}
              placeholder="Olá! Como posso ajudar?"
              required
            />
          </div>
          {erro && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button>
            <Button type="submit" disabled={carregando}>
              {carregando ? 'Salvando...' : modelo ? 'Salvar' : 'Criar Modelo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
