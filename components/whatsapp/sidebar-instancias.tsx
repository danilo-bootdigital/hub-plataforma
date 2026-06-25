'use client'

// ============================================================
// SidebarInstancias: sidebar com lista de instancias
// Sub-fase 2.2.1
// ============================================================
// - Toggle "Apenas online" (useState local)
// - Lista de instancias vindas do page.tsx
// - Botao "Conectar WhatsApp" (placeholder - evoluir em 2.2.x)
// - Cada card tem onClick para filtrar
// ============================================================

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Wifi, WifiOff, Loader2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WhatsappInstanciaResumo } from '@/types/whatsapp-central'

type Props = {
  instancias: WhatsappInstanciaResumo[]
  instanciaAtiva: string | null
  onSelect: (id: string | null) => void
  onConectar?: () => void
}

function statusIcon(status: string) {
  if (status === 'conectado') return <Wifi className="h-3.5 w-3.5" />
  if (status === 'aguardando_qr') return <Loader2 className="h-3.5 w-3.5 animate-spin" />
  return <WifiOff className="h-3.5 w-3.5" />
}

function statusClass(status: string): string {
  if (status === 'conectado') return 'text-green-600 bg-green-50'
  if (status === 'aguardando_qr') return 'text-amber-600 bg-amber-50'
  return 'text-slate-500 bg-slate-100'
}

function statusLabel(status: string): string {
  if (status === 'conectado') return 'Online'
  if (status === 'aguardando_qr') return 'Aguardando QR'
  if (status === 'inativa') return 'Inativa'
  return 'Offline'
}

export function SidebarInstancias({ instancias, instanciaAtiva, onSelect, onConectar }: Props) {
  const [apenasOnline, setApenasOnline] = useState(true)

  const visiveis = apenasOnline
    ? instancias.filter((i) => i.status_conexao === 'conectado')
    : instancias

  const totalOnline = instancias.filter((i) => i.status_conexao === 'conectado').length

  return (
    <aside className="w-72 border-r flex flex-col h-full bg-muted/10">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Instancias</h2>
          <span className="text-xs text-muted-foreground">
            {totalOnline} ativa{totalOnline !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <label htmlFor="apenas-online">Apenas online</label>
          <Switch
            id="apenas-online"
            checked={apenasOnline}
            onCheckedChange={setApenasOnline}
          />
        </div>

        <Button
          variant={instanciaAtiva === null ? 'default' : 'ghost'}
          size="sm"
          className="w-full"
          onClick={() => onSelect(null)}
        >
          Todas as instancias
        </Button>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {visiveis.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center p-4">
            Nenhuma instancia {apenasOnline ? 'online' : 'cadastrada'}.
          </p>
        ) : (
          visiveis.map((inst) => (
            <button
              key={inst.id}
              onClick={() => onSelect(inst.id)}
              className={cn(
                'w-full flex items-center gap-2 p-2 rounded-md border text-left transition-colors',
                instanciaAtiva === inst.id
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent hover:bg-muted/50',
              )}
            >
              <span className={cn('p-1 rounded', statusClass(inst.status_conexao))}>
                {statusIcon(inst.status_conexao)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{inst.nome}</p>
                <p className="text-[10px] text-muted-foreground">
                  {statusLabel(inst.status_conexao)}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer: conectar nova */}
      <div className="p-3 border-t">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onConectar}
        >
          <Plus className="h-4 w-4 mr-1" />
          Conectar WhatsApp
        </Button>
      </div>
    </aside>
  )
}
