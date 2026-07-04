'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { listarNotificacoes, marcarNotificacaoLida, type NotificacaoUI } from '@/lib/cadastro-clientes/notificacoes-actions'

function fmt(dt: string) {
  try { return new Date(dt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

export function SinoNotificacoes() {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [rows, setRows] = useState<NotificacaoUI[]>([])
  const [naoLidas, setNaoLidas] = useState(0)
  const [carregando, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  async function carregar() {
    const r = await listarNotificacoes(20)
    setRows(r.rows); setNaoLidas(r.nao_lidas)
  }

  useEffect(() => { carregar() }, [])

  // Recarrega ao abrir; fecha ao clicar fora.
  useEffect(() => {
    if (aberto) carregar()
    function fora(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false) }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto])

  function marcarTodas() {
    startTransition(async () => { await marcarNotificacaoLida(); await carregar() })
  }

  function abrir(n: NotificacaoUI) {
    startTransition(async () => {
      if (!n.lida) { await marcarNotificacaoLida(n.id); await carregar() }
      setAberto(false)
      if (n.link) router.push(n.link)
    })
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5" />
        {naoLidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-lg border bg-white shadow-lg">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-semibold text-slate-700">Notificações</span>
            {naoLidas > 0 && (
              <button onClick={marcarTodas} disabled={carregando}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
                {carregando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Marcar todas
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {rows.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-slate-400">Nenhuma notificação.</p>
            ) : rows.map((n) => (
              <button
                key={n.id}
                onClick={() => abrir(n)}
                className={cn('flex w-full flex-col gap-0.5 border-b px-3 py-2.5 text-left transition-colors hover:bg-slate-50',
                  !n.lida && 'bg-blue-50/50')}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  {!n.lida && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />}
                  {n.titulo}
                </span>
                {n.mensagem && <span className="line-clamp-2 text-xs text-slate-500">{n.mensagem}</span>}
                <span className="text-[11px] text-slate-400">{fmt(n.created_at)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
