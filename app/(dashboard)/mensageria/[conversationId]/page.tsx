// Mensageria (DEC-023 · E11) — conversa selecionada: cabeçalho + histórico + composer.
// Server component: carrega cabeçalho e histórico via RLS (escopo do Hub). Se a conversa
// não for visível ao usuário, mostra estado vazio (não vaza existência de outro Hub).

import { carregarConversa } from '../dados'
import { ThreadMensagens } from '@/components/painel-mensageria/thread-mensagens'
import { ComposerEnvio } from '@/components/painel-mensageria/composer-envio'

function inicial(nome: string): string {
  return (nome.trim()[0] ?? '?').toUpperCase()
}

export default async function ConversaPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params
  const conversa = await carregarConversa(conversationId)

  if (!conversa) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
        Conversa não encontrada.
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
          {inicial(conversa.nome)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{conversa.nome}</p>
          {conversa.telefone && <p className="truncate text-xs text-muted-foreground">{conversa.telefone}</p>}
        </div>
      </header>
      <ThreadMensagens mensagens={conversa.mensagens} />
      <ComposerEnvio conversationId={conversationId} />
    </div>
  )
}
