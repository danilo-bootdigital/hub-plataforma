'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search } from 'lucide-react'

type Props = {
  fornecedores: { id: string; nome: string }[]
}

const PERIODOS = [
  { valor: 'todos', label: 'Todos os períodos' },
  { valor: '7', label: 'Últimos 7 dias' },
  { valor: '30', label: 'Últimos 30 dias' },
  { valor: '90', label: 'Últimos 90 dias' },
  { valor: '365', label: 'Último ano' },
  { valor: 'custom', label: 'Personalizado' },
]

export function FiltrosPedidos({ fornecedores }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const periodo = searchParams.get('periodo') ?? 'todos'
  const inicio = searchParams.get('inicio') ?? ''
  const fim = searchParams.get('fim') ?? ''
  const fornecedor = searchParams.get('fornecedor') ?? ''

  const atualizarFiltro = useCallback((chave: string, valor: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (valor && valor !== '__all__') {
      params.set(chave, valor)
    } else {
      params.delete(chave)
    }
    if (chave === 'periodo' && valor !== 'custom') {
      params.delete('inicio')
      params.delete('fim')
    }
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  // Busca por nome com debounce
  const [nomeLocal, setNomeLocal] = useState(searchParams.get('nome') ?? '')

  useEffect(() => {
    const timer = setTimeout(() => {
      const atual = searchParams.get('nome') ?? ''
      if (nomeLocal !== atual) {
        const params = new URLSearchParams(searchParams.toString())
        if (nomeLocal) params.set('nome', nomeLocal)
        else params.delete('nome')
        router.push(`${pathname}?${params.toString()}`)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [nomeLocal, searchParams, pathname, router])

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="text"
          placeholder="Buscar por cliente ou nº"
          value={nomeLocal}
          onChange={(e) => setNomeLocal(e.target.value)}
          className="w-60 pl-8"
        />
      </div>

      <Select
        value={periodo}
        onValueChange={(v) => atualizarFiltro('periodo', v ?? 'todos')}
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

      {fornecedores.length > 0 && (
        <Select
          value={fornecedor || '__all__'}
          onValueChange={(v) => atualizarFiltro('fornecedor', v === '__all__' ? '' : (v ?? ''))}
        >
          <SelectTrigger className="w-56">
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
    </div>
  )
}
