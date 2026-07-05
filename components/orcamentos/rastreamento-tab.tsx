'use client'

import { useEffect, useState } from 'react'
import { Loader2, History } from 'lucide-react'
import { getEventosOrcamento } from '@/app/(dashboard)/orcamentos/actions'
import { rotuloEvento, rotuloCargo, type EventoOrcamentoUI } from '@/lib/orcamentos/eventos-tipos'

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function valorLegivel(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v)
  try { return JSON.stringify(v) } catch { return null }
}

// Histórico do Orçamento (Fase T-1). Carregamento sob demanda; RLS restringe por Hub.
export function RastreamentoTab({ quoteId }: { quoteId: string }) {
  const [eventos, setEventos] = useState<EventoOrcamentoUI[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    getEventosOrcamento(quoteId)
      .then((r) => { if (vivo) setEventos(r) })
      .catch((e) => { if (vivo) setErro(e instanceof Error ? e.message : 'Falha ao carregar o histórico.') })
    return () => { vivo = false }
  }, [quoteId])

  if (erro) return <p className="text-sm text-rose-700">{erro}</p>
  if (eventos === null) {
    return <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando histórico…</p>
  }
  if (eventos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-400">
        <History className="h-6 w-6" />
        <p className="text-sm">Nenhum evento registrado ainda.</p>
      </div>
    )
  }

  return (
    <ol className="relative ml-3 border-l border-slate-200">
      {eventos.map((e) => {
        const antes = valorLegivel(e.valor_anterior)
        const depois = valorLegivel(e.valor_novo)
        return (
          <li key={e.id} className="mb-5 ml-5">
            <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <time className="font-mono text-xs text-slate-400 tabular-nums">{fmt(e.created_at)}</time>
              <span className="text-sm font-semibold text-slate-800">{rotuloEvento(e.tipo_evento)}</span>
              <span className="text-xs text-slate-500">
                por {e.ator_nome ?? 'sistema'} <span className="text-slate-400">({rotuloCargo(e.ator_cargo)})</span>
              </span>
            </div>
            {e.descricao && <p className="mt-0.5 text-sm text-slate-600">{e.descricao}</p>}
            {(antes != null || depois != null) && (
              <p className="mt-0.5 text-xs text-slate-500">
                {antes != null && <span className="line-through decoration-slate-300">{antes}</span>}
                {antes != null && depois != null && <span className="mx-1">→</span>}
                {depois != null && <span className="font-medium text-slate-700">{depois}</span>}
              </p>
            )}
          </li>
        )
      })}
    </ol>
  )
}
