'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download } from 'lucide-react'

type Props = {
  responsaveis: { id: string; nome: string }[]
  mostrarFiltroResponsavel: boolean
  fornecedores: { id: string; nome: string }[]
}

const PERIODOS = [
  { valor: '7', label: 'Últimos 7 dias' },
  { valor: '30', label: 'Últimos 30 dias' },
  { valor: '90', label: 'Últimos 90 dias' },
  { valor: '365', label: 'Último ano' },
  { valor: 'custom', label: 'Personalizado' },
]

export function FiltrosRelatorio({ responsaveis, mostrarFiltroResponsavel, fornecedores }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const periodo = searchParams.get('periodo') ?? '30'
  const inicio = searchParams.get('inicio') ?? ''
  const fim = searchParams.get('fim') ?? ''
  const responsavel = searchParams.get('responsavel') ?? ''
  const fornecedor = searchParams.get('fornecedor') ?? ''

  const atualizarFiltro = useCallback((chave: string, valor: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (valor && valor !== '__all__') {
      params.set(chave, valor)
    } else {
      params.delete(chave)
    }
    // Se mudar periodo para não-custom, limpar datas custom
    if (chave === 'periodo' && valor !== 'custom') {
      params.delete('inicio')
      params.delete('fim')
    }
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  const exportarUrl = `/relatorios/exportar?tipo=deals&${searchParams.toString()}`

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select
        value={periodo}
        onValueChange={(v) => atualizarFiltro('periodo', v ?? '30')}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          {PERIODOS.map((p) => (
            <SelectItem key={p.valor} value={p.valor}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {periodo === 'custom' && (
        <>
          <Input
            type="date"
            value={inicio}
            onChange={(e) => atualizarFiltro('inicio', e.target.value)}
            className="w-40"
          />
          <Input
            type="date"
            value={fim}
            onChange={(e) => atualizarFiltro('fim', e.target.value)}
            className="w-40"
          />
        </>
      )}

      {mostrarFiltroResponsavel && (
        <Select
          value={responsavel || '__all__'}
          onValueChange={(v) => atualizarFiltro('responsavel', v === '__all__' ? '' : (v ?? ''))}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos os vendedores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os vendedores</SelectItem>
            {responsaveis.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {fornecedores.length > 0 && (
        <Select
          value={fornecedor || '__all__'}
          onValueChange={(v) => atualizarFiltro('fornecedor', v === '__all__' ? '' : (v ?? ''))}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Todos os fornecedores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os fornecedores</SelectItem>
            {fornecedores.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <a href={exportarUrl} download>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </a>
    </div>
  )
}
