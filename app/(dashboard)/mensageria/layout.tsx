// Mensageria (DEC-023 · E11) — shell de 2 colunas (estilo WhatsApp Business Desktop).
// Esquerda: lista de conversas (server-fetched via RLS). Direita: children (conversa
// selecionada por rota /mensageria/[conversationId] ou estado vazio). O layout reexecuta
// no server a cada navegação/refresh, mantendo a lista atualizada após envio.

import type { ReactNode } from 'react'
import { listarConversas } from './dados'
import { ListaConversas } from '@/components/painel-mensageria/lista-conversas'

export default async function MensageriaLayout({ children }: { children: ReactNode }) {
  const conversas = await listarConversas()
  return (
    <div className="flex h-[calc(100dvh-7rem)] min-h-[480px] overflow-hidden rounded-lg border bg-card">
      <aside className="w-80 shrink-0 border-r">
        <ListaConversas conversas={conversas} />
      </aside>
      <section className="flex min-w-0 flex-1 flex-col">{children}</section>
    </div>
  )
}
