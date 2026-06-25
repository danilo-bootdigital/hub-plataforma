'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { criarTarefa } from '@/app/(dashboard)/tarefas/actions'
import type { TaskTipo, UserRole } from '@/types/database'

type Vendedor = { id: string; nome: string }

type Props = {
  aberto: boolean
  onFechar: () => void
  cargo: UserRole
  vendedores: Vendedor[]
  perfilId: string
  leadId?: string
  contatoId?: string
  dealId?: string
}

const TIPOS_TAREFA: { valor: TaskTipo; label: string }[] = [
  { valor: 'ligacao', label: 'Ligação' },
  { valor: 'email', label: 'E-mail' },
  { valor: 'reuniao', label: 'Reunião' },
  { valor: 'whatsapp', label: 'WhatsApp' },
]

export function ModalNovaTarefa({
  aberto,
  onFechar,
  cargo,
  vendedores,
  perfilId,
  leadId,
  contatoId,
  dealId,
}: Props) {
  const [tipo, setTipo] = useState<TaskTipo>('ligacao')
  const [responsavelId, setResponsavelId] = useState(perfilId)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const podeEscolherResponsavel = cargo === 'admin' || cargo === 'gestor'

  async function handleSubmit(formData: FormData) {
    formData.set('tipo', tipo)
    if (podeEscolherResponsavel) formData.set('responsavel_id', responsavelId)
    if (leadId) formData.set('lead_id', leadId)
    if (contatoId) formData.set('contato_id', contatoId)
    if (dealId) formData.set('deal_id', dealId)

    setCarregando(true)
    setErro(null)
    try {
      await criarTarefa(formData)
      onFechar()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar tarefa.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) onFechar() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo_tarefa">Título *</Label>
            <Input
              id="titulo_tarefa"
              name="titulo"
              placeholder="Ex: Ligar para confirmar reunião"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TaskTipo)}>
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
              <Label htmlFor="data_vencimento_tarefa">Vencimento</Label>
              <Input
                id="data_vencimento_tarefa"
                name="data_vencimento"
                type="date"
              />
            </div>
          </div>

          {podeEscolherResponsavel && vendedores.length > 0 && (
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={responsavelId} onValueChange={(v) => setResponsavelId(v ?? perfilId)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vendedores.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="descricao_tarefa">Descrição</Label>
            <Textarea
              id="descricao_tarefa"
              name="descricao"
              rows={2}
              placeholder="Detalhes adicionais sobre esta tarefa..."
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
              {carregando ? 'Criando...' : 'Criar Tarefa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
