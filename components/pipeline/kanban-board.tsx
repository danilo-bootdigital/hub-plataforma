'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { createClient } from '@/lib/supabase/client'
import { moverDeal } from '@/app/(dashboard)/pipeline/actions'
import { KanbanColuna } from './kanban-coluna'
import { KanbanCard, type DealCard } from './kanban-card'
import { ModalNovaNegociacao } from './modal-nova-negociacao'
import { ModalFechado } from './modal-fechado'
import { ModalPerdido } from './modal-perdido'
import { ModalDetalheDeal } from './modal-detalhe-deal'
import type { UserRole } from '@/types/database'

type Etapa = {
  id: string
  nome: string
  cor: string
  ordem: number
  tipo_especial: 'fechado' | 'perdido' | null
}

type Props = {
  pipelineId: string
  etapas: Etapa[]
  dealsIniciais: DealCard[]
  cargo: UserRole
  organizationId: string
}

type PendingFechado = { deal: DealCard; estagioDestinoId: string }
type PendingPerdido = { deal: DealCard; estagioDestinoId: string }
type PendingEstagio = { id: string; nome: string }

const CARGOS_QUE_MOVEM: UserRole[] = ['admin', 'gestor', 'vendedor']
const CARGOS_QUE_CRIAM: UserRole[] = ['admin', 'gestor', 'vendedor']

type RealtimeDealPayload = {
  id: string
  estagio_id: string
  valor_estimado: number | null
  ganho: boolean | null
  motivo_perda: string | null
  titulo: string
  pipeline_id: string
  atualizado_em: string
}

export function KanbanBoard({ pipelineId, etapas, dealsIniciais, cargo, organizationId }: Props) {
  const router = useRouter()
  const [deals, setDeals] = useState<DealCard[]>(dealsIniciais)
  const [dealArrastando, setDealArrastando] = useState<DealCard | null>(null)
  const [pendingFechado, setPendingFechado] = useState<PendingFechado | null>(null)
  const [pendingPerdido, setPendingPerdido] = useState<PendingPerdido | null>(null)
  const [novaNegoEstagio, setNovaNegoEstagio] = useState<PendingEstagio | null>(null)
  const [dealDetalhe, setDealDetalhe] = useState<DealCard | null>(null)

  const podeArrastar = CARGOS_QUE_MOVEM.includes(cargo)
  const podeCriar = CARGOS_QUE_CRIAM.includes(cargo)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // Supabase Realtime — sincroniza deals de outros usuários
  useEffect(() => {
    const supabase = createClient()
    const canal = supabase
      .channel(`pipeline:${pipelineId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deals',
          filter: `pipeline_id=eq.${pipelineId}`,
        },
        (payload) => {
          const atualizado = payload.new as RealtimeDealPayload
          if (atualizado.ganho !== null) {
            setDeals((prev) => prev.filter((d) => d.id !== atualizado.id))
            return
          }
          setDeals((prev) => {
            const updated = prev.map((d) =>
              d.id === atualizado.id
                ? {
                    ...d,
                    estagio_id: atualizado.estagio_id,
                    valor_estimado: atualizado.valor_estimado,
                    ganho: atualizado.ganho,
                    motivo_perda: atualizado.motivo_perda,
                    titulo: atualizado.titulo,
                    atualizado_em: atualizado.atualizado_em,
                  }
                : d
            )
            return updated.sort((a, b) =>
              new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime()
            )
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'deals',
          filter: `pipeline_id=eq.${pipelineId}`,
        },
        (payload) => {
          const novo = payload.new as RealtimeDealPayload
          if (!deals.some((d) => d.id === novo.id)) {
            router.refresh()
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [pipelineId, organizationId])

  function onDragStart(event: DragStartEvent) {
    const deal = event.active.data.current?.deal as DealCard | undefined
    setDealArrastando(deal ?? null)
  }

  function onDragEnd(event: DragEndEvent) {
    setDealArrastando(null)
    const { active, over } = event
    if (!over) return

    const dealId = active.id as string
    const estagioDestinoId = over.id as string
    const deal = active.data.current?.deal as DealCard

    if (estagioDestinoId === deal.estagio_id) return

    const etapaDestino = etapas.find((e) => e.id === estagioDestinoId)
    if (!etapaDestino) return

    if (etapaDestino.tipo_especial === 'fechado' && !deal.valor_estimado) {
      setPendingFechado({ deal, estagioDestinoId })
      return
    }

    if (etapaDestino.tipo_especial === 'perdido') {
      setPendingPerdido({ deal, estagioDestinoId })
      return
    }

    executarMover(dealId, estagioDestinoId, deal.estagio_id)
  }

  function executarMover(
    dealId: string,
    estagioDestinoId: string,
    estagioAtualId: string,
    extras: { valor_estimado?: number; motivo_perda?: string } = {}
  ) {
    const etapaDestino = etapas.find((e) => e.id === estagioDestinoId)
    const isTerminal = etapaDestino?.tipo_especial === 'fechado' || etapaDestino?.tipo_especial === 'perdido'

    if (isTerminal) {
      setDeals((prev) => prev.filter((d) => d.id !== dealId))
    } else {
      setDeals((prev) =>
        prev.map((d) =>
          d.id === dealId
            ? {
                ...d,
                estagio_id: estagioDestinoId,
                ...(extras.valor_estimado !== undefined ? { valor_estimado: extras.valor_estimado } : {}),
                ...(extras.motivo_perda !== undefined ? { motivo_perda: extras.motivo_perda } : {}),
              }
            : d
        )
      )
    }

    moverDeal(dealId, estagioDestinoId, extras).catch(() => {
      if (isTerminal) {
        // Reverter: re-adicionar o deal na coluna original
        setDeals((prev) => {
          const deal = dealsIniciais.find((d) => d.id === dealId)
          if (!deal) return prev
          return [...prev, { ...deal, estagio_id: estagioAtualId }]
        })
      } else {
        setDeals((prev) =>
          prev.map((d) => (d.id === dealId ? { ...d, estagio_id: estagioAtualId } : d))
        )
      }
    })
  }

  function confirmarFechado(valorEstimado: number) {
    if (!pendingFechado) return
    const { deal, estagioDestinoId } = pendingFechado
    setPendingFechado(null)
    executarMover(deal.id, estagioDestinoId, deal.estagio_id, { valor_estimado: valorEstimado })
  }

  function confirmarPerdido(motivoPerda: string) {
    if (!pendingPerdido) return
    const { deal, estagioDestinoId } = pendingPerdido
    setPendingPerdido(null)
    executarMover(deal.id, estagioDestinoId, deal.estagio_id, { motivo_perda: motivoPerda })
  }

  const colunas = etapas.map((etapa) => ({
    ...etapa,
    deals: deals
      .filter((d) => d.estagio_id === etapa.id)
      .sort((a, b) => new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime()),
  }))

  return (
    <>
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-6 h-full">
          {colunas.map((col) => (
            <KanbanColuna
              key={col.id}
              etapa={col}
              deals={col.deals}
              podeArrastar={podeArrastar}
              podeCriar={podeCriar}
              onNovaNegociacao={(estagioId) => {
                const etapa = etapas.find((e) => e.id === estagioId)
                if (etapa) setNovaNegoEstagio({ id: estagioId, nome: etapa.nome })
              }}
              onDealDoubleClick={(deal) => setDealDetalhe(deal)}
            />
          ))}
        </div>

        <DragOverlay>
          {dealArrastando ? (
            <div className="rotate-2 opacity-90">
              <KanbanCard deal={dealArrastando} podeArrastar={false} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {novaNegoEstagio && (
        <ModalNovaNegociacao
          pipelineId={pipelineId}
          estagioId={novaNegoEstagio.id}
          estagioNome={novaNegoEstagio.nome}
          aberto={true}
          onFechar={() => setNovaNegoEstagio(null)}
        />
      )}

      {pendingFechado && (
        <ModalFechado
          deal={pendingFechado.deal}
          aberto={true}
          onConfirmar={confirmarFechado}
          onCancelar={() => setPendingFechado(null)}
        />
      )}

      {pendingPerdido && (
        <ModalPerdido
          deal={pendingPerdido.deal}
          aberto={true}
          onConfirmar={confirmarPerdido}
          onCancelar={() => setPendingPerdido(null)}
        />
      )}

      <ModalDetalheDeal
        deal={dealDetalhe}
        aberto={dealDetalhe !== null}
        onFechar={() => setDealDetalhe(null)}
        estagios={etapas}
      />
    </>
  )
}
