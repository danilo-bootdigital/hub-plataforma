'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Loader2 } from 'lucide-react'

type Props = {
  aberto: boolean
  onFechar: () => void
  vendedores: { id: string; nome: string }[]
}

export function ModalNovaInstancia({ aberto, onFechar, vendedores }: Props) {
  const [carregando, setCarregando] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    evolution_instance_name: '',
    vendedor_id: null as string | null,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('nome', formData.nome)
      formDataToSend.append('compartilhado', String(!formData.vendedor_id))
      if (formData.vendedor_id) {
        formDataToSend.append('vendedor_id', formData.vendedor_id)
      }

      const response = await fetch('/api/whatsapp/instances', {
        method: 'POST',
        body: formDataToSend,
      })

      if (response.ok) {
        onFechar()
        setFormData({ nome: '', evolution_instance_name: '', vendedor_id: '' })
      } else {
        const error = await response.json()
        alert('Erro: ' + error.error)
      }
    } catch (error) {
      alert('Erro ao criar instância')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={onFechar}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Instância WhatsApp</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome da Instância</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: WhatsApp Principal"
              required
            />
          </div>

          <div>
            <Label htmlFor="evolution_instance_name">Nome da Instância Evolution</Label>
            <Input
              id="evolution_instance_name"
              value={formData.evolution_instance_name}
              onChange={(e) => setFormData({ ...formData, evolution_instance_name: e.target.value })}
              placeholder="Ex: instance-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="vendedor_id">Vendedor Responsável</Label>
            <Select
              value={formData.vendedor_id}
              onValueChange={(value) => setFormData({ ...formData, vendedor_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um vendedor" />
              </SelectTrigger>
              <SelectContent>
                {vendedores.map((vendedor) => (
                  <SelectItem key={vendedor.id} value={vendedor.id}>
                    {vendedor.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={carregando}>
              {carregando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Instância
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}