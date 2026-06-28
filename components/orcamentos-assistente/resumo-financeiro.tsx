'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatarMoeda } from '@/lib/utils'
import {
  definirDescontoOrcamento,
  limparDescontoOrcamento,
  salvarObservacoesOrcamento,
} from '@/app/(dashboard)/assistente/orcamentos/actions'

type DescontoTipo = 'PERCENTUAL' | 'VALOR' | null

export function ResumoFinanceiro({
  quoteId,
  editavel,
  totalBruto,
  totalFinal,
  descontoTipo,
  descontoGeral,
  descontoValor,
  observacoes,
}: {
  quoteId: string
  editavel: boolean
  totalBruto: number
  totalFinal: number
  descontoTipo: DescontoTipo
  descontoGeral: number
  descontoValor: number
  observacoes: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [tipo, setTipo] = useState<'' | 'PERCENTUAL' | 'VALOR'>(descontoTipo ?? '')
  const [montante, setMontante] = useState<string>(
    descontoTipo === 'PERCENTUAL' ? String(descontoGeral) : descontoTipo === 'VALOR' ? String(descontoValor) : ''
  )
  const [obs, setObs] = useState(observacoes ?? '')
  const router = useRouter()

  const descontoTotal = totalBruto - totalFinal

  function run(fn: () => Promise<void>, ok: string) {
    startTransition(async () => {
      try {
        await fn()
        toast.success(ok)
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro.')
      }
    })
  }

  // Trocar o tipo zera o valor do outro (campo único, exclusivo).
  function trocarTipo(novo: '' | 'PERCENTUAL' | 'VALOR') {
    setTipo(novo)
    setMontante('')
  }

  function aplicar() {
    if (tipo === '') {
      run(() => limparDescontoOrcamento(quoteId), 'Desconto removido.')
      return
    }
    const m = Number(montante)
    if (!Number.isFinite(m) || m < 0) return toast.error('Informe um desconto válido.')
    run(() => definirDescontoOrcamento(quoteId, tipo, m), 'Desconto aplicado.')
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Resumo financeiro */}
      <div className="rounded-lg border bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Resumo financeiro</h2>
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-slate-500">Total Bruto</dt><dd className="text-slate-800">{formatarMoeda(Number(totalBruto))}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-slate-500">Desconto</dt><dd className="text-red-600">− {formatarMoeda(Number(descontoTotal))}</dd></div>
          <div className="flex justify-between gap-4 border-t pt-1.5"><dt className="font-medium text-slate-700">Total Final</dt><dd className="font-bold text-slate-900">{formatarMoeda(Number(totalFinal))}</dd></div>
        </dl>

        {editavel && (
          <div className="mt-4 space-y-2 border-t pt-3">
            <label className="block text-xs font-medium text-slate-500">Desconto global</label>
            <div className="flex flex-wrap items-end gap-2">
              <select
                value={tipo}
                disabled={isPending}
                onChange={(e) => trocarTipo(e.target.value as '' | 'PERCENTUAL' | 'VALOR')}
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              >
                <option value="">Sem desconto</option>
                <option value="PERCENTUAL">Percentual (%)</option>
                <option value="VALOR">Valor (R$)</option>
              </select>
              {tipo !== '' && (
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={montante}
                  onChange={(e) => setMontante(e.target.value)}
                  placeholder={tipo === 'PERCENTUAL' ? '% ' : 'R$ '}
                  className="h-9 w-32"
                />
              )}
              <Button disabled={isPending} onClick={aplicar}>Aplicar</Button>
            </div>
          </div>
        )}
      </div>

      {/* Observações comerciais */}
      <div className="rounded-lg border bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Observações comerciais</h2>
        {editavel ? (
          <div className="space-y-2">
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              rows={5}
              placeholder="Prazo de entrega, validade da proposta, condições especiais…"
              className="w-full rounded-md border border-input bg-transparent p-2 text-sm"
            />
            <div className="flex justify-end">
              <Button variant="outline" disabled={isPending} onClick={() => run(() => salvarObservacoesOrcamento(quoteId, obs), 'Observações salvas.')}>
                Salvar observações
              </Button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-slate-600">{observacoes || '—'}</p>
        )}
      </div>
    </div>
  )
}
