'use client'

import { useState } from 'react'
import type { ItemNavegacao } from '@/lib/navegacao'

// Item ativo quando a rota atual é o próprio href ou uma subrota dele.
export function itemAtivo(href: string | undefined, pathname: string): boolean {
  if (!href) return false
  return pathname === href || pathname.startsWith(href + '/')
}

// Algum filho do grupo está ativo?
export function algumFilhoAtivo(item: ItemNavegacao, pathname: string): boolean {
  return (item.children ?? []).some((c) => itemAtivo(c.href, pathname))
}

// Estado de um grupo recolhível — começa aberto quando um filho está ativo.
// Compartilhado entre a sidebar de desktop e a de mobile (mesma lógica, estilos distintos).
export function useGrupoAberto(item: ItemNavegacao, pathname: string) {
  const algumAtivo = algumFilhoAtivo(item, pathname)
  const [aberto, setAberto] = useState(algumAtivo)
  return { aberto, alternar: () => setAberto((v) => !v), algumAtivo }
}
