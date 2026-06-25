'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { ModalModelo } from './modal-modelo'
import { excluirModelo } from '@/app/(dashboard)/whatsapp/modelos/actions'
import { useRouter } from 'next/navigation'
import type { MessageTemplate } from '@/types/database'

type Props = { modelos: MessageTemplate[] }

export function ModelosClient({ modelos }: Props) {
  const router = useRouter()
  const [modalAberto, setModalAberto] = useState(false)
  const [modeloEditando, setModeloEditando] = useState<MessageTemplate | undefined>()

  async function handleExcluir(id: string, nome: string) {
    if (!confirm(`Excluir o modelo "${nome}"?`)) return
    try {
      await excluirModelo(id)
      router.refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao excluir.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="gap-1.5" onClick={() => { setModeloEditando(undefined); setModalAberto(true) }}>
          <Plus className="h-4 w-4" />
          Novo Modelo
        </Button>
      </div>

      {modelos.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-slate-400">Nenhum modelo criado ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {modelos.map((m) => (
            <div key={m.id} className="flex items-start justify-between rounded-lg border bg-white p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-900">{m.nome}</p>
                  {m.categoria && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{m.categoria}</span>
                  )}
                </div>
                <p className="text-sm text-slate-500 line-clamp-2">{m.conteudo}</p>
              </div>
              <div className="flex items-center gap-1 ml-4 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setModeloEditando(m); setModalAberto(true) }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => handleExcluir(m.id, m.nome)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ModalModelo
        key={modeloEditando?.id ?? 'novo'}
        aberto={modalAberto}
        onFechar={() => { setModalAberto(false); router.refresh() }}
        modelo={modeloEditando}
      />
    </div>
  )
}
