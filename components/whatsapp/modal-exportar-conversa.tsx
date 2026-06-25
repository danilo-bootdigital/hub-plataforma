'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Mensagem = {
  id: string
  direcao: 'enviada' | 'recebida'
  conteudo: string | null
  enviado_em: string
  responsavel: { nome: string } | null
}

type Props = {
  aberto: boolean
  onFechar: () => void
  conversaId: string
  telefone: string
  nomeContato: string
  mensagens: Mensagem[]
  organizationId: string
  perfilId: string
  perfilNome: string
  leadId: string | null
}

function gerarNomeArquivo(telefone: string, extensao: 'txt' | 'png') {
  const timestamp = new Date().getTime()
  return `conversa-${telefone}-${timestamp}.${extensao}`
}

export function ModalExportarConversa({
  aberto,
  onFechar,
  conversaId,
  telefone,
  nomeContato,
  mensagens,
  perfilNome,
  leadId,
}: Props) {
  const [carregando, setCarregando] = useState(false)

  function gerarTXT(): string {
    const agora = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    const cabecalho = [
      '========================================',
      'BOOT-CRM — Exportação de Conversa',
      '========================================',
      `Contato: ${nomeContato}`,
      `Número: ${telefone}`,
      `Exportado por: ${perfilNome}`,
      `Data da exportação: ${agora}`,
      `Total de mensagens: ${mensagens.length}`,
      '========================================',
      '',
    ].join('\n')

    const corpo = mensagens
      .map((m) => {
        const hora = format(new Date(m.enviado_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })
        const autor =
          m.direcao === 'enviada'
            ? `${m.responsavel?.nome ?? 'Vendedor'} (enviada)`
            : `${nomeContato} (recebida)`

        return `${hora} — ${autor}:\n${m.conteudo ?? '(mídia)'}`
      })
      .join('\n\n')

    return cabecalho + corpo
  }

  function downloadTXT() {
    setCarregando(true)

    const conteudo = gerarTXT()
    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')

    a.href = url
    a.download = gerarNomeArquivo(telefone, 'txt')
    a.click()

    URL.revokeObjectURL(url)
    logExportacao('txt').catch(console.error)
    setCarregando(false)
    onFechar()
  }

  async function downloadPNG() {
    setCarregando(true)

    try {
      const html2canvas = (await import('html2canvas')).default
      const el = document.getElementById('conversa-export-preview')

      if (!el) return

      const canvas = await html2canvas(el, { scale: 2, useCORS: true })

      canvas.toBlob((blob) => {
        if (!blob) return

        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')

        a.href = url
        a.download = gerarNomeArquivo(telefone, 'png')
        a.click()

        URL.revokeObjectURL(url)
      }, 'image/png')

      await logExportacao('png')
      onFechar()
    } catch (e: unknown) {
      console.error('[export] Erro ao gerar PNG:', e)
    } finally {
      setCarregando(false)
    }
  }

  async function logExportacao(formato: 'txt' | 'png') {
    await fetch('/api/exportacao-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversaId, formato, totalMensagens: mensagens.length, leadId }),
    })
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(open) => {
        if (!open) onFechar()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Conversa</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-slate-500">
          Escolha o formato de exportação. A exportação fica registrada no log de auditoria.
        </p>

        <div
          id="conversa-export-preview"
          className="absolute -left-[9999px] top-0 w-[600px] bg-slate-50 p-6 font-sans text-sm"
        >
          <div className="mb-4 border-b pb-3">
            <p className="font-bold text-slate-900">BOOT-CRM — Exportação de Conversa</p>
            <p className="text-xs text-slate-500">
              Contato: {nomeContato} · {telefone}
            </p>
            <p className="text-xs text-slate-500">
              Exportado por: {perfilNome} ·{' '}
              {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>

          <div className="space-y-3">
            {mensagens.map((m) => (
              <div key={m.id} className={`flex ${m.direcao === 'enviada' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-xs ${
                    m.direcao === 'enviada' ? 'bg-green-100' : 'bg-white border'
                  }`}
                >
                  <p>{m.conteudo ?? '(mídia)'}</p>
                  <p className="mt-0.5 text-[12px] text-slate-400">
                    {format(new Date(m.enviado_em), 'dd/MM HH:mm', { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={downloadTXT} disabled={carregando}>
            Baixar como TXT
          </Button>
          <Button className="flex-1" onClick={downloadPNG} disabled={carregando}>
            {carregando ? 'Gerando...' : 'Baixar como Imagem (PNG)'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}