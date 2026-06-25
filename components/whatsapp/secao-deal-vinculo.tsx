'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { vincularDeal, desvincularDeal, listarDeals } from '@/app/(dashboard)/whatsapp/actions-conversa'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { Briefcase, X, Link2 } from 'lucide-react'

type Deal = {
  id: string
  titulo: string
  valor_estimado: number | null
  estagio_nome: string
}

type Props = {
  conversaId: string
  dealVinculado: Deal | null
}

export function SecaoDealVinculo({ conversaId, dealVinculado: dealInicial }: Props) {
  const [deal, setDeal] = useState<Deal | null>(dealInicial)
  const [showSelector, setShowSelector] = useState(false)
  const [deals, setDeals] = useState<Deal[]>([])
  const [carregando, setCarregando] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleAbrir() {
    setShowSelector(true)
    setCarregando(true)
    try {
      const lista = await listarDeals()
      setDeals(lista)
    } catch { /* ignore */ }
    setCarregando(false)
  }

  function handleVincular(d: Deal) {
    setDeal(d)
    setShowSelector(false)
    startTransition(async () => {
      try { await vincularDeal(conversaId, d.id) }
      catch (e) { if (isRedirectError(e)) throw e }
    })
  }

  function handleDesvincular() {
    setDeal(null)
    startTransition(async () => {
      try { await desvincularDeal(conversaId) }
      catch (e) { if (isRedirectError(e)) throw e }
    })
  }

  return (
    <section>
      <h3 className="text-xs font-medium text-slate-500 uppercase mb-2 flex items-center gap-1">
        <Briefcase className="h-3.5 w-3.5" /> Oportunidade
      </h3>

      {deal ? (
        <div className="flex items-center gap-2 rounded-md border p-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700 truncate">{deal.titulo}</p>
            <p className="text-[12px] text-slate-400">
              {deal.estagio_nome}
              {deal.valor_estimado != null && ` · R$ ${deal.valor_estimado.toLocaleString('pt-BR')}`}
            </p>
          </div>
          <button
            onClick={handleDesvincular}
            disabled={isPending}
            className="text-slate-400 hover:text-red-500"
            title="Desvincular"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={handleAbrir}
            disabled={isPending}
          >
            <Link2 className="h-3 w-3 mr-1" />
            Vincular oportunidade
          </Button>

          {showSelector && (
            <div className="mt-2 max-h-40 overflow-y-auto rounded-md border p-1 space-y-0.5">
              {carregando ? (
                <p className="text-xs text-slate-400 text-center py-2">Carregando...</p>
              ) : deals.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-2">Nenhuma oportunidade aberta.</p>
              ) : (
                deals.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => handleVincular(d)}
                    className="w-full text-left rounded px-2 py-1.5 hover:bg-slate-50 transition-colors"
                  >
                    <p className="text-xs font-medium text-slate-700 truncate">{d.titulo}</p>
                    <p className="text-[12px] text-slate-400">
                      {d.estagio_nome}
                      {d.valor_estimado != null && ` · R$ ${d.valor_estimado.toLocaleString('pt-BR')}`}
                    </p>
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
