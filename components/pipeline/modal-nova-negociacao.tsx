'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { criarDeal } from '@/app/(dashboard)/pipeline/actions'

type Props = {
  pipelineId: string
  estagioId: string
  estagioNome: string
  aberto: boolean
  onFechar: () => void
}

export function ModalNovaNegociacao({ pipelineId, estagioId, estagioNome, aberto, onFechar }: Props) {
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    formData.set('pipeline_id', pipelineId)
    formData.set('estagio_id', estagioId)
    setCarregando(true)
    setErro(null)
    try {
      await criarDeal(formData)
      onFechar()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar negociação.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) onFechar() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Negociação — {estagioNome}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              name="titulo"
              placeholder="Ex: Proposta de licença anual"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor_estimado">Valor estimado (R$)</Label>
            <Input
              id="valor_estimado"
              name="valor_estimado"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_fechamento_prevista">Previsão de fechamento</Label>
            <Input
              id="data_fechamento_prevista"
              name="data_fechamento_prevista"
              type="date"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              name="observacoes"
              rows={2}
              placeholder="Detalhes relevantes sobre esta negociação..."
            />
          </div>

          {erro && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={carregando}>
              {carregando ? 'Criando...' : 'Criar Negociação'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
