'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[dashboard error]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
      <div className="text-center space-y-2">
        <p className="text-4xl">⚠️</p>
        <h2 className="text-lg font-semibold text-slate-900">Algo deu errado</h2>
        <p className="text-sm text-slate-500 max-w-md">
          Ocorreu um erro ao carregar esta página. Tente novamente ou volte para o painel.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400">Código: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={reset}>Tentar novamente</Button>
        <Button variant="outline" onClick={() => window.location.href = '/painel'}>
          Ir para o painel
        </Button>
      </div>
    </div>
  )
}
