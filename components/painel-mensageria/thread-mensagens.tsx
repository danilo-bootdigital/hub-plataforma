'use client'

// Mensageria (E11) — histórico da conversa (balões). Client apenas para auto-scroll
// ao final quando o histórico muda. inbound à esquerda, outbound à direita; outbound
// exibe rótulo curto do status de entrega. Tipos não-texto viram rótulo (sem mídia — fora do escopo).

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { formatHoraCompleta } from './formato'
import type { MensagemView } from '@/app/(dashboard)/mensageria/dados'

const ROTULO_STATUS: Record<string, string> = {
  recebida: '', enfileirada: 'enviando…', enviada: 'enviada', entregue: 'entregue', lida: 'lida', falha: 'falhou',
}

function corpoExibicao(m: MensagemView): string {
  return m.tipo === 'texto' ? (m.corpo ?? '') : `[${m.tipo}]`
}

export function ThreadMensagens({ mensagens }: { mensagens: MensagemView[] }) {
  const fim = useRef<HTMLDivElement>(null)
  useEffect(() => { fim.current?.scrollIntoView({ block: 'end' }) }, [mensagens])

  if (mensagens.length === 0) {
    return <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Nenhuma mensagem ainda</div>
  }

  return (
    <div className="flex-1 space-y-2 overflow-y-auto p-4">
      {mensagens.map((m) => {
        const saida = m.direction === 'outbound'
        return (
          <div key={m.id} className={cn('flex', saida ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[75%] rounded-lg px-3 py-2 text-sm', saida ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
              <p className="whitespace-pre-wrap break-words">{corpoExibicao(m)}</p>
              <div className={cn('mt-1 flex items-center gap-1 text-[10px]', saida ? 'justify-end text-primary-foreground/70' : 'text-muted-foreground')}>
                <span>{formatHoraCompleta(m.createdAt)}</span>
                {saida && ROTULO_STATUS[m.status] && <span>· {m.status === 'falha' ? '⚠ ' : ''}{ROTULO_STATUS[m.status]}</span>}
              </div>
            </div>
          </div>
        )
      })}
      <div ref={fim} />
    </div>
  )
}
