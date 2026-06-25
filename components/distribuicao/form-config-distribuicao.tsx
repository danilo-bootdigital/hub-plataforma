'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { salvarConfigDistribuicao } from '@/app/(dashboard)/configuracoes/distribuicao/actions'
import type { DistribuicaoModo } from '@/types/database'

type Props = {
  config: {
    modo: DistribuicaoModo
    apenas_disponiveis: boolean
    limite_por_vendedor: number | null
  }
}

const MODOS: { valor: DistribuicaoModo; label: string; descricao: string }[] = [
  {
    valor: 'manual',
    label: 'Manual',
    descricao: 'Leads criados sem responsável. Atribuição feita manualmente pelo gestor ou admin.',
  },
  {
    valor: 'rotativo',
    label: 'Rotativo',
    descricao: 'Leads distribuídos em sequência circular entre os vendedores elegíveis.',
  },
  {
    valor: 'por_carga',
    label: 'Por carga de trabalho',
    descricao: 'Lead atribuído ao vendedor com menos leads abertos no momento.',
  },
]

export function FormConfigDistribuicao({ config }: Props) {
  const [modo, setModo] = useState<DistribuicaoModo>(config.modo)
  const [apenasDisponiveis, setApenasDisponiveis] = useState(config.apenas_disponiveis)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  const descricaoModo = MODOS.find((m) => m.valor === modo)?.descricao ?? ''

  async function handleSubmit(formData: FormData) {
    formData.set('modo', modo)
    setCarregando(true)
    setErro(null)
    setSucesso(false)
    try {
      await salvarConfigDistribuicao(formData)
      setSucesso(true)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar configuração.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>Modo de distribuição</Label>
        <Select
          value={modo}
          onValueChange={(v) => setModo((v || 'manual') as DistribuicaoModo)}
        >
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODOS.map((m) => (
              <SelectItem key={m.valor} value={m.valor}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {descricaoModo && (
          <p className="text-sm text-slate-500">{descricaoModo}</p>
        )}
      </div>

      {modo !== 'manual' && (
        <>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="apenas_disponiveis"
              name="apenas_disponiveis"
              checked={apenasDisponiveis}
              onChange={(e) => setApenasDisponiveis(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <Label htmlFor="apenas_disponiveis" className="cursor-pointer">
              Atribuir apenas a vendedores disponíveis
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="limite_por_vendedor">
              Limite de leads abertos por vendedor{' '}
              <span className="text-slate-400 font-normal">(opcional)</span>
            </Label>
            <Input
              id="limite_por_vendedor"
              name="limite_por_vendedor"
              type="number"
              min="1"
              defaultValue={config.limite_por_vendedor ?? ''}
              placeholder="Sem limite"
              className="max-w-xs"
            />
            <p className="text-sm text-slate-500">
              Vendedores que atingirem este limite não receberão novos leads.
            </p>
          </div>
        </>
      )}

      {erro && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</div>
      )}
      {sucesso && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Configuração salva com sucesso.
        </div>
      )}

      <Button type="submit" disabled={carregando}>
        {carregando ? 'Salvando...' : 'Salvar configuração'}
      </Button>
    </form>
  )
}
