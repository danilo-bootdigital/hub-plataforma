'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Trash2 } from 'lucide-react'
import { excluirPedido } from '@/app/(dashboard)/pedidos/actions'
import { toast } from 'sonner'

export function BotaoExcluirPedido({ pedidoId, numero }: { pedidoId: string; numero: number }) {
  const [aberto, setAberto] = useState(false)
  const [senha, setSenha] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleExcluir() {
    if (!senha.trim()) {
      toast.error('Informe a senha de administrador.')
      return
    }
    startTransition(async () => {
      try {
        await excluirPedido(pedidoId, senha)
        toast.success('Pedido excluído.')
        setAberto(false)
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao excluir.')
        setSenha('')
      }
    })
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setAberto(true)}
        className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Excluir
      </Button>

      <Dialog open={aberto} onOpenChange={(open) => { if (!open) { setAberto(false); setSenha('') } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Pedido #{numero}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Esta ação é irreversível. Informe a senha de administrador para confirmar.
          </p>
          <div className="space-y-4">
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Senha de administrador"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleExcluir() }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setAberto(false); setSenha('') }} disabled={isPending}>
                Cancelar
              </Button>
              <Button variant="destructive" size="sm" onClick={handleExcluir} disabled={isPending || !senha.trim()}>
                {isPending ? 'Excluindo...' : 'Confirmar Exclusão'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
