'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { isPast, isToday } from 'date-fns'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CardTarefa, type TarefaCard } from './card-tarefa'
import { ModalNovaTarefa } from './modal-nova-tarefa'
import { ModalProximoFollowUp } from './modal-proximo-follow-up'
import { concluirTarefa, reabrirTarefa, excluirTarefa } from '@/app/(dashboard)/tarefas/actions'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/database'

type Vendedor = { id: string; nome: string }

type Props = {
  tarefas: TarefaCard[]
  cargo: UserRole
  vendedores: Vendedor[]
  perfilId: string
  leadId?: string
  contatoId?: string
  dealId?: string
}

type Aba = 'todas' | 'hoje' | 'atrasadas' | 'concluidas'

const ABAS: { valor: Aba; label: string }[] = [
  { valor: 'todas', label: 'Todas' },
  { valor: 'hoje', label: 'Hoje' },
  { valor: 'atrasadas', label: 'Atrasadas' },
  { valor: 'concluidas', label: 'Concluídas' },
]

type TarefaConcluida = {
  tipo: TarefaCard['tipo']
  lead_id: string | null
  contato_id: string | null
  deal_id: string | null
  responsavel_id: string
}

export function ListaTarefas({
  tarefas,
  cargo,
  vendedores,
  perfilId,
  leadId,
  contatoId,
  dealId,
}: Props) {
  const router = useRouter()
  const [abaAtiva, setAbaAtiva] = useState<Aba>('todas')
  const [modalNova, setModalNova] = useState(false)
  const [tarefaConcluida, setTarefaConcluida] = useState<TarefaConcluida | null>(null)
  const [isPending, startTransition] = useTransition()

  function filtrar(lista: TarefaCard[]): TarefaCard[] {
    switch (abaAtiva) {
      case 'hoje':
        return lista.filter(
          (t) => !t.concluida && t.data_vencimento && isToday(new Date(t.data_vencimento))
        )
      case 'atrasadas':
        return lista.filter(
          (t) =>
            !t.concluida &&
            t.data_vencimento &&
            isPast(new Date(t.data_vencimento)) &&
            !isToday(new Date(t.data_vencimento))
        )
      case 'concluidas':
        return lista.filter((t) => t.concluida)
      default:
        return lista.filter((t) => !t.concluida)
    }
  }

  function handleConcluir(tarefa: TarefaCard) {
    startTransition(async () => {
      try {
        await concluirTarefa(tarefa.id)
        if (tarefa.lead_id || tarefa.contato_id || tarefa.deal_id) {
          setTarefaConcluida({
            tipo: tarefa.tipo,
            lead_id: tarefa.lead_id,
            contato_id: tarefa.contato_id,
            deal_id: tarefa.deal_id,
            responsavel_id: perfilId,
          })
        }
        router.refresh()
      } catch {
        toast.error('Erro ao concluir tarefa. Tente novamente.')
      }
    })
  }

  function handleReabrir(tarefaId: string) {
    startTransition(async () => {
      try {
        await reabrirTarefa(tarefaId)
        router.refresh()
      } catch {
        toast.error('Erro ao reabrir tarefa. Tente novamente.')
      }
    })
  }

  function handleExcluir(tarefaId: string) {
    startTransition(async () => {
      try {
        await excluirTarefa(tarefaId)
        router.refresh()
      } catch {
        toast.error('Erro ao excluir tarefa. Tente novamente.')
      }
    })
  }

  const tarefasFiltradas = filtrar(tarefas)

  const contadores: Record<Aba, number> = {
    todas: tarefas.filter((t) => !t.concluida).length,
    hoje: tarefas.filter(
      (t) => !t.concluida && t.data_vencimento && isToday(new Date(t.data_vencimento))
    ).length,
    atrasadas: tarefas.filter(
      (t) =>
        !t.concluida &&
        t.data_vencimento &&
        isPast(new Date(t.data_vencimento)) &&
        !isToday(new Date(t.data_vencimento))
    ).length,
    concluidas: tarefas.filter((t) => t.concluida).length,
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {ABAS.map((aba) => (
            <button
              key={aba.valor}
              onClick={() => setAbaAtiva(aba.valor)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                abaAtiva === aba.valor
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
              )}
            >
              {aba.label}
              {contadores[aba.valor] > 0 && (
                <span
                  className={cn(
                    'ml-1.5 rounded-full px-1.5 py-0.5 text-[12px]',
                    abaAtiva === aba.valor
                      ? 'bg-white/20 text-white'
                      : aba.valor === 'atrasadas'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-slate-200 text-slate-600',
                  )}
                >
                  {contadores[aba.valor]}
                </span>
              )}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setModalNova(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Nova tarefa
        </Button>
      </div>

      <div className="space-y-2">
        {tarefasFiltradas.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            {abaAtiva === 'concluidas' ? 'Nenhuma tarefa concluída.' :
             abaAtiva === 'atrasadas' ? 'Sem tarefas atrasadas.' :
             abaAtiva === 'hoje' ? 'Nenhuma tarefa para hoje.' :
             'Nenhuma tarefa pendente.'}
          </p>
        ) : (
          tarefasFiltradas.map((tarefa) => (
            <CardTarefa
              key={tarefa.id}
              tarefa={tarefa}
              onConcluir={handleConcluir}
              onReabrir={handleReabrir}
              onExcluir={handleExcluir}
              carregando={isPending}
            />
          ))
        )}
      </div>

      {modalNova && (
        <ModalNovaTarefa
          aberto={true}
          onFechar={() => { setModalNova(false); router.refresh() }}
          cargo={cargo}
          vendedores={vendedores}
          perfilId={perfilId}
          leadId={leadId}
          contatoId={contatoId}
          dealId={dealId}
        />
      )}

      {tarefaConcluida && (
        <ModalProximoFollowUp
          tarefaAnterior={tarefaConcluida}
          aberto={true}
          onFechar={() => { setTarefaConcluida(null); router.refresh() }}
        />
      )}
    </div>
  )
}
