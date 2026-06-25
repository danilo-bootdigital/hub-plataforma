'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { QrCode, Trash2, Wifi, WifiOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { excluirInstanciaSegura } from '@/app/(dashboard)/configuracoes/whatsapp/actions-seguras'
import { ModalExcluirInstancia } from './modal-excluir-instancia'
import { QrCodeDialog } from './qr-code-dialog'

type WhatsappStatus = 'conectado' | 'desconectado' | 'aguardando_qr' | 'inativa'

type Props = {
  instancia: {
    id: string
    nome: string | null
    numero: string | null
    status_conexao: WhatsappStatus | string
    compartilhado: boolean | null
    vendedor: { nome: string | null } | { nome: string | null }[] | null
  }
}

const STATUS_CONFIG: Record<string, { label: string; cor: string; icone: React.ReactNode }> = {
  conectado: { label: 'Conectado', cor: 'text-green-600 bg-green-50', icone: <Wifi className="h-3.5 w-3.5" /> },
  desconectado: { label: 'Desconectado', cor: 'text-slate-500 bg-slate-100', icone: <WifiOff className="h-3.5 w-3.5" /> },
  aguardando_qr: { label: 'Aguardando QR', cor: 'text-amber-600 bg-amber-50', icone: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  inativa: { label: 'Inativa', cor: 'text-gray-500 bg-gray-100', icone: <WifiOff className="h-3.5 w-3.5" /> },
}

// Função para normalizar status
function normalizarStatus(status: string | undefined | null): string {
  if (!status) return 'desconectado'
  if (STATUS_CONFIG[status]) return status
  return 'desconectado'
}

// Função para extrair nome do vendedor de forma segura
function extrairNomeVendedor(vendedor: Props['instancia']['vendedor']): string {
  if (!vendedor) return '—'
  if (Array.isArray(vendedor)) {
    return vendedor[0]?.nome || '—'
  }
  return vendedor.nome || '—'
}

export function CardInstancia({ instancia }: Props) {
  const router = useRouter()
  const [qrAberto, setQrAberto] = useState(false)
  const [excluirAberto, setExcluirAberto] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

  // Normalização segura de dados
  const statusKey = normalizarStatus(instancia.status_conexao)
  const status = STATUS_CONFIG[statusKey]
  const nomeInstancia = instancia.nome || 'Instância sem nome'
  const nomeVendedor = extrairNomeVendedor(instancia.vendedor)
  const compartilhado = instancia.compartilhado === true

  async function handleExcluir() {
    setExcluirAberto(true)
  }

  async function handleConfirmarExclusao() {
    setExcluindo(true)
    try {
      await excluirInstanciaSegura(instancia.id)
      router.refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao excluir instância.')
      setExcluindo(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border bg-white p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-slate-900">{nomeInstancia}</p>
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', status.cor)}>
              {status.icone}
              {status.label}
            </span>
          </div>
          {instancia.numero && <p className="text-sm text-slate-500">{instancia.numero}</p>}
          <p className="text-xs text-slate-400">
            {compartilhado ? 'Compartilhado pela equipe' : `Vendedor: ${nomeVendedor}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {statusKey !== 'conectado' && statusKey !== 'inativa' && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setQrAberto(true)}>
              <QrCode className="h-4 w-4" />
              Conectar
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-red-500"
            onClick={handleExcluir}
            disabled={excluindo}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <QrCodeDialog
        instanceId={instancia.id}
        aberto={qrAberto}
        onConectado={() => { setQrAberto(false); window.location.reload() }}
        onFechar={() => setQrAberto(false)}
      />

      <ModalExcluirInstancia
        aberto={excluirAberto}
        onFechar={() => setExcluirAberto(false)}
        instancia={{
          id: instancia.id,
          nome: nomeInstancia,
          status_conexao: statusKey
        }}
      />
    </>
  )
}
