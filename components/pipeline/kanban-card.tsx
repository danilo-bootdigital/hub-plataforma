'use client'

import { useDraggable } from '@dnd-kit/core'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Calendar,
  DollarSign,
  MessageCircle,
  MessageSquare,
  Phone,
} from 'lucide-react'
import Link from 'next/link'

import { BadgeOrigem } from '@/components/leads/badge-origem'
import { cn } from '@/lib/utils'

import type { LeadOrigem } from '@/types/database'

export type DealCard = {
  id: string
  titulo: string
  valor_estimado: number | null
  ganho: boolean | null
  motivo_perda: string | null
  data_fechamento_prevista: string | null
  atualizado_em: string
  estagio_id: string
  contato: { id: string; nome: string } | null
  responsavel: { id: string; nome: string } | null
  lead: {
    id: string
    nome: string | null
    telefone: string | null
    foto_perfil_url: string | null
    origem: LeadOrigem
    status: string
  } | null
  ultima_mensagem: string | null
  ultima_mensagem_em: string | null
  ultimas_mensagens: {
    id: string
    conteudo: string | null
    direcao: string
    enviado_em: string
  }[]
  status_conversa: string | null
  conversa_id: string | null
  tags: { id: string; nome: string; cor: string }[]
}

type Props = {
  deal: DealCard
  podeArrastar: boolean
  onDoubleClick?: () => void
}

export function KanbanCard({ deal, podeArrastar, onDoubleClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: deal.id,
      data: { deal },
      disabled: !podeArrastar,
    })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  const nomeExibido =
    deal.lead?.nome?.trim() ||
    deal.contato?.nome?.trim() ||
    deal.titulo?.trim() ||
    'Sem nome'

  const inicial = nomeExibido.charAt(0).toUpperCase()
  const telefone = deal.lead?.telefone
  const fotoUrl = deal.lead?.foto_perfil_url
  const tags = deal.tags ?? []

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onDoubleClick={onDoubleClick}
      className={cn(
        'select-none rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition-all duration-200',
        podeArrastar && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40 shadow-md',
        !isDragging && 'hover:shadow-md hover:border-slate-300/80'
      )}
    >
      {/* Header with Avatar and Name */}
      <div className="flex items-start gap-2.5">
        {fotoUrl ? (
          <img
            src={fotoUrl}
            alt={nomeExibido}
            className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-slate-100"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
            {inicial}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-800">
            {nomeExibido}
          </p>

          {telefone && (
            <p className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
              <Phone className="h-3 w-3 shrink-0" />
              {telefone}
            </p>
          )}
        </div>
      </div>

      {/* Last Message Preview */}
      {deal.ultima_mensagem && (
        <div className="flex items-start gap-1.5 mt-2.5">
          <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
          <p className="line-clamp-2 text-xs text-slate-500">
            {deal.ultima_mensagem}
          </p>
        </div>
      )}

      {/* Metrics Row */}
      <div className="flex items-center gap-3 mt-2.5">
        {deal.valor_estimado !== null && deal.valor_estimado > 0 && (
          <span className="flex items-center gap-1 text-xs font-medium text-slate-700">
            <DollarSign className="h-3 w-3 shrink-0 text-emerald-500" />
            {deal.valor_estimado.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              maximumFractionDigits: 0,
            })}
          </span>
        )}

        {deal.ultima_mensagem_em && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Calendar className="h-3 w-3 shrink-0" />
            {formatDistanceToNow(new Date(deal.ultima_mensagem_em), {
              addSuffix: false,
              locale: ptBR,
            })}
          </span>
        )}

        {!deal.ultima_mensagem_em && deal.data_fechamento_prevista && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Calendar className="h-3 w-3 shrink-0" />
            {format(
              new Date(`${deal.data_fechamento_prevista}T12:00:00`),
              'dd/MM',
              { locale: ptBR },
            )}
          </span>
        )}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: tag.cor }}
            >
              {tag.nome}
            </span>
          ))}
        </div>
      )}

      {/* Footer Row */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
        {deal.responsavel && (
          <div className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600">
              {deal.responsavel.nome.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-slate-500">
              {deal.responsavel.nome.split(' ')[0]}
            </span>
          </div>
        )}

        {deal.conversa_id && (
          <Link
            href={`/whatsapp/${deal.conversa_id}`}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
          >
            <MessageCircle className="h-3 w-3" />
            WhatsApp
          </Link>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    nao_atendida: {
      label: 'Não atendida',
      className: 'bg-red-50 text-red-700',
    },
    em_atendimento: {
      label: 'Em atendimento',
      className: 'bg-blue-50 text-blue-700',
    },
    aguardando_cliente: {
      label: 'Aguardando cliente',
      className: 'bg-amber-50 text-amber-700',
    },
    finalizada: {
      label: 'Finalizada',
      className: 'bg-emerald-50 text-emerald-700',
    },
  }

  const item = config[status] ?? {
    label: status,
    className: 'bg-slate-100 text-slate-600',
  }

  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[12px] font-medium',
        item.className,
      )}
    >
      {item.label}
    </span>
  )
}