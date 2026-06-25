'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  renomearEtapa,
  alterarCorEtapa,
  alternarOculto,
  moverEtapa,
  excluirEtapa,
  adicionarEtapa,
} from '@/app/(dashboard)/pipeline/configurar/actions'
import { ChevronUp, ChevronDown, Eye, EyeOff, Trash2, Plus } from 'lucide-react'

type Etapa = {
  id: string
  nome: string
  cor: string
  ordem: number
  oculto: boolean
  tipo_especial: 'fechado' | 'perdido' | null
}

type Props = {
  etapas: Etapa[]
  pipelineId: string
}

export function FormEtapas({ etapas: etapasIniciais, pipelineId }: Props) {
  const router = useRouter()
  const [etapas, setEtapas] = useState<Etapa[]>(etapasIniciais)
  const [editandoNome, setEditandoNome] = useState<string | null>(null)
  const [novoNome, setNovoNome] = useState('')
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const [destinoExclusao, setDestinoExclusao] = useState('')
  const [novaEtapaNome, setNovaEtapaNome] = useState('')
  const [novaEtapaCor, setNovaEtapaCor] = useState('#6366f1')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleRenomear(estagioId: string) {
    if (!novoNome.trim()) return
    setCarregando(true)
    setErro(null)
    try {
      await renomearEtapa(estagioId, novoNome.trim())
      setEtapas((prev) =>
        prev.map((e) => (e.id === estagioId ? { ...e, nome: novoNome.trim() } : e))
      )
      setEditandoNome(null)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao renomear.')
    } finally {
      setCarregando(false)
    }
  }

  async function handleAlterarCor(estagioId: string, cor: string) {
    const corAnterior = etapas.find((e) => e.id === estagioId)?.cor
    setEtapas((prev) => prev.map((e) => (e.id === estagioId ? { ...e, cor } : e)))
    try {
      await alterarCorEtapa(estagioId, cor)
    } catch {
      setEtapas((prev) => prev.map((e) => (e.id === estagioId ? { ...e, cor: corAnterior ?? cor } : e)))
      toast.error('Erro ao alterar cor da etapa.')
    }
  }

  async function handleAlternarOculto(estagioId: string, ocultoAtual: boolean) {
    setCarregando(true)
    setErro(null)
    try {
      await alternarOculto(estagioId, !ocultoAtual)
      setEtapas((prev) =>
        prev.map((e) => (e.id === estagioId ? { ...e, oculto: !ocultoAtual } : e))
      )
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao alterar visibilidade.')
    } finally {
      setCarregando(false)
    }
  }

  async function handleMover(estagioId: string, direcao: 'cima' | 'baixo') {
    setCarregando(true)
    setErro(null)
    try {
      await moverEtapa(estagioId, direcao)
      setEtapas((prev) => {
        const sorted = [...prev].sort((a, b) => a.ordem - b.ordem)
        const idx = sorted.findIndex((e) => e.id === estagioId)
        if (idx < 0) return prev
        const swapIdx = direcao === 'cima' ? idx - 1 : idx + 1
        if (swapIdx < 0 || swapIdx >= sorted.length) return prev
        const novaOrdem = sorted[swapIdx].ordem
        const ordemAtual = sorted[idx].ordem
        return prev.map((e) => {
          if (e.id === estagioId) return { ...e, ordem: novaOrdem }
          if (e.id === sorted[swapIdx].id) return { ...e, ordem: ordemAtual }
          return e
        })
      })
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao reordenar.')
    } finally {
      setCarregando(false)
    }
  }

  async function handleExcluir(estagioId: string) {
    setCarregando(true)
    setErro(null)
    try {
      await excluirEtapa(estagioId, destinoExclusao || null)
      setEtapas((prev) => prev.filter((e) => e.id !== estagioId))
      setExcluindo(null)
      setDestinoExclusao('')
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao excluir etapa.')
    } finally {
      setCarregando(false)
    }
  }

  async function handleAdicionarEtapa(formData: FormData) {
    formData.set('pipeline_id', pipelineId)
    setCarregando(true)
    setErro(null)
    try {
      await adicionarEtapa(formData)
      setNovaEtapaNome('')
      setNovaEtapaCor('#6366f1')
      router.refresh()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao adicionar etapa.')
    } finally {
      setCarregando(false)
    }
  }

  const etapasOrdenadas = [...etapas].sort((a, b) => a.ordem - b.ordem)
  const etapasParaDestino = etapas.filter((e) => e.id !== excluindo)

  return (
    <div className="space-y-6">
      {erro && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</div>
      )}

      {/* Lista de etapas */}
      <div className="space-y-2">
        {etapasOrdenadas.map((etapa, idx) => (
          <div
            key={etapa.id}
            className="flex items-center gap-3 rounded-lg border bg-white p-3"
          >
            {/* Cor */}
            <input
              type="color"
              value={etapa.cor}
              onChange={(e) => handleAlterarCor(etapa.id, e.target.value)}
              className="h-7 w-7 cursor-pointer rounded border-0 p-0"
              title="Alterar cor"
            />

            {/* Nome */}
            {editandoNome === etapa.id ? (
              <div className="flex flex-1 items-center gap-2">
                <Input
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  className="h-8"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenomear(etapa.id)
                    if (e.key === 'Escape') setEditandoNome(null)
                  }}
                />
                <Button size="sm" onClick={() => handleRenomear(etapa.id)} disabled={carregando}>
                  Salvar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditandoNome(null)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <button
                className="flex-1 text-left text-sm font-medium text-slate-800 hover:text-slate-600"
                onClick={() => { setEditandoNome(etapa.id); setNovoNome(etapa.nome) }}
                title="Clique para renomear"
              >
                {etapa.nome}
                {etapa.tipo_especial && (
                  <span className="ml-2 text-xs text-slate-400">({etapa.tipo_especial})</span>
                )}
              </button>
            )}

            {/* Ações */}
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleMover(etapa.id, 'cima')}
                disabled={idx === 0 || carregando}
                title="Mover para cima"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleMover(etapa.id, 'baixo')}
                disabled={idx === etapasOrdenadas.length - 1 || carregando}
                title="Mover para baixo"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleAlternarOculto(etapa.id, etapa.oculto)}
                disabled={carregando}
                title={etapa.oculto ? 'Mostrar etapa' : 'Ocultar etapa'}
              >
                {etapa.oculto ? (
                  <EyeOff className="h-4 w-4 text-slate-400" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
              {excluindo === etapa.id ? (
                <div className="flex items-center gap-2">
                  {etapasParaDestino.length > 0 && (
                    <Select value={destinoExclusao} onValueChange={(v) => setDestinoExclusao(v ?? '')}>
                      <SelectTrigger className="h-7 w-44 text-xs">
                        <SelectValue placeholder="Mover cards para..." />
                      </SelectTrigger>
                      <SelectContent>
                        {etapasParaDestino.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleExcluir(etapa.id)}
                    disabled={carregando}
                  >
                    Confirmar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setExcluindo(null); setDestinoExclusao('') }}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-400 hover:text-red-600"
                  onClick={() => setExcluindo(etapa.id)}
                  title="Excluir etapa"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Adicionar nova etapa */}
      <div className="rounded-lg border bg-slate-50 p-4">
        <p className="mb-3 text-sm font-medium text-slate-700">Adicionar nova etapa</p>
        <form action={handleAdicionarEtapa} className="flex items-end gap-3">
          <div className="flex-1 space-y-1">
            <Label htmlFor="nome_nova_etapa" className="text-xs">Nome</Label>
            <Input
              id="nome_nova_etapa"
              name="nome"
              value={novaEtapaNome}
              onChange={(e) => setNovaEtapaNome(e.target.value)}
              placeholder="Ex: Em Negociação"
              className="h-8"
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cor</Label>
            <input
              type="color"
              name="cor"
              value={novaEtapaCor}
              onChange={(e) => setNovaEtapaCor(e.target.value)}
              className="h-8 w-10 cursor-pointer rounded border-0 p-0"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={carregando || !novaEtapaNome.trim()}
          >
            <Plus className="mr-1 h-4 w-4" />
            Adicionar
          </Button>
        </form>
      </div>
    </div>
  )
}
