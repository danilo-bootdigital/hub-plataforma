'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { verificarQRCode } from '@/app/(dashboard)/configuracoes/whatsapp/actions'

type Props = {
  instanceId: string
  aberto: boolean
  onConectado: () => void
  onFechar: () => void
}

export function QrCodeDialog({ instanceId, aberto, onConectado, onFechar }: Props) {
  const [qrBase64, setQrBase64] = useState<string | null>(null)
  const [estado, setEstado] = useState<'carregando' | 'qr' | 'conectado' | 'erro'>('carregando')
  const [mensagemErro, setMensagemErro] = useState<string | null>(null)

  const onConectadoRef = useRef(onConectado)
  useEffect(() => {
    onConectadoRef.current = onConectado
  })

  const poll = useCallback(async () => {
    const resultado = await verificarQRCode(instanceId)
    if (resultado.estado === 'conectado') {
      setEstado('conectado')
      onConectadoRef.current()
    } else if (resultado.estado === 'qr') {
      setQrBase64(resultado.base64)
      setEstado('qr')
    } else if (resultado.estado === 'erro') {
      setEstado('erro')
      setMensagemErro(resultado.mensagem)
    }
  }, [instanceId])

  // Detecta transição de aberto=false → true para resetar estado
  const abertoAnterior = useRef(aberto)
  useEffect(() => {
    if (aberto && !abertoAnterior.current) {
      setEstado('carregando')
      setQrBase64(null)
      setMensagemErro(null)
      poll()
    }
    abertoAnterior.current = aberto
  }, [aberto, poll])

  useEffect(() => {
    if (!aberto) return
    const interval = setInterval(() => {
      setEstado((current) => {
        if (current === 'erro' || current === 'conectado') return current
        poll()
        return current
      })
    }, 4000)
    return () => clearInterval(interval)
  }, [aberto, poll])

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) onFechar() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp</DialogTitle>
        </DialogHeader>

        {estado === 'conectado' ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <p className="text-4xl">✅</p>
            <p className="text-center text-sm font-medium text-green-700">WhatsApp conectado com sucesso!</p>
            <Button onClick={onFechar}>Fechar</Button>
          </div>
        ) : estado === 'erro' ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <p className="text-4xl">⚠️</p>
            <p className="text-center text-sm text-slate-600">{mensagemErro}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setEstado('carregando'); poll() }}>Tentar novamente</Button>
              <Button onClick={onFechar}>Fechar</Button>
            </div>
          </div>
        ) : estado === 'qr' && qrBase64 ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <p className="text-center text-sm text-slate-500">
              Abra o WhatsApp → toque nos três pontos → <strong>Dispositivos Conectados</strong> → <strong>Conectar Dispositivo</strong>
            </p>
            <Image src={qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`} alt="QR Code WhatsApp" width={240} height={240} unoptimized />
            <p className="text-xs text-slate-400">Atualizando automaticamente a cada 4 segundos...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
            <p className="text-sm text-slate-500">Gerando QR Code...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
