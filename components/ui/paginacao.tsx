import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Props = {
  paginaAtual: number
  totalRegistros: number
  porPagina: number
  baseUrl: string
  searchParams?: Record<string, string | undefined>
}

export function Paginacao({ paginaAtual, totalRegistros, porPagina, baseUrl, searchParams = {} }: Props) {
  const totalPaginas = Math.ceil(totalRegistros / porPagina)
  if (totalPaginas <= 1) return null

  function buildUrl(pagina: number) {
    const params = new URLSearchParams()
    Object.entries(searchParams).forEach(([k, v]) => {
      if (v && k !== 'pagina') params.set(k, v)
    })
    if (pagina > 1) params.set('pagina', String(pagina))
    const qs = params.toString()
    return qs ? `${baseUrl}?${qs}` : baseUrl
  }

  return (
    <div className="flex items-center justify-between border-t pt-4">
      <p className="text-sm text-slate-500">
        {totalRegistros} registro{totalRegistros !== 1 ? 's' : ''} · Página {paginaAtual} de {totalPaginas}
      </p>
      <div className="flex items-center gap-1">
        {paginaAtual > 1 ? (
          <Link href={buildUrl(paginaAtual - 1)}>
            <Button variant="outline" size="sm" className="gap-1">
              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
            </Button>
          </Link>
        ) : (
          <Button variant="outline" size="sm" className="gap-1" disabled>
            <ChevronLeft className="h-3.5 w-3.5" /> Anterior
          </Button>
        )}
        {paginaAtual < totalPaginas ? (
          <Link href={buildUrl(paginaAtual + 1)}>
            <Button variant="outline" size="sm" className="gap-1">
              Próxima <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        ) : (
          <Button variant="outline" size="sm" className="gap-1" disabled>
            Próxima <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
