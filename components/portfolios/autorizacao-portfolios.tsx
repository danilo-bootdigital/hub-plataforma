'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, ShieldCheck, ShieldOff } from 'lucide-react'
import { autorizarHubPortfolio, revogarHubPortfolio } from '@/app/(dashboard)/configuracoes/portfolios/actions'

type Item = { id: string; nome: string }

type Props = {
  // 'porPortfolio': fixedId = portfolioId, itens = Hubs.
  // 'porHub':       fixedId = hubId,       itens = Portfólios.
  eixo: 'porPortfolio' | 'porHub'
  fixedId: string
  itens: Item[]
  autorizados: string[] // ids dos itens com autorização ativa
}

export function AutorizacaoPortfolios({ eixo, fixedId, itens, autorizados }: Props) {
  const [isPending, startTransition] = useTransition()
  const [busca, setBusca] = useState('')
  const router = useRouter()
  const autorizadosSet = useMemo(() => new Set(autorizados), [autorizados])

  const filtrados = useMemo(() => {
    if (!busca) return itens
    const t = busca.toLowerCase()
    return itens.filter((i) => i.nome.toLowerCase().includes(t))
  }, [itens, busca])

  function toggle(itemId: string, autorizadoAtual: boolean) {
    const hubId = eixo === 'porHub' ? fixedId : itemId
    const portfolioId = eixo === 'porPortfolio' ? fixedId : itemId
    startTransition(async () => {
      try {
        if (autorizadoAtual) {
          await revogarHubPortfolio(hubId, portfolioId)
          toast.success('Autorização revogada.')
        } else {
          await autorizarHubPortfolio(hubId, portfolioId)
          toast.success('Portfólio autorizado.')
        }
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao alterar autorização.')
      }
    })
  }

  const rotuloVazio = eixo === 'porPortfolio' ? 'Nenhum Hub cadastrado.' : 'Nenhum portfólio cadastrado.'

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        {filtrados.length === 0 && (
          <div className="px-4 py-8 text-center text-slate-400">{rotuloVazio}</div>
        )}
        {filtrados.map((item) => {
          const autorizado = autorizadosSet.has(item.id)
          return (
            <div key={item.id} className="flex items-center justify-between border-b px-4 py-2.5 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-800">{item.nome}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${autorizado ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {autorizado ? 'Autorizado' : 'Não autorizado'}
                </span>
              </div>
              <Button
                variant={autorizado ? 'ghost' : 'default'}
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => toggle(item.id, autorizado)}
                disabled={isPending}
              >
                {autorizado ? (
                  <>
                    <ShieldOff className="h-3.5 w-3.5" /> Revogar
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5" /> Autorizar
                  </>
                )}
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
