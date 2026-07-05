'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronDown, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { alterarStatusOrcamentoHub } from '@/app/(dashboard)/orcamentos/actions-hub'
import { STATUS_ORCAMENTO_ORDEM, rotuloStatus } from '@/lib/orcamentos/eventos-tipos'
import type { QuoteStatus } from '@/types/database'

// Controle de alteração de status do orçamento (Hub). Só é renderizado no detalhe
// para Proprietário/Assistente autorizado (a página decide a visibilidade); a action
// revalida permissão/escopo no servidor. Ao salvar, atualiza badge + timeline.
export function ControleStatusOrcamento({
  orcamentoId,
  statusAtual,
}: {
  orcamentoId: string
  statusAtual: string
}) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [pending, start] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function fora(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false) }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [])

  function alterar(novo: string) {
    if (novo === statusAtual) { setAberto(false); return }
    start(async () => {
      try {
        await alterarStatusOrcamentoHub(orcamentoId, novo as QuoteStatus)
        toast.success(`Status alterado para "${rotuloStatus(novo)}".`)
        setAberto(false)
        router.refresh() // atualiza badge + aba Rastreamento
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Falha ao alterar status.')
      }
    })
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 h-9"
        disabled={pending}
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Alterar status
        <ChevronDown className={`h-4 w-4 transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </Button>

      {aberto && (
        <div className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-lg border bg-white shadow-lg">
          <p className="border-b px-3 py-2 text-xs font-medium text-slate-500">Selecione o novo status</p>
          <ul className="max-h-80 overflow-y-auto py-1">
            {STATUS_ORCAMENTO_ORDEM.map((s) => {
              const atual = s === statusAtual
              return (
                <li key={s}>
                  <button
                    type="button"
                    disabled={pending || atual}
                    onClick={() => alterar(s)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                      atual ? 'cursor-default bg-slate-50 text-slate-400' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {rotuloStatus(s)}
                    {atual && <Check className="h-4 w-4 text-emerald-600" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
