'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  deal: { id: string; titulo: string; valor_estimado: number | null }
  aberto: boolean
  onConfirmar: (valorEstimado: number) => void
  onCancelar: () => void
}

export function ModalFechado({ deal, aberto, onConfirmar, onCancelar }: Props) {
  const [valor, setValor] = useState(
    deal.valor_estimado && deal.valor_estimado > 0
      ? deal.valor_estimado.toFixed(2)
      : ''
  )
  const [erro, setErro] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(valor.replace(',', '.'))
    if (isNaN(num) || num <= 0) {
      setErro('Informe um valor maior que zero.')
      return
    }
    onConfirmar(num)
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) onCancelar() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Fechar Negociação</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">
          Informe o valor final para fechar{' '}
          <span className="font-medium">{"\""}{deal.titulo}{"\""}</span>.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="valor_fechado">Valor fechado (R$)</Label>
            <Input
              id="valor_fechado"
              type="number"
              min="0.01"
              step="0.01"
              value={valor}
              onChange={(e) => { setValor(e.target.value); setErro(null) }}
              placeholder="0,00"
              required
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
            <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
              Fechar Negociação
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
