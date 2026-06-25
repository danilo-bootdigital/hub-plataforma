'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Props = {
  deal: { id: string; titulo: string }
  aberto: boolean
  onConfirmar: (motivoPerda: string) => void
  onCancelar: () => void
}

export function ModalPerdido({ deal, aberto, onConfirmar, onCancelar }: Props) {
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!motivo.trim()) {
      setErro('Informe o motivo da perda.')
      return
    }
    onConfirmar(motivo.trim())
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) onCancelar() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar Perda</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">
          Informe o motivo para{' '}
          <span className="font-medium">{`"{deal.titulo}"`}</span> ser marcada como perdida.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="motivo_perda">Motivo da perda</Label>
            <Textarea
              id="motivo_perda"
              value={motivo}
              onChange={(e) => { setMotivo(e.target.value); setErro(null) }}
              rows={3}
              placeholder="Ex: Cliente escolheu concorrente, orçamento acima do esperado..."
              autoFocus
            />
          </div>
          {erro && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancelar}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive">
              Registrar Perda
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
