'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { criarTarefa } from '@/app/(dashboard)/tarefas/actions'
import type { TaskTipo } from '@/types/database'

type Props = {
  tarefaAnterior: {
    tipo: TaskTipo
    lead_id: string | null
    contato_id: string | null
    deal_id: string | null
    responsavel_id: string
  }
  aberto: boolean
  onFechar: () => void
}

const TIPOS_TAREFA: { valor: TaskTipo; label: string }[] = [
  { valor: 'ligacao', label: 'Ligação' },
  { valor: 'email', label: 'E-mail' },
  { valor: 'reuniao', label: 'Reunião' },
  { valor: 'whatsapp', label: 'WhatsApp' },
]

export function ModalProximoFollowUp({ tarefaAnterior, aberto, onFechar }: Props) {
  const [tipo, setTipo] = useState<TaskTipo>(tarefaAnterior.tipo)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    formData.set('tipo', tipo)
    formData.set('responsavel_id', tarefaAnterior.responsavel_id)
    if (tarefaAnterior.lead_id) formData.set('lead_id', tarefaAnterior.lead_id)
    if (tarefaAnterior.contato_id) formData.set('contato_id', tarefaAnterior.contato_id)
    if (tarefaAnterior.deal_id) formData.set('deal_id', tarefaAnterior.deal_id)

    setCarregando(true)
    setErro(null)
    try {
      await criarTarefa(formData)
      onFechar()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar próximo follow-up.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) onFechar() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar próximo follow-up?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">
          Tarefa concluída! Deseja agendar um próximo contato?
        </p>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo_followup">Título *</Label>
            <Input
              id="titulo_followup"
              name="titulo"
              placeholder="Ex: Retornar ligação"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo((v ?? tarefaAnterior.tipo) as TaskTipo)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_TAREFA.map((t) => (
                    <SelectItem key={t.valor} value={t.valor}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_followup">Vencimento</Label>
              <Input
                id="data_followup"
                name="data_vencimento"
                type="date"
              />
            </div>
          </div>

          {erro && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onFechar}>
              Não, obrigado
            </Button>
            <Button type="submit" disabled={carregando}>
              {carregando ? 'Criando...' : 'Criar Follow-up'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
