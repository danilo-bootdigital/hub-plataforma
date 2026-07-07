'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { formatDistanceToNowStrict } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { FileText, Pill, CreditCard, User, Clock } from 'lucide-react'
import { formatarMoeda } from '@/lib/utils'
import type { EtapaPipeline, PipelineStatus } from '@/lib/pipeline/etapas'
import { updateQuotePipelineStatus } from '@/app/(dashboard)/hub/pipeline/actions'

export type CartaoPipeline = {
  id: string
  numero: number | null
  cliente_nome: string
  produto_resumo: string
  valor_total: number | null
  responsavel_id: string | null
  responsavel_nome: string
  criado_em: string
  pipeline_status: PipelineStatus
  pipeline_moved_at: string
  tem_receita: boolean
  tem_pagamento: boolean
}

export type ResponsavelOpcao = { id: string; nome: string }

type Props = {
  cartoes: CartaoPipeline[]
  etapas: EtapaPipeline[]
  ehProprietario: boolean
  usuarioId: string
  responsaveis: ResponsavelOpcao[]
}

type Periodo = 'todos' | '7d' | '30d'
type Escopo = 'todos' | 'meus'

const selectCls =
  'h-9 rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none'

function tempoParado(iso: string): string {
  try {
    return formatDistanceToNowStrict(new Date(iso), { locale: ptBR, addSuffix: false })
  } catch {
    return '—'
  }
}

function formatarData(iso: string) {
  try { return new Date(iso).toLocaleDateString('pt-BR') } catch { return '—' }
}

type Filtros = { busca: string; responsavelFiltro: string; etapaFiltro: string; periodo: Periodo; escopo: Escopo; usuarioId: string }

// Fora do render (função de módulo): pode ler o relógio sem violar a pureza de hooks.
function filtrarCartoes(items: CartaoPipeline[], f: Filtros): CartaoPipeline[] {
  const termo = f.busca.trim().toLowerCase()
  const limiteDias = f.periodo === '7d' ? 7 : f.periodo === '30d' ? 30 : null
  const agora = Date.now()
  return items.filter((c) => {
    if (termo && !`${c.numero ?? ''} ${c.cliente_nome}`.toLowerCase().includes(termo)) return false
    if (f.responsavelFiltro && c.responsavel_id !== f.responsavelFiltro) return false
    if (f.etapaFiltro && c.pipeline_status !== f.etapaFiltro) return false
    if (f.escopo === 'meus' && c.responsavel_id !== f.usuarioId) return false
    if (limiteDias != null) {
      const dias = (agora - new Date(c.criado_em).getTime()) / 86_400_000
      if (dias > limiteDias) return false
    }
    return true
  })
}

export function PipelineBoard({ cartoes, etapas, ehProprietario, usuarioId, responsaveis }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<CartaoPipeline[]>(cartoes)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // Filtros
  const [busca, setBusca] = useState('')
  const [responsavelFiltro, setResponsavelFiltro] = useState('')
  const [etapaFiltro, setEtapaFiltro] = useState('')
  const [periodo, setPeriodo] = useState<Periodo>('todos')
  const [escopo, setEscopo] = useState<Escopo>('todos')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const visiveis = useMemo(
    () => filtrarCartoes(items, { busca, responsavelFiltro, etapaFiltro, periodo, escopo, usuarioId }),
    [items, busca, responsavelFiltro, etapaFiltro, periodo, escopo, usuarioId],
  )

  const porEtapa = useMemo(() => {
    const mapa = new Map<PipelineStatus, CartaoPipeline[]>()
    etapas.forEach((e) => mapa.set(e.key, []))
    visiveis.forEach((c) => mapa.get(c.pipeline_status)?.push(c))
    return mapa
  }, [visiveis, etapas])

  const cartaoAtivo = activeId ? items.find((c) => c.id === activeId) ?? null : null

  function onDragEnd(ev: DragEndEvent) {
    setActiveId(null)
    const { active, over } = ev
    if (!over) return
    const destino = over.id as PipelineStatus
    const card = items.find((c) => c.id === active.id)
    if (!card || card.pipeline_status === destino) return

    const anterior = card.pipeline_status
    // Otimista: move já; reverte se a action falhar.
    setItems((prev) => prev.map((c) => (c.id === card.id ? { ...c, pipeline_status: destino, pipeline_moved_at: new Date().toISOString() } : c)))

    startTransition(async () => {
      const res = await updateQuotePipelineStatus(card.id, destino)
      if (!res.ok) {
        setItems((prev) => prev.map((c) => (c.id === card.id ? { ...c, pipeline_status: anterior } : c)))
        toast.error(res.erro)
      } else {
        toast.success('Etapa atualizada.')
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar cliente ou nº"
          className={`${selectCls} w-56`}
        />
        {ehProprietario && (
          <select value={responsavelFiltro} onChange={(e) => setResponsavelFiltro(e.target.value)} className={selectCls}>
            <option value="">Todos os responsáveis</option>
            {responsaveis.map((r) => (
              <option key={r.id} value={r.id}>{r.nome}</option>
            ))}
          </select>
        )}
        <select value={etapaFiltro} onChange={(e) => setEtapaFiltro(e.target.value)} className={selectCls}>
          <option value="">Todas as etapas</option>
          {etapas.map((e) => (
            <option key={e.key} value={e.key}>{e.label}</option>
          ))}
        </select>
        <select value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)} className={selectCls}>
          <option value="todos">Qualquer período</option>
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
        </select>
        {ehProprietario && (
          <div className="inline-flex overflow-hidden rounded-md border border-slate-200">
            {(['todos', 'meus'] as Escopo[]).map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => setEscopo(op)}
                className={`px-3 py-1.5 text-sm font-medium ${escopo === op ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                {op === 'todos' ? 'Todos' : 'Meus cards'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Kanban */}
      <DndContext
        sensors={sensors}
        onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {etapas.map((etapa) => {
            const cards = porEtapa.get(etapa.key) ?? []
            const total = cards.reduce((s, c) => s + (c.valor_total ?? 0), 0)
            return (
              <Coluna key={etapa.key} etapa={etapa} quantidade={cards.length} total={total}>
                {cards.map((c) => (
                  <Card key={c.id} cartao={c} onAbrir={() => router.push(`/orcamentos/${c.id}`)} />
                ))}
              </Coluna>
            )
          })}
        </div>
        <DragOverlay>
          {cartaoAtivo ? <CardVisual cartao={cartaoAtivo} arrastando /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

function Coluna({ etapa, quantidade, total, children }: {
  etapa: EtapaPipeline; quantidade: number; total: number; children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa.key })
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 px-1">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">{etapa.label}</h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{quantidade}</span>
        </div>
        <p className="mt-0.5 text-xs text-slate-400">{formatarMoeda(total)}</p>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-32 flex-1 flex-col gap-2 rounded-lg border p-2 transition-colors ${isOver ? 'border-emerald-400 bg-emerald-50/60' : 'border-slate-200 bg-slate-50/60'}`}
      >
        {children}
        {quantidade === 0 && (
          <p className="px-1 py-6 text-center text-xs text-slate-400">Sem orçamentos</p>
        )}
      </div>
    </div>
  )
}

function Card({ cartao, onAbrir }: { cartao: CartaoPipeline; onAbrir: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: cartao.id })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onAbrir}
      className={`cursor-grab touch-none ${isDragging ? 'opacity-40' : ''}`}
    >
      <CardVisual cartao={cartao} />
    </div>
  )
}

function CardVisual({ cartao, arrastando }: { cartao: CartaoPipeline; arrastando?: boolean }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm ${arrastando ? 'rotate-1 shadow-lg' : 'hover:border-slate-300'}`}>
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
          <FileText className="h-3.5 w-3.5" /> Nº {cartao.numero ?? '—'}
        </span>
        <span className="text-sm font-bold text-slate-800">{formatarMoeda(cartao.valor_total)}</span>
      </div>
      <p className="mt-1.5 truncate text-sm font-semibold text-slate-800">{cartao.cliente_nome}</p>
      <p className="truncate text-xs text-slate-500">{cartao.produto_resumo}</p>

      {(cartao.tem_receita || cartao.tem_pagamento) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {cartao.tem_receita && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
              <Pill className="h-3 w-3" /> Receita
            </span>
          )}
          {cartao.tem_pagamento && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
              <CreditCard className="h-3 w-3" /> Pagamento
            </span>
          )}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1 truncate">
          <User className="h-3 w-3" /> {cartao.responsavel_nome}
        </span>
        <span className="inline-flex items-center gap-1" title={`Criado em ${formatarData(cartao.criado_em)}`}>
          <Clock className="h-3 w-3" /> {tempoParado(cartao.pipeline_moved_at)}
        </span>
      </div>
    </div>
  )
}
