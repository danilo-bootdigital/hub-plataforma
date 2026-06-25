'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Truck, Save, Plus, Trash2 } from 'lucide-react'
import { salvarTransportadoras } from '@/app/(dashboard)/configuracoes/fornecedores/actions'

type FreteItem = {
  carrier_id: string
  regiao: string
  valor: number
}

type Transportadora = {
  id: string
  nome: string
}

type LinhaFrete = {
  key: string
  regiao: string
  valor: string
}

type TransportadoraLocal = {
  id: string
  nome: string
  linhas: LinhaFrete[]
}

type Props = {
  fornecedorId: string
  transportadoras: Transportadora[]
  fretes: FreteItem[]
}

export function TabelaFrete({ fornecedorId, transportadoras, fretes }: Props) {
  const [abas, setAbas] = useState<TransportadoraLocal[]>(() => {
    if (transportadoras.length === 0) return []
    return transportadoras.map((t) => {
      const fretesCarrier = fretes.filter((f) => f.carrier_id === t.id)
      return {
        id: t.id,
        nome: t.nome,
        linhas: fretesCarrier.length > 0
          ? fretesCarrier.map((f, i) => ({ key: `${t.id}-${i}`, regiao: f.regiao, valor: f.valor.toString() }))
          : [{ key: `${t.id}-0`, regiao: '', valor: '' }],
      }
    })
  })
  const [abaAtiva, setAbaAtiva] = useState(abas[0]?.id ?? '')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function adicionarTransportadora() {
    const novaId = `nova-${Date.now()}`
    const nova: TransportadoraLocal = {
      id: novaId,
      nome: '',
      linhas: [{ key: `${novaId}-0`, regiao: '', valor: '' }],
    }
    setAbas((prev) => [...prev, nova])
    setAbaAtiva(novaId)
  }

  function removerTransportadora(id: string) {
    setAbas((prev) => {
      const novas = prev.filter((a) => a.id !== id)
      if (abaAtiva === id) setAbaAtiva(novas[0]?.id ?? '')
      return novas
    })
  }

  function atualizarNome(id: string, nome: string) {
    setAbas((prev) => prev.map((a) => (a.id === id ? { ...a, nome } : a)))
  }

  function adicionarLinha(transportadoraId: string) {
    setAbas((prev) => prev.map((a) => {
      if (a.id !== transportadoraId) return a
      return { ...a, linhas: [...a.linhas, { key: `${transportadoraId}-${Date.now()}`, regiao: '', valor: '' }] }
    }))
  }

  function removerLinha(transportadoraId: string, key: string) {
    setAbas((prev) => prev.map((a) => {
      if (a.id !== transportadoraId) return a
      return { ...a, linhas: a.linhas.filter((l) => l.key !== key) }
    }))
  }

  function atualizarLinha(transportadoraId: string, key: string, campo: 'regiao' | 'valor', valor: string) {
    setAbas((prev) => prev.map((a) => {
      if (a.id !== transportadoraId) return a
      return { ...a, linhas: a.linhas.map((l) => (l.key === key ? { ...l, [campo]: valor } : l)) }
    }))
  }

  function handleSalvar() {
    const abasSemNome = abas.filter((a) => !a.nome.trim())
    if (abasSemNome.length > 0) {
      toast.error('Todas as transportadoras precisam de um nome.')
      return
    }

    const dados = abas.map((a) => ({
      id: a.id.startsWith('nova-') ? null : a.id,
      nome: a.nome.trim(),
      fretes: a.linhas
        .filter((l) => l.regiao.trim())
        .map((l) => ({ regiao: l.regiao.trim(), valor: parseFloat(l.valor || '0') || 0 })),
    }))

    startTransition(async () => {
      try {
        await salvarTransportadoras(fornecedorId, dados)
        toast.success('Transportadoras e fretes salvos.')
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao salvar.')
      }
    })
  }

  const abaAtual = abas.find((a) => a.id === abaAtiva)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Truck className="h-4 w-4" />
          Tabela de Frete
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Abas */}
          <div className="flex items-center gap-2 flex-wrap border-b pb-2">
            {abas.map((aba) => (
              <button
                key={aba.id}
                type="button"
                onClick={() => setAbaAtiva(aba.id)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  abaAtiva === aba.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {aba.nome || 'Nova transportadora'}
              </button>
            ))}
            <Button variant="outline" size="sm" className="gap-1 h-8" onClick={adicionarTransportadora}>
              <Plus className="h-3.5 w-3.5" />
              Transportadora
            </Button>
          </div>

          {/* Conteúdo da aba ativa */}
          {abaAtual && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Input
                  className="h-9 text-sm max-w-[260px] font-medium"
                  placeholder="Nome da transportadora (ex: Jadlog)"
                  value={abaAtual.nome}
                  onChange={(e) => atualizarNome(abaAtual.id, e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-600 gap-1"
                  onClick={() => removerTransportadora(abaAtual.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover
                </Button>
              </div>

              <div className="space-y-2">
                {abaAtual.linhas.map((linha) => (
                  <div key={linha.key} className="flex items-center gap-3">
                    <Input
                      className="h-9 text-sm flex-1 max-w-[240px]"
                      placeholder="Nome da região"
                      value={linha.regiao}
                      onChange={(e) => atualizarLinha(abaAtual.id, linha.key, 'regiao', e.target.value)}
                    />
                    <div className="relative max-w-[160px]">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
                      <Input
                        className="pl-9 h-9 text-sm"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={linha.valor}
                        onChange={(e) => atualizarLinha(abaAtual.id, linha.key, 'valor', e.target.value)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-slate-400 hover:text-red-500"
                      onClick={() => removerLinha(abaAtual.id, linha.key)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => adicionarLinha(abaAtual.id)}>
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar região
                </Button>
              </div>
            </div>
          )}

          {abas.length === 0 && (
            <p className="text-sm text-slate-500">Nenhuma transportadora cadastrada. Clique em &quot;Transportadora&quot; para adicionar.</p>
          )}

          {/* Botão salvar */}
          <div className="flex justify-end pt-2 border-t">
            <Button onClick={handleSalvar} disabled={isPending || abas.length === 0} size="sm" className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              {isPending ? 'Salvando...' : 'Salvar frete'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
