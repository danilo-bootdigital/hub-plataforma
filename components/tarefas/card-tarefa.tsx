'use client'

import { cn } from '@/lib/utils'
import { format, isPast, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Phone, Mail, Users, MessageCircle, Calendar, Trash2, RotateCcw, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TaskTipo } from '@/types/database'

export type TarefaCard = {
  id: string
  titulo: string
  descricao: string | null
  tipo: TaskTipo
  data_vencimento: string | null
  concluida: boolean
  responsavel: { id: string; nome: string } | null
  lead_id: string | null
  contato_id: string | null
  deal_id: string | null
}

const ICONES_TIPO: Record<TaskTipo, React.ReactNode> = {
  ligacao: <Phone className="h-3.5 w-3.5" />,
  email: <Mail className="h-3.5 w-3.5" />,
  reuniao: <Users className="h-3.5 w-3.5" />,
  whatsapp: <MessageCircle className="h-3.5 w-3.5" />,
}

const LABELS_TIPO: Record<TaskTipo, string> = {
  ligacao: 'Ligação',
  email: 'E-mail',
  reuniao: 'Reunião',
  whatsapp: 'WhatsApp',
}

type Props = {
  tarefa: TarefaCard
  onConcluir: (tarefa: TarefaCard) => void
  onReabrir: (tarefaId: string) => void
  onExcluir: (tarefaId: string) => void
  carregando?: boolean
}

export function CardTarefa({ tarefa, onConcluir, onReabrir, onExcluir, carregando }: Props) {
  const vencimento = tarefa.data_vencimento ? new Date(tarefa.data_vencimento) : null
  const atrasada = !tarefa.concluida && vencimento !== null && isPast(vencimento) && !isToday(vencimento)
  const hoje = !tarefa.concluida && vencimento !== null && isToday(vencimento)

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border bg-white p-3 transition-colors',
        tarefa.concluida && 'opacity-60',
        atrasada && 'border-red-200 bg-red-50',
        hoje && 'border-amber-200 bg-amber-50',
      )}
    >
      <div
        className={cn(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
          tarefa.concluida ? 'bg-slate-100 text-slate-400' :
          atrasada ? 'bg-red-100 text-red-600' :
          hoje ? 'bg-amber-100 text-amber-600' :
          'bg-slate-100 text-slate-600',
        )}
      >
        {ICONES_TIPO[tarefa.tipo]}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium',
            tarefa.concluida ? 'line-through text-slate-400' : 'text-slate-900',
            atrasada && 'text-red-800',
          )}
        >
          {tarefa.titulo}
        </p>

        {tarefa.descricao && (
          <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{tarefa.descricao}</p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
              tarefa.concluida ? 'bg-slate-100 text-slate-400' :
              atrasada ? 'bg-red-100 text-red-700' :
              'bg-slate-100 text-slate-600',
            )}
          >
            {LABELS_TIPO[tarefa.tipo]}
          </span>

          {vencimento && (
            <span
              className={cn(
                'flex items-center gap-1 text-xs',
                atrasada ? 'font-medium text-red-600' :
                hoje ? 'font-medium text-amber-600' :
                'text-slate-400',
              )}
            >
              <Calendar className="h-3 w-3" />
              {atrasada && 'Atrasada — '}
              {hoje ? 'Hoje' : format(vencimento, 'dd/MM/yyyy', { locale: ptBR })}
            </span>
          )}

          {tarefa.responsavel && (
            <span className="text-xs text-slate-400">
              {tarefa.responsavel.nome.split(' ')[0]}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {!tarefa.concluida ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-green-600"
            onClick={() => onConcluir(tarefa)}
            disabled={carregando}
            title="Marcar como concluída"
          >
            <Check className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-slate-600"
            onClick={() => onReabrir(tarefa.id)}
            disabled={carregando}
            title="Reabrir tarefa"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-300 hover:text-red-500"
          onClick={() => onExcluir(tarefa.id)}
          disabled={carregando}
          title="Excluir tarefa"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
