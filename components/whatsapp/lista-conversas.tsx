'use client'

import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { iniciais } from '@/lib/telefone'
import { EditarNome } from './editar-nome'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Check, Loader2 } from 'lucide-react'
import { alterarStatusConversa } from '@/app/(dashboard)/whatsapp/actions-conversa'

type Conversa = {
  id: string
  nome_contato: string
  telefone: string
  ultima_mensagem_em: string | null
  ultima_mensagem_em_formatada?: string | null
  ultima_mensagem?: string | null
  nao_lidas?: number
  status: string
}

export type ConversaSelecionada = {
  id: string
  nome: string
  telefone: string
  status: string
}

type Props = {
  conversasIniciais: Conversa[]
  conversaAtivaId?: string
  onSelecionar: (info: ConversaSelecionada) => void
  onNomeEditado?: (conversaId: string, novoNome: string) => void
  /** Chamado após finalizar uma conversa (para limpar a conversa ativa, etc.) */
  onFinalizada?: (conversaId: string) => void
}

const STATUS_DOT: Record<string, string> = {
  nao_atendida: 'bg-red-500',
  em_atendimento: 'bg-blue-500',
  aguardando_cliente: 'bg-amber-500',
  finalizada: 'bg-emerald-500',
}

function horaCurta(dataIso: string | null): string {
  if (!dataIso) return ''
  const d = new Date(dataIso)
  if (isToday(d)) return format(d, 'HH:mm', { locale: ptBR })
  if (isYesterday(d)) return 'Ontem'
  return format(d, 'dd/MM/yy', { locale: ptBR })
}

// ------------------------------------------------------------
// Item memoizado: só re-renderiza quando seus próprios dados,
// estado de seleção ou callbacks mudarem.
// ------------------------------------------------------------
const ItemConversaRow = memo(function ItemConversaRow({
  conversa,
  ativa,
  onSelecionar,
  onFinalizar,
  onNomeEditado,
}: {
  conversa: Conversa
  ativa: boolean
  onSelecionar: (info: ConversaSelecionada) => void
  onFinalizar: (e: React.MouseEvent, conversa: Conversa) => void
  onNomeEditado: (conversaId: string, novoNome: string) => void
}) {
  const naoLidas = conversa.nao_lidas ?? 0
  const selecionar = () =>
    onSelecionar({
      id: conversa.id,
      nome: conversa.nome_contato,
      telefone: conversa.telefone,
      status: conversa.status,
    })
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={selecionar}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          selecionar()
        }
      }}
      className={cn(
        'group relative flex w-full cursor-pointer items-center gap-3 border-b border-slate-50 px-3 py-3 text-left transition-colors focus:outline-none focus-visible:bg-slate-50',
        ativa ? 'bg-emerald-50/70' : 'hover:bg-slate-50',
      )}
    >
      {ativa && <span className="absolute inset-y-0 left-0 w-0.5 bg-emerald-500" />}

      <div className="relative shrink-0">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
          {iniciais(conversa.nome_contato)}
        </div>
        <span
          className={cn(
            'absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-white',
            STATUS_DOT[conversa.status] ?? 'bg-slate-300',
          )}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <h3 className={cn('truncate text-sm', naoLidas > 0 ? 'font-semibold text-slate-900' : 'font-medium text-slate-800')}>
              {conversa.nome_contato}
            </h3>
            <span className="opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
              <EditarNome
                conversaId={conversa.id}
                nomeAtual={conversa.nome_contato}
                telefone={conversa.telefone}
                onEditComplete={(novoNome) => onNomeEditado(conversa.id, novoNome)}
              />
            </span>
          </div>
          <span className={cn('shrink-0 text-[11px]', naoLidas > 0 ? 'font-medium text-emerald-600' : 'text-slate-400')}>
            {horaCurta(conversa.ultima_mensagem_em)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className={cn('truncate text-xs', naoLidas > 0 ? 'text-slate-600' : 'text-slate-400')}>
            {conversa.ultima_mensagem?.trim() || 'Sem mensagens'}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            {naoLidas > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-semibold text-white">
                {naoLidas > 99 ? '99+' : naoLidas}
              </span>
            )}
            {conversa.status !== 'finalizada' && (
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => onFinalizar(e, conversa)}
                className="rounded-full px-2 py-0.5 text-[11px] font-medium text-emerald-600 opacity-0 transition-opacity hover:bg-emerald-100 group-hover:opacity-100"
                title="Finalizar atendimento"
              >
                Fechar
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

export function ListaConversas({
  conversasIniciais,
  conversaAtivaId,
  onSelecionar,
  onNomeEditado,
  onFinalizada,
}: Props) {
  const [conversasRealtime, setConversasRealtime] = useState<Conversa[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null)
  const [finalizando, setFinalizando] = useState(false)
  // Remoção otimista: ids fechados nesta sessão somem da lista na hora,
  // sem esperar o round-trip do servidor nem F5.
  const [removidasIds, setRemovidasIds] = useState<Set<string>>(() => new Set())

  const conversas = useMemo(() => {
    const mapa = new Map<string, Conversa>()
    for (const conversa of conversasIniciais) mapa.set(conversa.id, conversa)
    for (const conversa of conversasRealtime) {
      const existente = mapa.get(conversa.id)
      mapa.set(conversa.id, existente ? { ...existente, ...conversa } : conversa)
    }
    return Array.from(mapa.values())
      .filter((c) => !removidasIds.has(c.id))
      .sort((a, b) => {
        const dataA = a.ultima_mensagem_em ? new Date(a.ultima_mensagem_em).getTime() : 0
        const dataB = b.ultima_mensagem_em ? new Date(b.ultima_mensagem_em).getTime() : 0
        return dataB - dataA
      })
  }, [conversasIniciais, conversasRealtime, removidasIds])

  // Auto-recuperação: se uma conversa removida voltar a um status aberto
  // (reabertura por nova mensagem, etc.), reexibe-a na lista.
  useEffect(() => {
    if (removidasIds.size === 0) return
    const reabertas = [...conversasIniciais, ...conversasRealtime]
      .filter((c) => removidasIds.has(c.id) && c.status !== 'finalizada')
      .map((c) => c.id)
    if (reabertas.length === 0) return
    setRemovidasIds((prev) => {
      const next = new Set(prev)
      for (const id of reabertas) next.delete(id)
      return next
    })
  }, [conversasIniciais, conversasRealtime, removidasIds])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('lista-conversas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        async () => {
          const { data } = await supabase
            .from('conversations')
            .select('id, telefone_externo, ultima_mensagem_em, status, nao_lidas, lead:leads!lead_id(nome), contato:contacts!contato_id(nome)')
            // Lista principal mostra apenas conversas abertas; finalizadas
            // não devem reaparecer via realtime.
            .neq('status', 'finalizada')
            .order('ultima_mensagem_em', { ascending: false })

          if (data) {
            const mappedData = data.map((c) => ({
              id: c.id,
              telefone: c.telefone_externo,
              ultima_mensagem_em: c.ultima_mensagem_em,
              ultima_mensagem_em_formatada: c.ultima_mensagem_em
                ? new Date(c.ultima_mensagem_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
                : null,
              status: c.status,
              nao_lidas: (c as any).nao_lidas ?? 0,
              nome_contato: (c as any).lead?.nome || (c as any).contato?.nome || `Contato ${c.telefone_externo}` || 'Contato WhatsApp',
            }))
            setConversasRealtime(mappedData as Conversa[])
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleNomeEditado = useCallback((conversaId: string, novoNome: string) => {
    setConversasRealtime((prev) =>
      prev.map((c) => (c.id === conversaId ? { ...c, nome_contato: novoNome } : c)),
    )
    onNomeEditado?.(conversaId, novoNome)
  }, [onNomeEditado])

  const handleFinalizarClick = useCallback((e: React.MouseEvent, conversa: Conversa) => {
    e.preventDefault()
    e.stopPropagation()
    setConversaSelecionada(conversa)
    setDialogOpen(true)
  }, [])

  const handleConfirmarFinalizar = async () => {
    if (!conversaSelecionada) return
    const idFinalizada = conversaSelecionada.id
    setFinalizando(true)
    try {
      await alterarStatusConversa(idFinalizada, 'finalizada')
      // Remoção imediata do estado local (sem reload de página)
      setRemovidasIds((prev) => {
        const next = new Set(prev)
        next.add(idFinalizada)
        return next
      })
      // Se for a conversa ativa no painel direito, o shell limpa a seleção
      onFinalizada?.(idFinalizada)
      setDialogOpen(false)
      setConversaSelecionada(null)
    } catch (error) {
      console.error('Erro ao finalizar conversa:', error)
    } finally {
      setFinalizando(false)
    }
  }

  return (
    <div className="flex flex-col">
      {conversas.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-500">Nenhuma conversa encontrada</p>
          <p className="mt-1 text-xs text-slate-400">
            Ajuste a busca ou os filtros para ver outras conversas.
          </p>
        </div>
      ) : (
        conversas.map((conversa) => (
          <ItemConversaRow
            key={conversa.id}
            conversa={conversa}
            ativa={conversa.id === conversaAtivaId}
            onSelecionar={onSelecionar}
            onFinalizar={handleFinalizarClick}
            onNomeEditado={handleNomeEditado}
          />
        ))
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar atendimento?</DialogTitle>
            <DialogDescription>
              A conversa com {conversaSelecionada?.nome_contato} será marcada como finalizada.
              Você ainda poderá visualizar no filtro &quot;Finalizadas&quot;.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={finalizando}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarFinalizar} disabled={finalizando}>
              {finalizando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Finalizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
