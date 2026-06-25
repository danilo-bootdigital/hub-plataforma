'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { editarFornecedor } from '@/app/(dashboard)/configuracoes/fornecedores/actions'

type Hub = {
  id: string
  nome: string
}

type FornecedorComHub = {
  id: string
  nome: string
  hub_id: string | null
  health_hubs?: {
    id: string
    nome: string
  } | null
}

type Props = {
  fornecedor: FornecedorComHub
  hubs: Hub[]
}

export function HubSelector({ fornecedor, hubs }: Props) {
  const [isPending, startTransition] = useTransition()
  const [hubId, setHubId] = useState(fornecedor.hub_id ?? '')
  const router = useRouter()

  function handleSave() {
    startTransition(async () => {
      try {
        await editarFornecedor(fornecedor.id, fornecedor.nome, hubId || null)
        toast.success('Hub atualizado.')
        router.refresh()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao atualizar.')
      }
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Hub de Saúde</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="hub">Vincular a um Hub</Label>
          <select
            id="hub"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
            value={hubId}
            onChange={(e) => setHubId(e.target.value)}
          >
            <option value="">Nenhum hub</option>
            {hubs.map((hub) => (
              <option key={hub.id} value={hub.id}>
                {hub.nome}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            Associe este fornecedor a um hub de saúde parceiro.
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isPending || hubId === (fornecedor.hub_id ?? '')}
        >
          {isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </CardContent>
    </Card>
  )
}
