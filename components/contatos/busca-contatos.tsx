'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'

export function BuscaContatos() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [busca, setBusca] = useState(searchParams.get('busca') ?? '')

  useEffect(() => {
    const timer = setTimeout(() => {
      const atual = searchParams.get('busca') ?? ''
      if (busca === atual) return
      const params = new URLSearchParams(searchParams.toString())
      if (busca.trim()) params.set('busca', busca.trim())
      else params.delete('busca')
      // Toda nova busca volta para a primeira página dos resultados.
      params.delete('pagina')
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname)
    }, 350)
    return () => clearTimeout(timer)
  }, [busca, searchParams, pathname, router])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por nome, e-mail, telefone ou CPF/CNPJ..."
        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}
