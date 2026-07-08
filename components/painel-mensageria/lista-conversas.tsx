'use client'

// Mensageria (E11) — coluna esquerda: pesquisa + lista de conversas.
// Pesquisa é client-side sobre a lista já carregada (nome/telefone). Cada item leva
// para /mensageria/[id] (navegação por rota). Sem realtime; a lista é reidratada pelo
// server component após router.refresh() do envio.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatHora } from './formato'
import type { ConversaResumo } from '@/app/(dashboard)/mensageria/dados'

function inicial(nome: string): string {
  return (nome.trim()[0] ?? '?').toUpperCase()
}

export function ListaConversas({ conversas }: { conversas: ConversaResumo[] }) {
  const pathname = usePathname()
  const [busca, setBusca] = useState('')

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return conversas
    return conversas.filter(
      (c) => c.nome.toLowerCase().includes(q) || (c.telefone ?? '').toLowerCase().includes(q),
    )
  }, [busca, conversas])

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <Input
          placeholder="Pesquisar conversa…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtradas.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma conversa encontrada</p>
        ) : (
          <ul>
            {filtradas.map((c) => {
              const ativo = pathname === `/mensageria/${c.id}`
              return (
                <li key={c.id}>
                  <Link
                    href={`/mensageria/${c.id}`}
                    className={cn(
                      'flex gap-3 border-b px-3 py-2.5 transition-colors hover:bg-muted/60',
                      ativo && 'bg-muted',
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {inicial(c.nome)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{c.nome}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{formatHora(c.lastMessageAt)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-muted-foreground">{c.ultimaMensagem || c.telefone || '—'}</span>
                        {c.unreadCount > 0 && <Badge className="shrink-0">{c.unreadCount}</Badge>}
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
